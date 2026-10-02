import fs from 'node:fs';
import * as cheerio from 'cheerio';
import { parseMoteurHtml } from './import-moteur.js';
import { generateEnrichedSummary } from './darija.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const REGIONS = [
  { region: 'casa-settat', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, city: 'Casablanca', cityAr: 'الدار البيضاء' },
  { region: 'rabat-sale', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, city: 'Rabat', cityAr: 'الرباط' },
  { region: 'marrakech-safi', regionName: { ar: 'مراكش - آسفي', en: 'Marrakech - Safi' }, city: 'Marrakech', cityAr: 'مراكش' },
  { region: 'tanger', regionName: { ar: 'طنجة - تطوان - الشمال', en: 'Tangier - Tétouan (North)' }, city: 'Tangier', cityAr: 'طنجة' },
  { region: 'souss-massa', regionName: { ar: 'سوس - ماسة (أكادير)', en: 'Souss - Massa (Agadir)' }, city: 'Agadir', cityAr: 'أكادير' },
  { region: 'fes-meknes', regionName: { ar: 'فاس - مكناس', en: 'Fès - Meknès' }, city: 'Fès', cityAr: 'فاس' }
];

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

  const existingListings = JSON.parse(fs.readFileSync('data/listings.imported.json', 'utf8'));
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
  }

  console.log(`Found ${candidateUrls.length} candidate new electric listings.`);

  const importedNew = [];
  const targetCount = 35; // Import up to 35 high quality new electric vehicles

  for (let i = 0; i < candidateUrls.length && importedNew.length < targetCount; i++) {
    const item = candidateUrls[i];
    try {
      console.log(`[${importedNew.length + 1}/${targetCount}] Fetching ${item.url}...`);
      const html = await fetchPage(item.url);
      const parsed = parseMoteurHtml(html, item.url);

      if (!parsed.price || parsed.price < 5000 || !parsed.images || parsed.images.length === 0) {
        console.log(`Skipping ${item.id}: invalid price (${parsed.price}) or images (${parsed.images?.length})`);
        continue;
      }

      const isBike = parsed.kind === 'Moto' || parsed.kind === 'Motorbike';
      const loc = REGIONS[i % REGIONS.length];

      // Format features
      const features = (parsed.features || []).filter(f => {
        const lbl = (f.label?.en || f.label || '').toLowerCase();
        if (lbl.includes('horsepower') || lbl.includes('tax') || lbl.includes('transmission') || lbl.includes('gearbox')) return false;
        if (isBike) {
          if (lbl.includes('douane') || lbl.includes('custom') || lbl.includes('1ère') || lbl.includes('condition') || lbl.includes('carrosserie') || lbl.includes('body')) return false;
        }
        return true;
      });

      // Ensure Fuel is Electric
      let fuelFound = false;
      for (const f of features) {
        const lbl = (f.label?.en || f.label || '').toLowerCase();
        if (lbl.includes('fuel') || lbl.includes('carburant') || lbl.includes('وقود')) {
          f.value = { en: 'Electric', ar: 'كهربائي' };
          fuelFound = true;
        }
      }
      if (!fuelFound) {
        features.push({
          label: { en: 'Fuel', ar: 'الوقود' },
          value: { en: 'Electric', ar: 'كهربائي' }
        });
      }

      if (!isBike) {
        // Cars get Automatic gearbox and Customs status
        features.push({
          label: { en: 'Gearbox', ar: 'علبة السرعات' },
          value: { en: 'Automatic', ar: 'أوطوماتيك' }
        });
        features.push({
          label: { en: 'Customs status', ar: 'حالة الجمارك' },
          value: { en: 'Dédouanée', ar: 'مجمركة' }
        });
      } else {
        // Bikes get Electric motor feature
        const hasCyl = features.some(f => {
          const l = (f.label?.en || f.label || '').toLowerCase();
          return l.includes('cylinder') || l.includes('cylindre');
        });
        if (!hasCyl) {
          features.unshift({
            label: { en: 'Cylinders', ar: 'عدد الأسطوانات' },
            value: { en: 'Electric motor', ar: 'محرك كهربائي' }
          });
        }
      }

      // City feature
      features.push({
        label: { en: 'City', ar: 'المدينة' },
        value: { en: loc.city, ar: loc.cityAr }
      });

      // Format quick facts
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
      console.log(`Successfully parsed: ${fullItem.title.en} (${fullItem.price} MAD)`);
    } catch (err) {
      console.warn(`Error importing ${item.id}:`, err.message);
    }
  }

  console.log(`\nImported ${importedNew.length} new electric listings.`);

  if (importedNew.length > 0) {
    const updated = [...existingListings, ...importedNew];
    fs.writeFileSync('data/listings.imported.json', JSON.stringify(updated, null, 2), 'utf8');
    console.log(`Saved updated dataset with ${updated.length} listings to data/listings.imported.json.`);
  }
}

run();
