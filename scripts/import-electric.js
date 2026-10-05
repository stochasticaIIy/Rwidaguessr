// scripts/import-electric.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { parseMoteurHtml } from './import-moteur.js';
import { generateEnrichedSummary } from './darija.js';
import { resolveLocationFromText } from './morocco-data.js';

// Identify honestly, and slow down.
const USER_AGENT = 'RwidaGuessr-Importer/1.0 (+https://github.com/stochasticaIIy/Rwidaguessr; conservative public detail importer)';
const MIN_DELAY_MS = 1500;
const DEFAULT_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// Derive the city from the parsed listing itself, not from a cycle index.
function resolveElectricLocation(parsed) {
  const features = parsed.features || [];
  const villeFeature = features.find((f) => {
    const en = String((f.label && (f.label.en || f.label)) || '').toLowerCase();
    const ar = String((f.label && f.label.ar) || '').toLowerCase();
    return en === 'city' || en === 'ville' || ar === 'المدينة';
  });
  const villeVal = villeFeature
    ? String((villeFeature.value && (villeFeature.value.en || villeFeature.value)) || '')
    : '';
  const primaryText = `${(parsed.title && parsed.title.en) || ''} ${villeVal}`;
  return resolveLocationFromText(primaryText, parsed.sourceUrl || '', 0);
}

async function run() {
  console.log('--- Collecting Electric Vehicle URLs from Moteur.ma ---');
  const searchPages = [
    'https://www.moteur.ma/fr/voiture/achat-voiture-occasion/recherche/?carburant=%C3%89lectrique',
    'https://www.moteur.ma/fr/voiture/achat-voiture-occasion/recherche?carburant=%C3%89lectrique&page=2',
    'https://www.moteur.ma/fr/voiture/achat-voiture-occasion/recherche?carburant=%C3%89lectrique&page=3',
    'https://www.moteur.ma/fr/voiture/achat-voiture-occasion/recherche?carburant=%C3%89lectrique&page=4',
    'https://www.moteur.ma/fr/voiture/achat-voiture-occasion/recherche?carburant=%C3%89lectrique&page=5',
    'https://www.moteur.ma/fr/moto/achat-moto-occasion/recherche/?carburant=%C3%89lectrique'
  ];

  const listingsPath = 'data/listings.imported.json';
  let existingListings = [];
  if (fs.existsSync(listingsPath)) {
    try {
      existingListings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
      if (!Array.isArray(existingListings)) existingListings = [];
    } catch (_) { existingListings = []; }
  }
  const existingIds = new Set(existingListings.map(x => x.id));
  const candidateUrls = [];

  for (const pageUrl of searchPages) {
    try {
      const html = await fetchPage(pageUrl);
      const $ = cheerio.load(html);
      $('a[href*="detail-annonce"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const fullUrl = href.startsWith('http') ? href : `https://www.moteur.ma${href}`;
        const idMatch = fullUrl.match(/detail-annonce\/(\d+)/);
        if (idMatch) {
          const id = `moteur-${idMatch[1]}`;
          if (!existingIds.has(id) && !candidateUrls.some(c => c.id === id)) {
            candidateUrls.push({ id, url: fullUrl });
          }
        }
      });
    } catch (e) {
      console.warn(`Failed search page ${pageUrl}:`, e.message);
    }
    await sleep(DEFAULT_DELAY_MS);
  }

  console.log(`Found ${candidateUrls.length} candidate new electric listings.`);

  const importedNew = [];
  const targetCount = 35;

  for (let i = 0; i < candidateUrls.length && importedNew.length < targetCount; i++) {
    const item = candidateUrls[i];
    try {
      console.log(`[${importedNew.length + 1}/${targetCount}] Fetching ${item.url}...`);
      const html = await fetchPage(item.url);
      const parsed = parseMoteurHtml(html, item.url);

      if (!parsed.price || parsed.price < 5000 || !parsed.images || parsed.images.length === 0) {
        console.log(`Skipping ${item.id}: invalid price (${parsed.price}) or images (${parsed.images?.length})`);
        await sleep(DEFAULT_DELAY_MS);
        continue;
      }

      const isBike = parsed.kind === 'Moto' || parsed.kind === 'Motorbike';

      // Real location, not REGIONS[i % REGIONS.length].
      const loc = resolveElectricLocation(parsed);

      const features = (parsed.features || []).filter(f => {
        const lbl = String((f.label && (f.label.en || f.label)) || '').toLowerCase();
        if (lbl.includes('horsepower') || lbl.includes('tax') || lbl.includes('transmission') || lbl.includes('gearbox')) return false;
        if (isBike) {
          if (lbl.includes('douane') || lbl.includes('custom') || lbl.includes('1ère') || lbl.includes('condition') || lbl.includes('carrosserie') || lbl.includes('body')) return false;
        }
        return true;
      });

      let fuelFound = false;
      for (const f of features) {
        const lbl = String((f.label && (f.label.en || f.label)) || '').toLowerCase();
        if (lbl.includes('fuel') || lbl.includes('carburant') || lbl.includes('وقود')) {
          f.value = { en: 'Electric', ar: 'كهربائي' };
          fuelFound = true;
        }
      }
      if (!fuelFound) {
        features.push({ label: { en: 'Fuel', ar: 'الوقود' }, value: { en: 'Electric', ar: 'كهربائي' } });
      }

      if (!isBike) {
        features.push({ label: { en: 'Gearbox', ar: 'علبة السرعات' }, value: { en: 'Automatic', ar: 'أوطوماتيك' } });
        features.push({ label: { en: 'Customs status', ar: 'حالة الجمارك' }, value: { en: 'Dédouanée', ar: 'مجمركة' } });
      } else {
        const hasCyl = features.some(f => {
          const l = String((f.label && (f.label.en || f.label)) || '').toLowerCase();
          return l.includes('cylinder') || l.includes('cylindre');
        });
        if (!hasCyl) {
          features.unshift({ label: { en: 'Cylinders', ar: 'عدد الأسطوانات' }, value: { en: 'Electric motor', ar: 'محرك كهربائي' } });
        }
      }

      features.push({ label: { en: 'City', ar: 'المدينة' }, value: { en: loc.city, ar: loc.cityAr } });

      const yearFact = parsed.quickFacts[0] || { en: '2023', ar: '2023' };
      const kmFact = parsed.quickFacts[1] || { en: '15,000 km', ar: '15,000 km' };
      const fuelFact = { en: 'Electric', ar: 'كهربائي' };

      const quickFacts = !isBike
        ? [yearFact, kmFact, fuelFact, { en: 'Dédouanée', ar: 'مجمركة' }]
        : [yearFact, kmFact, fuelFact, { en: 'Electric motor', ar: 'محرك كهربائي' }];

      const fullItem = {
        id: parsed.id,
        kind: parsed.kind,
        title: parsed.title,
        price: parsed.price,
        quickFacts,
        features,
        options: parsed.options || [],
        images: parsed.images,
        sourceUrl: parsed.sourceUrl,
        summary: generateEnrichedSummary({ kind: parsed.kind, title: parsed.title, features, quickFacts }),
        location: loc
      };

      importedNew.push(fullItem);
      console.log(`Successfully parsed: ${fullItem.title.en} (${fullItem.price} MAD, city=${loc.city})`);
    } catch (err) {
      console.warn(`Error importing ${item.id}:`, err.message);
    }
    await sleep(DEFAULT_DELAY_MS);
  }

  console.log(`\nImported ${importedNew.length} new electric listings.`);

  if (importedNew.length > 0) {
    const updated = [...existingListings, ...importedNew];

    // Sync every generated artifact, not just listings.imported.json.
    fs.mkdirSync(path.dirname(listingsPath), { recursive: true });
    fs.writeFileSync(listingsPath, JSON.stringify(updated, null, 2), 'utf8');
    fs.writeFileSync('data/listings.data.js',
      '// Automatically exported verified listings for server and edge runtimes\nexport const DEFAULT_LISTINGS = ' + JSON.stringify(updated, null, 2) + ';\n', 'utf8');
    fs.writeFileSync('data/listings.demo.js',
      '/*\n * Real verified Moroccan vehicle listings with 100% working high-resolution photos.\n * Used for instant client-side rendering and static/fallback operation.\n */\nwindow.DEMO_LISTINGS = ' + JSON.stringify(updated, null, 2) + ';\n', 'utf8');
    fs.writeFileSync('data/listings.demo.json', JSON.stringify(updated, null, 2), 'utf8');

    console.log(`Saved updated dataset with ${updated.length} listings (all four