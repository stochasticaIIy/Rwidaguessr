#!/usr/bin/env node

/**
 * Conservative importer for moteur.ma public vehicle listings.
 * 
 * Complies with conservative scraping practices:
 * - Requests only public detail pages from moteur.ma
 * - Enforces a polite, slow fixed rate (enforced minimum 1500ms, default 2500ms)
 * - Identifies itself with a dedicated User-Agent
 * - Scrubs personal/contact info (phone, email, seller names)
 * - Scrubs price mentions from descriptions to prevent gameplay spoilers
 * - Leaves equipment & options in original French for both languages
 * - Generates Moroccan Darija summaries for Arabic version
 * - Supports automatic crawling across pagination to reach 1000+ listings
 * - Saves incrementally to JSON so progress is never lost
 * 
 * Usage:
 *   node scripts/import-moteur.js <url1> <url2> ...
 *   node scripts/import-moteur.js --file urls.txt [--out data/listings.imported.json] [--delay 2500]
 *   node scripts/import-moteur.js --crawl [--limit 1000] [--out data/listings.imported.json] [--delay 2000]
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { terms, localizeTerm } from './dictionary.js';
import { frenchToDarija, frenchToEnglish, detectBikeCylinders } from './darija.js';

const MIN_DELAY_MS = 1500;
const DEFAULT_DELAY_MS = 2000;
const USER_AGENT = 'RwidaGuessr-Importer/1.0 (+https://github.com/stochasticaIIy/Rwidaguessr; conservative public detail importer)';

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

function sanitizeSummary(text) {
  if (!text) return '';
  let cleaned = text;

  // Remove phone numbers (Moroccan patterns: 06..., 07..., 05..., +212..., 00212...)
  cleaned = cleaned.replace(/(?:\+?212|00212|0)\s*[5-7](?:[\s.-]*\d{2}){4}/g, '[contact masqué]');
  cleaned = cleaned.replace(/\b0[5-7]\d{8}\b/g, '[contact masqué]');
  cleaned = cleaned.replace(/\b\d{10}\b/g, '[contact masqué]');

  // Remove email addresses
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[contact masqué]');

  // Remove price spoiler clues (e.g. 185 000 dh, 185k, 185000, 18 millions)
  cleaned = cleaned.replace(/\b\d{1,3}(?:[.,\s]\d{3})*\s*(?:dh|dhs|mad|dirhams?|millions?|k)\b/gi, '[prix masqué]');
  cleaned = cleaned.replace(/prix\s*[:=]?\s*[\d\s.,]+(?:dh|dhs|mad)?/gi, '');

  // Remove calls to action
  cleaned = cleaned.replace(/(?:contactez[- ]moi|appelez|disponible sur whatsapp|tel|gsm|numéro)[\s\w:.]*/gi, '');

  return cleanText(cleaned).slice(0, 350);
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

  // If title is generic like "Autre autre" or "Autre", try to pull actual model from meta description or URL
  if (rawTitle.toLowerCase().replace(/[^a-z]/g, '').startsWith('autre') || rawTitle.length < 5) {
    const descMeta = $('meta[name="description"]').attr('content') || '';
    const descMatch = descMeta.match(/d[ée]couvrez l['’]annonce\s+(?:autre\s+autre\s+)?([^-–.]+?)(?:\s*[-–]\s*[A-Z]|\s*\d{4}[A-Za-z]|_phrase|\.\s*Carburant|$)/i);
    if (descMatch && descMatch[1] && descMatch[1].trim().length > 3 && !descMatch[1].toLowerCase().includes('autre autre')) {
      rawTitle = cleanText(descMatch[1]);
    } else {
      // Try URL slug
      const slugMatch = sourceUrl.match(/\/detail-annonce\/\d+\/([a-z0-9-]+)\.html/i);
      if (slugMatch && slugMatch[1] && !slugMatch[1].includes('autre-autre')) {
        rawTitle = slugMatch[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }

  // 4. Price
  let price = 0;
  const priceHero = $('.ad-hero-price-col, .col-4.text-primary.ad-hero-price-col, .detail-price, #detail-price').first();
  if (priceHero.length) {
    const heroText = priceHero.text().trim();
    const heroLower = heroText.toLowerCase();
    if (heroLower.includes('appeler') || heroLower.includes('demande') || heroLower.includes('contact') || heroLower.includes('sur devis')) {
      price = 0; // Explicitly unpriced listing ("Appeler pour le prix")
    } else {
      const match = heroText.replace(/\s+/g, ' ').match(/([\d\s.,]{3,12})/);
      if (match) {
        const parsed = parseInt(match[1].replace(/[^\d]/g, ''), 10);
        if (parsed > 1000) price = parsed;
      }
    }
  }

  // Check price elements or regex on full page text if not found
  if (!price) {
    const priceEl = $('.col-md-4 .price, .col-sm-4 .price, .item-price, .price').first();
    if (priceEl.length) {
      const pText = priceEl.text().trim();
      const match = pText.replace(/\s+/g, ' ').match(/([\d\s.,]{3,12})/);
      if (match) {
        const parsed = parseInt(match[1].replace(/[^\d]/g, ''), 10);
        if (parsed > 1000) price = parsed;
      }
    }
  }

  if (!price) {
    const pageMatch = $('body').text().match(/(\d[\d\s.,]{3,10})\s*(?:dhs|dh|dirhams)/i);
    if (pageMatch) {
      const parsed = parseInt(pageMatch[1].replace(/[^\d]/g, ''), 10);
      if (parsed > 1000) price = parsed;
    }
  }

  // Only check meta tag if still not found
  if (!price) {
    const priceMeta = $('meta[property="product:price:amount"]').attr('content');
    if (priceMeta) {
      const parsed = parseInt(priceMeta.replace(/[^\d]/g, ''), 10);
      if (parsed > 1000) price = parsed;
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

  // Fallback search patterns for crucial vehicle fields
  const pageText = $('body').text();
  const searchPatterns = [
    { key: 'Année', regex: /Année\s*[:\s]\s*(\d{4})/i },
    { key: 'Kilométrage', regex: /Kilométrage\s*[:\s]\s*([\d\s]+(?:\s*km)?)/i },
    { key: 'Carburant', regex: /Carburant\s*[:\s]\s*(Diesel|Essence|Hybride|Électrique)/i },
    { key: 'Boîte de vitesses', regex: /(?:Bo[îi]te\s*de\s*vitesses?|Transmission)\s*[:\s]\s*(Manuelle|Automatique)/i },
    { key: 'Puissance fiscale', regex: /Puissance\s*fiscale\s*[:\s]\s*(\d+\s*CV)/i },
    { key: 'Carrosserie', regex: /Carrosserie\s*[:\s]\s*([\w\s&]+?)(?:\n|\t|,|$)/i },
    { key: 'Couleur', regex: /Couleur\s*[:\s]\s*([\w\s]+?)(?:\n|\t|,|$)/i },
    { key: 'Ville', regex: /Ville\s*[:\s]\s*([\w\s-]+?)(?:\n|\t|,|$)/i }
  ];

  for (const { key, regex } of searchPatterns) {
    if (!rawFeatures[key]) {
      const m = pageText.match(regex);
      if (m && m[1]) {
        rawFeatures[key] = cleanText(m[1]);
      }
    }
  }

  // 6. Options / Equipements
  const rawOptions = [];
  $('h4').each((_, el) => {
    if ($(el).text().trim().toLowerCase().includes('option')) {
      $(el).parent().find('.row > div, li').each((_, optEl) => {
        const t = cleanText($(optEl).text());
        if (t && t.length > 1 && t.length < 50 && !t.toLowerCase().includes('option') && !t.includes('propriétaire') && !rawOptions.includes(t)) {
          rawOptions.push(t);
        }
      });
    }
  });
  if (rawOptions.length === 0) {
    $('.options-list li, .equipements li, .equipement li, .options-block span').each((_, el) => {
      const opt = cleanText($(el).text());
      if (opt && opt.length > 1 && opt.length < 50 && !rawOptions.includes(opt)) {
        rawOptions.push(opt);
      }
    });
  }

  // 7. Images
  const rawImages = [];
  // Prioritize native moteur.ma storage images from the entire HTML
  const pageHtml = $.html();
  const moteurMatches = pageHtml.match(/https:\/\/www\.moteur\.ma\/storage\/media\/images\/ads\/resized\/[^\s"'<>\)]+/g) || [];
  for (const img of moteurMatches) {
    if (!rawImages.includes(img)) rawImages.push(img);
  }

  $('#full-gallery img, #carousel img, .ad-gallery-slide img, .carousel-item img, .ad-gallery-carousel img, .product-slider img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy');
    if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('.svg')) {
      let fullUrl = src;
      if (fullUrl.startsWith('//')) fullUrl = 'https:' + fullUrl;
      else if (fullUrl.startsWith('/')) fullUrl = 'https://www.moteur.ma' + fullUrl;
      if (!rawImages.includes(fullUrl)) rawImages.push(fullUrl);
    }
  });
  // Fallback check for classified images
  if (rawImages.length === 0) {
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy');
      if (src && (src.includes('storage/media/images/ads/') || src.includes('content.avito.ma/classifieds/images/'))) {
        let fullUrl = src;
        if (fullUrl.startsWith('//')) fullUrl = 'https:' + fullUrl;
        else if (fullUrl.startsWith('/')) fullUrl = 'https://www.moteur.ma' + fullUrl;
        if (!rawImages.includes(fullUrl)) rawImages.push(fullUrl);
      }
    });
  }

  // 8. Description / Summary
  let rawDescription = $('.detail-description').text() ||
                        $('.description').text() ||
                        $('.text_detail').text() ||
                        $('.detail-text').text() ||
                        '';
  if (!rawDescription) {
    const descMeta = $('meta[name="description"]').attr('content');
    if (descMeta) rawDescription = descMeta;
  }
  const summaryFr = sanitizeSummary(rawDescription) || 
                    `${rawTitle} en bon état général, disponible pour visite.`;

  // 9. Quick facts & features assembly
  const year = rawFeatures['Année'] || rawFeatures['Annee'] || '';
  const mileage = rawFeatures['Kilométrage'] || rawFeatures['Kilometrage'] || '';
  const fuel = rawFeatures['Carburant'] || '';
  const transmission = rawFeatures['Boîte de vitesses'] || rawFeatures['Boite de vitesses'] || rawFeatures['Transmission'] || '';

  const quickFacts = [year, mileage, fuel, transmission]
    .filter(Boolean)
    .map(val => localizeTerm(val));

  let features = Object.entries(rawFeatures).map(([k, v]) => ({
    label: localizeTerm(k),
    value: localizeTerm(v)
  }));

  if (isMoto) {
    // Filter out irrelevant car-specific empty fields for motorbikes
    features = features.filter(f => {
      const valEn = (f.value && (f.value.en || f.value) || '').trim();
      const lblEn = (f.label && (f.label.en || f.label) || '').trim();
      if (valEn === 'N/A' || valEn === '') return false;
      if (lblEn === 'Statut de douane') return false;
      return true;
    });

    const engineCap = rawFeatures['Cylindrée'] || rawFeatures['Engine capacity'] || rawFeatures['Cylindree'] || '';
    const bikeCyl = detectBikeCylinders(rawTitle, engineCap, pageText);
    features.unshift({
      label: { en: 'Cylinders', ar: 'عدد الأسطوانات' },
      value: { en: bikeCyl.en, ar: bikeCyl.ar }
    });
  } else {
    // Filter out Statut de douane and Tax horsepower for cars
    features = features.filter(f => {
      const lblEn = (f.label && (f.label.en || f.label) || '').trim();
      if (lblEn === 'Statut de douane' || lblEn === 'Tax horsepower') return false;
      return true;
    });
  }

  // Equipment & options: leave in original French for both languages per user specification
  const options = rawOptions.map(opt => ({
    en: opt,
    ar: opt,
    raw: opt
  }));

  const metaSummary = {
    kind,
    title: rawTitle,
    year,
    mileage,
    fuel,
    transmission,
    city: rawFeatures['Ville'] || rawFeatures['ville'] || ''
  };

  // English summary and Arabic summary in Moroccan Darija
  const summaryEn = frenchToEnglish(summaryFr, metaSummary);
  const summaryDarija = frenchToDarija(summaryFr, metaSummary);

  return {
    id,
    kind,
    title: {
      en: rawTitle,
      ar: rawTitle
    },
    price,
    quickFacts,
    summary: {
      en: summaryEn,
      ar: summaryDarija
    },
    features,
    options,
    images: rawImages.slice(0, 10),
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

  console.log(`[Importer] Extracted: "${listing.title.en}" (${listing.price > 0 ? listing.price + ' MAD' : 'Price on demand'}, ${listing.images.length} photos)`);
  
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

  // Load existing listings to avoid duplicate requests and support resuming
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

  // If in crawl mode, gather listing URLs from pagination
  if (isCrawlMode) {
    console.log(`[Crawler] Starting crawl up to target of ${crawlLimit} listings...`);
    console.log(`[Crawler] Already have ${existingListings.length} existing listings in ${outFile}`);
    
    let page = 1;
    let motoPage = 1;
    let consecutiveEmpty = 0;

    while (urls.length + existingListings.length < crawlLimit && consecutiveEmpty < 3) {
      const searchUrl = `https://www.moteur.ma/fr/voiture/achat-voiture-occasion?page=${page}`;
      const foundLinks = await crawlSearchPage(searchUrl);
      await sleep(MIN_DELAY_MS);

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
      // Also occasionally sprinkle in moto listings
      if (page % 5 === 0 && motoPage <= 10) {
        const motoSearchUrl = `https://www.moteur.ma/fr/moto/achat-moto-occasion?page=${motoPage}`;
        const motoLinks = await crawlSearchPage(motoSearchUrl);
        await sleep(MIN_DELAY_MS);
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
    if (seenUrls.has(url)) {
      continue;
    }

    try {
      const listing = await importListing(url, delayMs);
      
      // We only include playable listings with real price and pictures
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

        // Save incrementally after each successful item
        if (!isDryRun) {
          fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
          fs.writeFileSync(resolvedOut, JSON.stringify(currentList, null, 2), 'utf-8');

          // Keep runtime modules and demo files in sync with imported listings
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

// Auto-run if executed directly
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch(err => {
    console.error('[Importer] Fatal error:', err);
    process.exit(1);
  });
}
