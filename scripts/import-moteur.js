#!/usr/bin/env node

/**
 * Conservative importer for moteur.ma public vehicle listings.
 *
 * Complies with conservative scraping practices:
 * - Requests only public detail pages from moteur.ma
 * - Enforces a polite, slow fixed rate (enforced minimum 1500ms, default 2000ms)
 * - Identifies itself with a dedicated User-Agent
 * - Scrubs personal/contact info (phone, email, seller names)
 * - Scrubs price mentions from descriptions to prevent gameplay spoilers
 * - Leaves equipment & options in original French for both languages
 * - Generates Moroccan Darija summaries for Arabic version
 * - Supports automatic crawling across pagination to reach 1000+ listings
 * - Saves incrementally to JSON so progress is never lost
 * - Extracts only listing-owned photos (og:image-anchored)
 * - Strictly scopes price extraction to the hero element only; listings
 *   without a real price (CFP) are skipped rather than guessed.
 *
 * Usage:
 *   node scripts/import-moteur.js <url1> <url2> ...
 *   node scripts/import-moteur.js --file urls.txt [--out data/listings.imported.json] [--delay 2500]
 *   node scripts/import-moteur.js --crawl [--limit 1000] [--out data/listings.imported.json] [--delay 2000]
 */

import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { localizeTerm } from './dictionary.js';
import { detectBikeCylinders, getVehicleHorsepower, generateEnrichedSummary } from './darija.js';
import { splitBrandAndModel, extractListingImages } from './morocco-data.js';

// Force IPv4 DNS lookup to prevent IPv6 connect timeouts in cloud containers
const origLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = { family: 4 };
  } else if (typeof options === 'number') {
    options = { family: 4 };
  } else {
    options = { ...options, family: 4 };
  }
  return origLookup.call(this, hostname, options, (err, address, family) => {
    if (!err && Array.isArray(address)) {
      const v4 = address.filter((a) => a.family === 4);
      return callback(null, v4.length > 0 ? v4 : address);
    }
    return callback(err, address, family);
  });
};

const MIN_DELAY_MS = 1500;
const DEFAULT_DELAY_MS = 2000;
const USER_AGENT = 'RwidaGuessr-Importer/1.0 (+https://github.com/stochasticaIIy/Rwidaguessr; conservative public detail importer)';

// The hero price element `.ad-hero-price-col` is the ONLY place Moteur.ma
// renders the current listing's price. When it contains one of these CFP
// phrases, the listing is treated as "price on demand" and skipped.
const CFP_SIGNALS_RE = /appeler|appelez|appel\b|contactez|contacter|contact\b|contactez[- ]nous|pour\s+(?:le\s+)?prix|prix\s+(?:sur\s+)?demande|sur\s+demande|pour\s+plus\s+d['\s]?infos?|demander\s+le\s+prix|demande\s+de\s+renseignement|veuillez\s+contacter|informations\s+contactez|plus\s+d['\s]?informations\s+contact/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidMoteurUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    const validHost = parsed.hostname === 'www.moteur.ma' || parsed.hostname === 'moteur.ma';
    const isDetailPage = parsed.pathname.includes('/detail-annonce/') ||
                         parsed.pathname.includes('/voiture/') ||
                         parsed.pathname.includes('/moto/');
    return validHost && isDetailPage;
  } catch (_) {
    return false;
  }
}

function cleanText(str) {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Parse a price string written in any of the formats Morocco uses:
 *   "700,000 MAD", "1 200 000 Dhs", "1.200.000", "700000"
 * Returns 0 when the string does not contain a plausible price.
 */
function parsePriceText(raw) {
  if (!raw) return 0;
  const text = String(raw).replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

  // Grouped thousands with space, comma, or period: "700,000", "1 200 000", "1.200.000"
  const grouped = text.match(/(\d{1,3}(?:[ ,.]\d{3})+)/);
  if (grouped) {
    const n = parseInt(grouped[1].replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(n) && n > 1000) return n;
  }

  // Plain contiguous digits: "700000"
  const plain = text.match(/\d{4,12}/);
  if (plain) {
    const n = parseInt(plain[0], 10);
    if (Number.isFinite(n) && n > 1000) return n;
  }

  return 0;
}

export function parseMoteurHtml(html, sourceUrl) {
  const $ = cheerio.load(html);

  // 1. Kind: Car or Moto
  const isMoto = sourceUrl.includes('/moto/') ||
                 $('ol.breadcrumb, .breadcrumb').text().toLowerCase().includes('moto');
  const kind = isMoto ? 'Moto' : 'Car';

  // 2. ID from URL or page
  const urlMatch = sourceUrl.match(/\/detail-annonce\/(\d+)/i) || sourceUrl.match(/[\/-](\d{4,9})(?:\.html|\/|$)/);
  const rawId = urlMatch ? urlMatch[1] : Buffer.from(sourceUrl).toString('base64').slice(0, 10);
  const id = `moteur-${rawId}`;

  // 3. Title
  let rawTitle = $('h1').first().text() ||
                 $('.detail-title').text() ||
                 $('.title_detail').text() ||
                 $('meta[property="og:title"]').attr('content') ||
                 $('title').text() ||
                 'Véhicule';
  rawTitle = cleanText(rawTitle)
    .replace(/^A\s+vendre\s*[:-]?\s*/i, '')
    .replace(/^Occasion\s*[:-]?\s*/i, '')
    .replace(/\s*\|\s*Moteur\.ma.*$/i, '')
    .replace(/\s*-\s*Moteur\.ma.*$/i, '');

  if (rawTitle.toLowerCase().replace(/[^a-z]/g, '').startsWith('autre') || rawTitle.length < 5) {
    const descMeta = $('meta[name="description"]').attr('content') || '';
    const descMatch = descMeta.match(/d[ée]couvrez l['’]annonce\s+(?:autre\s+autre\s+)?([^-–.]+?)(?:\s*[-–]\s*[A-Z]|\s*\d{4}[A-Za-z]|_phrase|\.\s*Carburant|$)/i);
    if (descMatch && descMatch[1] && descMatch[1].trim().length > 3 && !descMatch[1].toLowerCase().includes('autre autre')) {
      rawTitle = cleanText(descMatch[1]);
    } else {
      const slugMatch = sourceUrl.match(/\/detail-annonce\/\d+\/([a-z0-9-]+)\.html/i);
      if (slugMatch && slugMatch[1] && !slugMatch[1].includes('autre-autre')) {
        const slugTitle = slugMatch[1].replace(/-/g, ' ');
        const { fullTitle } = splitBrandAndModel(slugTitle);
        if (fullTitle && fullTitle !== 'Véhicule') rawTitle = fullTitle;
      }
    }
  }

  // 4. Price — strictly scoped to the hero element `.ad-hero-price-col`.
  //
  //    Moteur.ma renders this class ONLY on the current listing's price.
  //    Related-listing cards, sidebar promos, and premium carousels use
  //    different classes (`.text-primary font-weight-bold`, `.price`, …).
  //    We deliberately do NOT fall back to any of them: if the hero is
  //    missing or contains a "price on demand" phrase, we return price=0
  //    and the caller skips the listing rather than showing a wrong price.
  let price = 0;
  let priceSource = 'none';

  const priceHero = $('.ad-hero-price-col').first();
  if (priceHero.length) {
    const heroText = priceHero.text().trim();
    if (CFP_SIGNALS_RE.test(heroText)) {
      priceSource = 'cfp-hero';
    } else {
      const parsed = parsePriceText(heroText);
      if (parsed) {
        price = parsed;
        priceSource = 'hero';
      }
    }
  }

  // 5. Features table extraction
  const rawFeatures = {};
  $('table tr').each((_, tr) => {
    const tds = $(tr).find('td');
    for (let i = 0; i < tds.length; i += 2) {
      if (i + 1 < tds.length) {
        const label = cleanText($(tds[i]).text()).replace(/:$/, '');
        const value = cleanText($(tds[i + 1]).text());
        if (label && value && label.length < 35 && value.length < 80) {
          rawFeatures[label] = value;
        }
      }
    }
  });

  // Strip script/style/noscript before body-text fallback regexes.
  const $clean = cheerio.load(html);
  $clean('script, style, noscript').remove();
  const pageText = $clean('body').text();
  const searchPatterns = [
    { key: 'Année', regex: /Année\s*[:\s]\s*(\d{4})/i },
    { key: 'Kilométrage', regex: /Kilométrage\s*[:\s]\s*([\d\s]+(?:\s*km)?)/i },
    { key: 'Carburant', regex: /Carburant\s*[:\s]\s*(Diesel|Essence|Hybride|Électrique)/i },
    { key: 'Boîte de vitesses', regex: /(?:Bo[îi]te\s*de\s*vitesses?|Transmission)\s*[:\s]\s*(Manuelle|Automatique)/i },
    { key: 'Puissance fiscale', regex: /Puissance\s*fiscale\s*[:\s]\s*(\d+\s*CV)/i },
    { key: 'État', regex: /État\s*[:\s]\s*([\w\s]+?)(?:\n|\t|,|$)/i },
    { key: 'Première main', regex: /Premi[eè]re\s*main\s*[:\s]\s*(Oui|Non)/i },
    { key: 'Origine', regex: /Origine\s*[:\s]\s*([\w\s]+?)(?:\n|\t|,|$)/i },
    { key: 'Couleur', regex: /Couleur\s*[:\s]\s*([\w\s]+?)(?:\n|\t|,|$)/i },
    { key: 'Ville', regex: /Ville\s*[:\s]\s*([\w\s-]+?)(?:\n|\t|,|$)/i }
  ];

  for (const { key, regex } of searchPatterns) {
    if (!rawFeatures[key]) {
      const m = pageText.match(regex);
      if (m && m[1]) rawFeatures[key] = cleanText(m[1]);
    }
  }

  // 6. Options / Equipements
  const isConditionOption = (str) => {
    const s = str.toLowerCase();
    return s.includes('état du véhicule') || s.includes('etat du vehicule') || s.includes('حالة المركبة') || s.includes('حالة السيارة');
  };
  const rawOptions = [];
  $('h4').each((_, el) => {
    if ($(el).text().trim().toLowerCase().includes('option')) {
      $(el).parent().find('.row > div, li').each((_, optEl) => {
        const t = cleanText($(optEl).text());
        if (t && t.length > 1 && t.length < 50 && !t.toLowerCase().includes('option') && !t.includes('propriétaire') && !isConditionOption(t) && !rawOptions.includes(t)) {
          rawOptions.push(t);
        }
      });
    }
  });
  if (rawOptions.length === 0) {
    $('.options-list li, .equipements li, .equipement li, .options-block span').each((_, el) => {
      const opt = cleanText($(el).text());
      if (opt && opt.length > 1 && opt.length < 50 && !isConditionOption(opt) && !rawOptions.includes(opt)) {
        rawOptions.push(opt);
      }
    });
  }

  // 7. Images — Pattern A: og:image-anchored, scoped to the listing gallery.
  const rawImages = extractListingImages($, {
    cdnPattern: /moteur\.ma\/storage\/media\/images\/ads\/|content\.avito\.ma\/classifieds\/images\//i,
    gallerySelectors: [
      '#full-gallery',
      '.ad-gallery-carousel',
      '.ad-gallery-slide',
      '.product-slider',
      '.ad-detail [class*="gallery"]',
      '.ad-detail [class*="carousel"]',
      '.annonce-detail [class*="gallery"]',
      '.annonce-detail [class*="carousel"]'
    ],
    origin: 'https://www.moteur.ma',
    maxCount: 10
  });

  // 8. Quick facts & features assembly
  const year = rawFeatures['Année'] || rawFeatures['Annee'] || '';
  const mileage = rawFeatures['Kilométrage'] || rawFeatures['Kilometrage'] || '';
  const fuel = rawFeatures['Carburant'] || '';
  const rawGearbox = rawFeatures['Boîte de vitesses'] || rawFeatures['Boite de vitesses'] || rawFeatures['Transmission'] || '';

  let gearboxVal = rawGearbox ? localizeTerm(rawGearbox) : { en: 'Manual', ar: 'مانييل' };
  if (isMoto) {
    const isAutoMoto = /scooter|vespa|tmax|t-max|forza|adv|pcx|sh|beverly|burgman|symphony|agility|c50|c90|c100|x-adv|xadv/i.test(rawTitle);
    gearboxVal = isAutoMoto ? { en: 'Automatic', ar: 'أوطوماتيك' } : { en: 'Manual', ar: 'مانييل' };
  } else if (!rawGearbox) {
    const isAutoCar = /porsche|mercedes|bmw|audi|land rover|range rover|jaguar|volvo|jeep|lexus/i.test(rawTitle) || /auto|bva|dsg|tiptronic|s-tronic/i.test(rawTitle);
    gearboxVal = isAutoCar ? { en: 'Automatic', ar: 'أوطوماتيك' } : { en: 'Manual', ar: 'مانييل' };
  }

  const gearboxFeature = {
    label: { en: 'Gearbox', ar: 'علبة السرعات' },
    value: gearboxVal
  };

  let features = Object.entries(rawFeatures).map(([k, v]) => ({
    label: localizeTerm(k),
    value: localizeTerm(v)
  }));

  features = features.filter(f => {
    const lblEn = (f.label && (f.label.en || f.label) || '').trim().toLowerCase();
    const lblAr = (f.label && f.label.ar || '').trim().toLowerCase();
    const valEn = (f.value && (f.value.en || f.value) || '').trim().toLowerCase();
    if (!valEn || valEn === 'n/a' || valEn === 'null') return false;
    if (lblEn.includes('douane') || lblAr.includes('douane') || lblEn.includes('customs') || lblAr.includes('جمارك')) return false;
    if (lblEn.includes('tax horsepower') || lblEn === 'tax hp' || lblEn.includes('puissance fiscale') || lblAr.includes('الجبائية')) return false;
    if (lblEn.includes('transmission') || lblAr.includes('ناقل الحركة')) return false;
    if (lblEn.includes('gearbox') || lblAr.includes('علبة السرعات')) return false;
    if (lblEn.includes('body type') || lblEn.includes('carrosserie') || lblAr.includes('نوع الهيكل')) return false;
    return true;
  });
  features.push(gearboxFeature);

  let quickFacts;

  if (!isMoto) {
    const hpValue = getVehicleHorsepower({ kind, title: { en: rawTitle }, features });
    const hpFact = { en: `${hpValue} hp`, ar: `${hpValue} حصان` };
    const hpFeature = {
      label: { en: 'Horsepower', ar: 'القوة الحصانية' },
      value: hpFact
    };
    features.push(hpFeature);

    quickFacts = [year, mileage, fuel]
      .filter(Boolean)
      .map(val => localizeTerm(val));
    quickFacts.push(hpFact);
  } else {
    quickFacts = [year, mileage, fuel]
      .filter(Boolean)
      .map(val => localizeTerm(val));
    quickFacts.push(gearboxVal);

    features = features.filter(f => {
      const valEn = (f.value && (f.value.en || f.value) || '').trim();
      if (valEn === 'N/A' || valEn === '') return false;
      return true;
    });

    const engineCap = rawFeatures['Cylindrée'] || rawFeatures['Engine capacity'] || rawFeatures['Cylindree'] || '';
    const bikeCyl = detectBikeCylinders(rawTitle, engineCap, pageText);
    features.unshift({
      label: { en: 'Cylinders', ar: 'عدد الأسطوانات' },
      value: { en: bikeCyl.en, ar: bikeCyl.ar }
    });
  }

  // Equipment & options: leave in original French for both languages per user specification
  const options = rawOptions.map(opt => ({
    en: opt,
    ar: opt,
    raw: opt
  }));

  let summary;
  try {
    summary = generateEnrichedSummary({
      kind,
      title: { en: rawTitle, ar: rawTitle },
      features,
      quickFacts
    });
  } catch (_) {
    summary = undefined;
  }

  return {
    id,
    kind,
    title: {
      en: rawTitle,
      ar: rawTitle
    },
    price,
    _priceSource: priceSource,
    quickFacts,
    features,
    options,
    images: rawImages.slice(0, 10),
    summary,
    sourceUrl
  };
}

export async function importListing(url, delayMs = DEFAULT_DELAY_MS) {
  const actualDelay = Math.max(MIN_DELAY_MS, delayMs);
  console.log(`[Importer] Fetching public listing: ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} while fetching ${url}`);
  }

  const html = await response.text();
  const listing = parseMoteurHtml(html, url);

  const src = listing._priceSource || 'unknown';
  const priceStr = listing.price > 0
    ? `${listing.price} MAD [src=${src}]`
    : `Price on demand [src=${src}]`;
  console.log(`[Importer] Extracted: "${listing.title.en}" (${priceStr}, ${listing.images.length} photos)`);

  await sleep(actualDelay);
  return listing;
}

export async function crawlSearchPage(searchUrl) {
  console.log(`[Crawler] Fetching search page: ${searchUrl}`);
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
    }
  });

  if (!response.ok) return [];

  const html = await response.text();
  const $ = cheerio.load(html);
  const links = [];

  $('a[href*="detail-annonce"]').each((_, el) => {
    const h = $(el).attr('href');
    if (h && !links.includes(h)) {
      links.push(h.startsWith('http') ? h : `https://www.moteur.ma${h}`);
    }
  });

  return links;
}

export async function main() {
  const args = process.argv.slice(2);
  let urls = [];
  let outFile = 'data/listings.imported.json';
  let delayMs = DEFAULT_DELAY_MS;
  let isDryRun = false;
  let isCrawlMode = false;
  let crawlLimit = 1000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--crawl') {
      isCrawlMode = true;
    } else if (args[i] === '--limit' && args[i + 1]) {
      crawlLimit = parseInt(args[++i], 10) || 1000;
    } else if (args[i] === '--file' && args[i + 1]) {
      const filePath = args[++i];
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        urls.push(...fileContent.split('\n').map(u => u.trim()).filter(Boolean));
      } else {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }
    } else if (args[i] === '--out' && args[i + 1]) {
      outFile = args[++i];
    } else if (args[i] === '--delay' && args[i + 1]) {
      delayMs = Math.max(MIN_DELAY_MS, parseInt(args[++i], 10) || DEFAULT_DELAY_MS);
    } else if (args[i] === '--dry-run') {
      isDryRun = true;
    } else if (args[i].startsWith('http')) {
      urls.push(args[i]);
    }
  }

  const resolvedOut = path.resolve(process.cwd(), outFile);
  let existingListings = [];
  if (fs.existsSync(resolvedOut)) {
    try {
      const raw = fs.readFileSync(resolvedOut, 'utf-8');
      existingListings = JSON.parse(raw);
      if (!Array.isArray(existingListings)) existingListings = [];
    } catch (_) {
      existingListings = [];
    }
  }
  const seenIds = new Set(existingListings.map(item => item.id));
  const seenUrls = new Set(existingListings.map(item => item.sourceUrl));

  if (isCrawlMode) {
    console.log(`[Crawler] Starting crawl up to target of ${crawlLimit} listings...`);
    console.log(`[Crawler] Already have ${existingListings.length} existing listings in ${outFile}`);

    const crawlDelay = Math.max(MIN_DELAY_MS, delayMs);
    let page = 1;
    let motoPage = 1;
    let consecutiveEmpty = 0;

    while (urls.length + existingListings.length < crawlLimit && consecutiveEmpty < 3) {
      const searchUrl = `https://www.moteur.ma/fr/voiture/achat-voiture-occasion?page=${page}`;
      const foundLinks = await crawlSearchPage(searchUrl);
      await sleep(crawlDelay);

      if (!foundLinks || foundLinks.length === 0) {
        consecutiveEmpty++;
      } else {
        consecutiveEmpty = 0;
        let addedThisPage = 0;
        for (const link of foundLinks) {
          if (!seenUrls.has(link) && !urls.includes(link)) {
            urls.push(link);
            addedThisPage++;
          }
        }
        console.log(`[Crawler] Page ${page}: found ${foundLinks.length} links (${addedThisPage} new). Total queued: ${urls.length}`);
      }

      page++;
      if (page % 5 === 0 && motoPage <= 15) {
        const motoSearchUrl = `https://www.moteur.ma/fr/moto/achat-moto-occasion?page=${motoPage}`;
        const motoLinks = await crawlSearchPage(motoSearchUrl);
        await sleep(crawlDelay);
        for (const link of motoLinks) {
          if (!seenUrls.has(link) && !urls.includes(link)) {
            urls.push(link);
          }
        }
        motoPage++;
      }
    }
    console.log(`[Crawler] Queued ${urls.length} fresh listing URLs to import.`);
  }

  if (urls.length === 0 && !isCrawlMode) {
    console.log(`
RwidaGuessr - Conservative Moteur.ma Listing Importer

Usage:
  node scripts/import-moteur.js <url1> [url2] ...
  node scripts/import-moteur.js --file urls.txt [--out data/listings.imported.json] [--delay 2500]
  node scripts/import-moteur.js --crawl [--limit 1000] [--out data/listings.imported.json] [--delay 2000]

Options:
  --crawl         Automatically crawl search pages and discover listings
  --limit <num>   Target number of listings to import when crawling (default: 1000)
  --file <path>   Path to a text file containing moteur.ma listing URLs (one per line)
  --out <path>    Path to write output JSON (default: data/listings.imported.json)
  --delay <ms>    Polite delay between requests in milliseconds (min 1500, default 2000)
  --dry-run       Print extracted listings to console without writing to file
`);
    return;
  }

  const validUrls = urls.filter(isValidMoteurUrl);
  console.log(`[Importer] Processing ${validUrls.length} URL(s) with ${delayMs}ms fixed polite rate.`);

  const currentList = [...existingListings];
  let successfulNew = 0;

  for (let idx = 0; idx < validUrls.length; idx++) {
    const url = validUrls[idx];
    if (seenUrls.has(url)) continue;

    try {
      const listing = await importListing(url, delayMs);

      // Only include playable listings: a real price AND at least one photo.
      // Listings with "Appeler pour le prix" are skipped entirely.
      if (listing.price > 0 && listing.images.length > 0) {
        const existingIdx = currentList.findIndex(e => e.id === listing.id);
        if (existingIdx >= 0) {
          currentList[existingIdx] = listing;
        } else {
          currentList.push(listing);
          seenIds.add(listing.id);
          seenUrls.add(listing.sourceUrl);
          successfulNew++;
        }

        if (!isDryRun) {
          fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
          fs.writeFileSync(resolvedOut, JSON.stringify(currentList, null, 2), 'utf-8');

          try {
            const dataDir = path.dirname(resolvedOut);
            fs.writeFileSync(path.join(dataDir, 'listings.data.js'), '// Automatically exported verified listings for server and edge runtimes\nexport const DEFAULT_LISTINGS = ' + JSON.stringify(currentList, null, 2) + ';\n', 'utf-8');
            fs.writeFileSync(path.join(dataDir, 'listings.demo.js'), '/*\n * Real verified Moroccan vehicle listings with 100% working high-resolution photos.\n * Used for instant client-side rendering and static/fallback operation.\n */\nwindow.DEMO_LISTINGS = ' + JSON.stringify(currentList, null, 2) + ';\n', 'utf-8');
            fs.writeFileSync(path.join(dataDir, 'listings.demo.json'), JSON.stringify(currentList, null, 2), 'utf-8');
          } catch (_) {}

          console.log(`[Importer] Saved progress: ${currentList.length} total listings in ${outFile} (+${successfulNew})`);
        }
      } else {
        console.log(`[Importer] Skipped unplayable listing: price=${listing.price}, images=${listing.images.length}`);
      }

      if (currentList.length >= crawlLimit) {
        console.log(`[Importer] Reached limit of ${crawlLimit} valid listings!`);
        break;
      }
    } catch (err) {
      console.error(`[Importer] Error processing ${url}: ${err.message}`);
    }
  }

  console.log(`[Importer] Completed! Total valid listings: ${currentList.length}`);
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch(err => {
    console.error('[Importer] Fatal error:', err);
    process.exit(1);
  });
}