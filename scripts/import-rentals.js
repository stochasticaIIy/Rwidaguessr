#!/usr/bin/env node

/**
 * Conservative importer for Moroccan vehicle rental portals:
 * - GoRide.ma
 * - OneClickDrive.ma
 * - Moteur.ma Location
 * - RentalMotoMarrakech.com
 * - MotoNomad.ma
 * - Location-Scooter-Marrakech.com
 * - LocationMotoTanger.com
 * - OXBikers.com (agency fleet pages, one city per bike)
 *
 * Complies with conservative scraping practices:
 * - Requests only public rental detail & fleet pages
 * - Enforces a polite rate limit (--delay, default 1500ms)
 * - Identifies itself with a dedicated User-Agent
 * - Scrubs personal/contact info (phone, WhatsApp, email, agency names)
 * - Leaves equipment & options in original French for both languages
 * - Supports automatic crawling across Moroccan cities & categories
 * - Saves incrementally to JSON so progress is never lost
 * - Extracts only listing-owned photos (og:image-anchored)
 *
 * Usage:
 *   node scripts/import-rentals.js <url1> <url2> ...
 *   node scripts/import-rentals.js --file urls.txt [--out data/rentals.imported.json] [--delay 1500]
 *   node scripts/import-rentals.js --crawl [--limit 350] [--out data/rentals.imported.json] [--delay 1500]
 *
 * --limit caps unique cars only; motorbikes are never capped.
 * Cars are de-duplicated across cities on every save (see dedupeAcrossCities).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { localizeTerm } from './dictionary.js';
import { detectBikeCylinders } from './darija.js';
import {
  cleanText,
  hashString,
  safeDecodeUri,
  MOROCCAN_CITIES,
  resolveLocationFromText,
  KNOWN_BRANDS,
  splitBrandAndModel,
  extractListingImages
} from './morocco-data.js';

// Re-export so any external module that imports these from here keeps working.
export { MOROCCAN_CITIES, resolveLocationFromText, splitBrandAndModel };

const MIN_DELAY_MS = 200;
const DEFAULT_DELAY_MS = 1500;
const USER_AGENT = 'RwidaGuessr-Rental-Importer/1.0 (+https://github.com/stochasticaIIy/Rwidaguessr; conservative public rental importer)';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isValidRentalUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    return [
      'goride.ma',
      'oneclickdrive.ma',
      'moteur.ma',
      'rentalmotomarrakech.com',
      'motonomad.ma',
      'location-scooter-marrakech.com',
      'locationmototanger.com',
      'xenoride.ma',
      'marrakechmoto.com',
      'ride2atlas.com',
      'keni-rides.com',
      'oxbikers.com'
    ].includes(host);
  } catch (_) {
    return false;
  }
}

function extractBalancedObject(text, startMarker) {
  const idx = text.indexOf(startMarker);
  if (idx < 0) return null;
  const openIdx = text.indexOf('{', idx);
  if (openIdx < 0) return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inStr = false; }
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(openIdx, i + 1);
    }
  }
  return null;
}

/**
 * Engine size from the model name ("XT 250" -> "250", "R1300 GS" -> "1300").
 * Several sites repeat a site-wide or "similar bikes" displacement in the page text, so the
 * first "NNN cc" found in the page is NOT reliable (e.g. every scooter reported 254 cc, three
 * unrelated bikes reported 853 cc). Returns '' when the name has no displacement
 * (also for "125/155"-style ranges and 4-digit non-cc model codes outside 50-2000).
 */
export function engineCcFromTitle(title) {
  const t = String(title || '');
  if (/\d{2,3}\s*\/\s*\d{2,3}/.test(t)) return '';
  const nums = [...t.matchAll(/(?<![\d.])(\d{2,4})(?!\d)/g)].map((m) => Number(m[1])).filter((n) => n >= 50 && n <= 2000);
  return nums.length ? String(nums[0]) : '';
}

/**
 * Pick the engine size to publish: the scraped value if it agrees with the model name
 * (within 15%: "KTM 390" -> 373 cc is right), otherwise the name's own number. When the name
 * has no number, the scraped value is only used for sources whose value is trustworthy.
 */
export function reconcileEngineCc(title, scraped, { trustScrapedWithoutTitle = false } = {}) {
  const t = Number(engineCcFromTitle(title));
  const sc = Number(String(scraped || '').replace(/[^\d]/g, ''));
  if (t && sc && Math.abs(sc - t) / t <= 0.15) return String(sc);
  if (t) return String(t);
  return trustScrapedWithoutTitle && sc >= 50 && sc <= 2000 ? String(sc) : '';
}

function buildRentalFeatures({
  isMoto,
  brand,
  model,
  year,
  mileage,
  fuelFr,
  gearboxFr,
  doors,
  minDays,
  engineCc,
  title,
  location
}) {
  const fuelLoc = localizeTerm(fuelFr || (isMoto ? 'Essence' : 'Diesel'));
  const gearboxLoc = localizeTerm(gearboxFr || 'Automatique');
  const cleanMileage = mileage ? String(mileage).trim() : '';

  const features = [
    { label: { en: 'Brand', ar: 'العلامة' }, value: { en: brand, ar: brand } },
    { label: { en: 'Model', ar: 'الطراز' }, value: { en: model, ar: model } }
  ];
  // Some sources (e.g. OXBikers) publish no model year: leave Year out rather than guess.
  if (year) features.push({ label: { en: 'Year', ar: 'السنة' }, value: { en: String(year), ar: String(year) } });

  if (cleanMileage) {
    features.push({
      label: { en: 'Mileage', ar: 'المسافة المقطوعة' },
      value: { en: cleanMileage, ar: cleanMileage }
    });
  }

  features.push({ label: { en: 'Fuel', ar: 'الوقود' }, value: fuelLoc });

  if (!isMoto && doors) {
    features.push({ label: { en: 'Doors', ar: 'الأبواب' }, value: { en: String(doors), ar: String(doors) } });
  }

  if (isMoto) {
    const cyl = detectBikeCylinders(title, engineCc, title);
    features.unshift({
      label: { en: 'Cylinders', ar: 'عدد الأسطوانات' },
      value: { en: cyl.en, ar: cyl.ar }
    });
    if (engineCc) {
      features.push({
        label: { en: 'Engine capacity', ar: 'سعة المحرك' },
        value: { en: `${engineCc} cc`, ar: `${engineCc} سم³` }
      });
    }
  }

  if (minDays) {
    const daysNum = parseInt(String(minDays).replace(/[^\d]/g, ''), 10) || 2;
    features.push({
      label: { en: 'Minimum rental', ar: 'المدة الدنيا للكراء' },
      value: {
        en: daysNum === 1 ? '1 day' : `${daysNum} days`,
        ar: daysNum === 1 ? 'يوم واحد' : daysNum === 2 ? 'يومين' : `${daysNum} أيام`
      }
    });
  }

  if (!isMoto) {
    features.push({ label: { en: 'Gearbox', ar: 'علبة السرعات' }, value: gearboxLoc });
  }
  features.push({ label: { en: 'City', ar: 'المدينة' }, value: { en: location.city, ar: location.cityAr } });

  const quickFacts = year ? [{ en: String(year), ar: String(year) }] : [];
  if (cleanMileage) quickFacts.push({ en: cleanMileage, ar: cleanMileage });
  if (!isMoto) quickFacts.push(fuelLoc, gearboxLoc);
  else quickFacts.push(fuelLoc);

  return { features, quickFacts };
}

/**
 * 1. Parse GoRide.ma Car Rental Detail HTML
 */
export function parseGoRideHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  let urlObj;
  try { urlObj = new URL(sourceUrl); } catch (_) { urlObj = null; }
  const rawId = (urlObj && urlObj.searchParams.get('id')) || Buffer.from(sourceUrl).toString('base64').slice(0, 10);
  const id = `goride-${rawId.slice(0, 14)}`;

  const h1 = cleanText($('h1').first().text()) || 'Voiture de location';
  const yearMatch = h1.match(/\b(20\d\d|19\d\d)\b/) || sourceUrl.match(/-(20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : '2024';

  const { brand, model, fullTitle } = splitBrandAndModel(h1);

  // Snapshot the DOM before we strip chrome, so extractListingImages still sees metas.
  $('script, style, nav, header, footer').remove();
  const mainText = cleanText($('main').text() || $('body').text());

  let price = 0;
  const partMatch = mainText.match(/À partir de\s*(\d+(?:[.,]\d+)?)\s*dh\/jour/i);
  const fullMatch = mainText.match(/(\d{1,3}(?:[ \u00A0]\d{3})+|\d+)(?:[.,]\d+)?\s*DH\s*\/\s*jour/i);
  if (partMatch) {
    const parsed = Math.round(parseFloat(partMatch[1].replace(',', '.')));
    if (parsed >= 80 && parsed <= 25000) price = parsed;
  } else if (fullMatch) {
    const parsed = parseInt(fullMatch[1].replace(/\s+/g, ''), 10);
    if (parsed >= 80 && parsed <= 25000) price = parsed;
  }
  if (!price) {
    console.warn(`[GoRide] No price parsed for ${sourceUrl}, skipping.`);
    return null;
  }

  const sentenceMatch = mainText.match(/Louez cette\s+.*?\s+(diesel|essence|hybride|[eé]lectrique)\s+(automatique|manuelle)/i);
  const fuelRaw = sentenceMatch
    ? sentenceMatch[1]
    : (mainText.match(/\b(Diesel|Essence|Hybride|Électrique|Electrique)\b/i)?.[1] || 'Diesel');
  const gearRaw = sentenceMatch
    ? sentenceMatch[2]
    : (mainText.match(/\b(Automatique|Manuelle)\b/i)?.[1] || 'Automatique');

  const fuelFr = /electr/i.test(fuelRaw) ? 'Électrique'
    : /hybr/i.test(fuelRaw) ? 'Hybride'
    : /essence/i.test(fuelRaw) ? 'Essence'
    : 'Diesel';
  const gearboxFr = /auto/i.test(gearRaw) ? 'Automatique' : 'Manuelle';

  const kmMatch = mainText.match(/([\d.]+\s*-\s*[\d.]+\s*km|Plus de\s*[\d.]+\s*km)/i);
  const mileage = kmMatch ? kmMatch[1].replace(/\./g, ',') : '';

  const doorsMatch = mainText.match(/(\d)\s*portes/i);
  const doors = doorsMatch ? doorsMatch[1] : '';

  const minDaysMatch = mainText.match(/Durée minimale(?:\s*de location)?\s*:?\s*(\d+)\s*jours?/i);
  const minDays = minDaysMatch ? parseInt(minDaysMatch[1], 10) : null;

  // Images — Pattern A: og:image-anchored, scoped to the listing gallery.
  const images = extractListingImages($, {
    cdnPattern: /supabase\.co\/.*\/images\/images\//i,
    gallerySelectors: [
      '[class*="gallery"]',
      '[class*="carousel"]',
      '[class*="slider"]',
      'main section'
    ],
    origin: 'https://www.goride.ma',
    maxCount: 8
  });

  const location = resolveLocationFromText(sourceUrl, mainText, hashString(id));

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: false, brand, model, year, mileage, fuelFr, gearboxFr, doors, minDays,
    title: fullTitle, location
  });

  const rawOptions = [];
  const unescapedHtml = html.replace(/\\"/g, '"');
  const carDetailsIdx = unescapedHtml.indexOf('"carDetails"');
  const carDetailsChunk = carDetailsIdx >= 0 ? unescapedHtml.slice(carDetailsIdx, carDetailsIdx + 3500) : '';

  if (/\ba[ée]roport\b/i.test(mainText) || /"airportPickup"\s*:\s*true/i.test(carDetailsChunk)) rawOptions.push('Livraison aéroport');
  if (/"isOnlinePayment"\s*:\s*true/i.test(carDetailsChunk)) rawOptions.push('Paiement en ligne');
  const litrageMatch = carDetailsChunk.match(/"litrage"\s*:\s*"([0-9.]+)"/i);
  if (litrageMatch && litrageMatch[1] && parseFloat(litrageMatch[1]) > 0) rawOptions.push(`Moteur ${litrageMatch[1]}L`);
  const colorMatch = carDetailsChunk.match(/"color"\s*:\s*"([^"]+)"/i);
  if (colorMatch && colorMatch[1] && !/^couleur$/i.test(colorMatch[1].trim())) {
    const firstColor = colorMatch[1].split(',')[0].trim();
    if (firstColor && firstColor.length < 25) rawOptions.push(`Couleur : ${firstColor}`);
  }
  const minAgeMatch = mainText.match(/Âge minimum du conducteur\s*(\d+)\s*ans/i) || carDetailsChunk.match(/"driverMinimumAge"\s*,\s*"value"\s*:\s*"(\d+)"/i);
  if (minAgeMatch && minAgeMatch[1]) rawOptions.push(`Âge min : ${minAgeMatch[1]} ans`);

  const goRideOptionPatterns = [
    { regex: /\bclimatisation\b/i, label: 'Climatisation' },
    { regex: /\bbluetooth\b/i, label: 'Bluetooth' },
    { regex: /\br[ée]gulateur\s+de\s+vitesse\b/i, label: 'Régulateur de vitesse' },
    { regex: /\bcam[ée]ra\s+de\s+recul\b/i, label: 'Caméra de recul' },
    { regex: /\bgps\b/i, label: 'GPS' },
    { regex: /\bcarplay\b/i, label: 'Apple CarPlay' },
    { regex: /\bandroid\s+auto\b/i, label: 'Android Auto' },
    { regex: /\bsi[èe]ges?\s+cuir\b/i, label: 'Sièges cuir' },
    { regex: /\btoit\s+(?:ouvrant|panoramique)\b/i, label: 'Toit panoramique' },
    { regex: /\bkilom[ée]trage\s+illimit[ée]\b/i, label: 'Kilométrage illimité' }
  ];
  for (const { regex, label } of goRideOptionPatterns) {
    if ((regex.test(mainText) || regex.test(carDetailsChunk)) && !rawOptions.includes(label)) rawOptions.push(label);
  }

  const options = rawOptions.map((opt) => ({ en: opt, ar: opt, raw: opt }));

  return {
    id, kind: 'Car', listingType: 'rental', priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price, quickFacts, features, options,
    images: images.slice(0, 8),
    sourceUrl, location
  };
}

/**
 * 2. Parse OneClickDrive.ma Car Rental Detail HTML
 */
export function parseOneClickDriveHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  let urlObj;
  try { urlObj = new URL(sourceUrl); } catch (_) { urlObj = null; }
  const rawId = (urlObj && urlObj.searchParams.get('id')) || Buffer.from(sourceUrl).toString('base64').slice(0, 10);
  const id = `ocd-${rawId}`;

  const waHref = $('a[href*="api.whatsapp.com"]').attr('href') || '';
  const waDecoded = safeDecodeUri(waHref);

  let rawTitle = $('h1').first().text().replace(/^Rent\s+/i, '').trim();
  const waCarMatch = waDecoded.match(/Car:\s*([^\n\r]+)/i);
  if (waCarMatch) rawTitle = cleanText(waCarMatch[1]);

  const yearMatch = rawTitle.match(/\b(20\d\d|19\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : '2024';
  const { brand, model, fullTitle } = splitBrandAndModel(rawTitle);

  let price = 0;
  const waPriceMatch = waDecoded.match(/Price:\s*MAD\s*([\d,]+)\s*\/\s*day/i);
  if (waPriceMatch) price = parseInt(waPriceMatch[1].replace(/[^\d]/g, ''), 10);
  if (!price) {
    const madMatches = [...html.matchAll(/MAD\s*([\d,]+)\s*(?:\/\s*day|per\s*day)/gi)];
    if (madMatches.length > 0) price = parseInt(madMatches[0][1].replace(/[^\d]/g, ''), 10);
  }
  if (!price) {
    const usdMatch = html.match(/USD\s*([\d,]+)\s*(?:[\d/]*\s*)?\/\s*day/i);
    if (usdMatch) price = Math.round((parseInt(usdMatch[1].replace(/[^\d]/g, ''), 10) * 9.8) / 10) * 10;
  }
  if (!price) {
    console.warn(`[OCD] No price parsed for ${sourceUrl}, skipping.`);
    return null;
  }

  // Images — Pattern A: og:image-anchored; upscales `_small.` variants.
  const images = extractListingImages($, {
    cdnPattern: /static\.oneclickdrive\.com\/uploads\/cars\//i,
    gallerySelectors: [
      '[class*="gallery"]',
      '[class*="carousel"]',
      '[class*="slider"]',
      '.car-images'
    ],
    origin: 'https://www.oneclickdrive.ma',
    maxCount: 8,
    upscale: [{ from: /_small\./g, to: '.' }]
  });

  const rawOptions = [];
  $('.new-specs-features li').each((_, el) => {
    const opt = cleanText($(el).text());
    if (opt && opt.length > 1 && opt.length < 55 && !rawOptions.includes(opt)) rawOptions.push(opt);
  });

  $('script, style, nav, header, footer').remove();
  const bodyText = cleanText($('body').text());

  if (rawOptions.length === 0) {
    const specBlock = bodyText.match(/Specifications:\s*([\s\S]*?)(?:Why hire|Requirements|Frequently|$)/i);
    if (specBlock) {
      const items = [...specBlock[1].matchAll(/\d+\.\s*([A-Za-z0-9\s/-]+?)(?=\s*\d+\.|$)/g)].map((m) => cleanText(m[1]));
      for (const it of items) {
        if (it && it.length > 1 && it.length < 55 && !rawOptions.includes(it)) rawOptions.push(it);
      }
    }
  }
  const fitsMatch = bodyText.match(/fits\s*(\d+)\s*passengers?(?:\s*and\s*(\d+)\s*[a-z-]*\s*bags?)?/i);
  if (fitsMatch) {
    if (fitsMatch[1]) {
      const pLabel = `${fitsMatch[1]} places`;
      if (!rawOptions.includes(pLabel)) rawOptions.push(pLabel);
    }
    if (fitsMatch[2]) {
      const bNum = parseInt(fitsMatch[2], 10);
      const bLabel = `${bNum} ${bNum === 1 ? 'bagage' : 'bagages'}`;
      if (!rawOptions.includes(bLabel)) rawOptions.push(bLabel);
    }
  }
  if ((/basic comprehensive insurance|Insurance included/i.test(bodyText)) && !rawOptions.includes('Assurance incluse')) rawOptions.push('Assurance incluse');
  if (/standard mileage limit of Unlimited/i.test(bodyText) && !rawOptions.includes('Kilométrage illimité')) {
    rawOptions.push('Kilométrage illimité');
  } else {
    const kmDayMatch = bodyText.match(/standard mileage limit of\s*(\d+)\s*km/i);
    if (kmDayMatch && kmDayMatch[1]) {
      const kmLabel = `${kmDayMatch[1]} km/jour inclus`;
      if (!rawOptions.includes(kmLabel)) rawOptions.push(kmLabel);
    }
  }
  if (/Free Delivery/i.test(bodyText) && !rawOptions.includes('Livraison gratuite')) rawOptions.push('Livraison gratuite');

  let fuelFr = 'Diesel';
  const fuelSpecMatch = bodyText.match(/Fuel Type\s+(Diesel|Petrol|Hybrid|Electric|Essence)/i);
  if (fuelSpecMatch) {
    const f = fuelSpecMatch[1].toLowerCase();
    if (f === 'electric') fuelFr = 'Électrique';
    else if (f === 'hybrid') fuelFr = 'Hybride';
    else if (f === 'petrol' || f === 'essence') fuelFr = 'Essence';
    else fuelFr = 'Diesel';
  } else if (/electric|e-tron|taycan|id\.\d|ev\b/i.test(fullTitle)) fuelFr = 'Électrique';
  else if (/hybrid|hybride|e-hybrid/i.test(fullTitle)) fuelFr = 'Hybride';

  const gearMatch = bodyText.match(/Gearbox\s+(Auto|Automatic|Manual)/i);
  const gearboxFr = gearMatch && /man/i.test(gearMatch[1]) ? 'Manuelle' : 'Automatique';

  const doorsMatch = bodyText.match(/No\.\s*of\s*Doors\s*(\d)/i) || bodyText.match(/This\s*(\d)\s*door/i);
  const doors = doorsMatch ? doorsMatch[1] : '';

  const minDaysMatch = bodyText.match(/Minimum\s*(\d+)\s*days?\s*rental/i);
  const minDays = minDaysMatch ? parseInt(minDaysMatch[1], 10) : null;

  const mileage = '';
  const location = resolveLocationFromText(sourceUrl, bodyText, hashString(id));

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: false, brand, model, year, mileage, fuelFr, gearboxFr, doors, minDays,
    title: fullTitle, location
  });

  const options = rawOptions.map((opt) => ({ en: opt, ar: opt, raw: opt }));

  return {
    id, kind: 'Car', listingType: 'rental', priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price, quickFacts, features, options, images, sourceUrl, location
  };
}

const EN_TO_FR_COLOR = {
  black: 'Noir', white: 'Blanc', gray: 'Gris', grey: 'Gris', silver: 'Argent',
  blue: 'Bleu', red: 'Rouge', green: 'Vert', brown: 'Marron', beige: 'Beige',
  gold: 'Or', yellow: 'Jaune', orange: 'Orange'
};

/**
 * 2b. Parse OneClickDrive.ma Paginated City/Category Catalog Cards
 *     Catalog cards are self-contained, so image extraction stays scoped
 *     to the card (no og:image anchoring needed).
 */
export function parseOneClickDriveCatalogHtml(html, pageUrl = '') {
  const $ = cheerio.load(html);
  const results = [];

  $('.alt-card--rent').each((_, cardEl) => {
    const $card = $(cardEl);
    const titleLink = $card.find('h3.alt-title a').first();
    const sourceUrl = (titleLink.attr('href') || '').trim();
    const lid = $card.find('.alt-cta').attr('data-lid') || (sourceUrl.match(/[?&]id=(\d+)/)?.[1] || '');
    if (!lid || !sourceUrl) return;

    const id = `ocd-${lid}`;
    const rawTitle = cleanText(titleLink.text());
    if (!rawTitle) return;

    const yearMatch = rawTitle.match(/\b(20\d\d|19\d\d)\b/);
    const year = yearMatch ? yearMatch[1] : '2024';
    const { brand, model, fullTitle } = splitBrandAndModel(rawTitle);

    let price = 0;
    const favOnchange = $card.find('input.alt-fav_input').attr('onchange') || '';
    const wishMatch = favOnchange.match(/wishlist\(\s*\d+\s*,\s*'[^']*'\s*,\s*(\d+)/i);
    if (wishMatch && wishMatch[1]) price = parseInt(wishMatch[1], 10);
    if (!price) {
      const waHref = $card.find('a.alt-btn--wa').attr('href') || '';
      const waDecoded = safeDecodeUri(waHref);
      const waPriceMatch = waDecoded.match(/Price:\s*MAD\s*([\d,]+)\s*\/\s*day/i);
      if (waPriceMatch) price = parseInt(waPriceMatch[1].replace(/[^\d]/g, ''), 10);
    }
    if (!price) {
      const priceNowText = cleanText($card.find('.alt-price_now').first().text());
      const usdMatch = priceNowText.match(/USD\s*([\d,]+)/i);
      const madMatch = priceNowText.match(/MAD\s*([\d,]+)/i);
      if (madMatch) price = parseInt(madMatch[1].replace(/[^\d]/g, ''), 10);
      else if (usdMatch) price = Math.round((parseInt(usdMatch[1].replace(/[^\d]/g, ''), 10) * 9.8) / 10) * 10;
    }
    if (!Number.isFinite(price) || price <= 0) return;

    const images = [];
    $card.find('.alt-slider_track img.alt-slide, figure.alt-media img').each((__, imgEl) => {
      const rawSrc = $(imgEl).attr('src') || $(imgEl).attr('data-defer-src') || '';
      if (rawSrc.includes('static.oneclickdrive.com/uploads/cars/')) {
        const hiRes = rawSrc.split('?')[0].replace('_small.', '.');
        if (!images.includes(hiRes)) images.push(hiRes);
      }
    });
    if (images.length === 0) return;

    let fuelFr = 'Diesel';
    let minDays = null;
    const rawOptions = [];

    $card.find('ul.alt-specs li').each((__, liEl) => {
      const txt = cleanText($(liEl).text());
      const lower = txt.toLowerCase();
      if (lower === 'diesel') fuelFr = 'Diesel';
      else if (lower === 'petrol' || lower === 'essence') fuelFr = 'Essence';
      else if (lower === 'hybrid') fuelFr = 'Hybride';
      else if (lower === 'electric') fuelFr = 'Électrique';
      else {
        const seatMatch = txt.match(/^(\d+)\s*seats?$/i);
        if (seatMatch) {
          const sLabel = `${seatMatch[1]} places`;
          if (!rawOptions.includes(sLabel)) rawOptions.push(sLabel);
        }
      }
    });

    if (/electric|e-tron|taycan|id\.\d|ev\b/i.test(fullTitle)) fuelFr = 'Électrique';
    else if (/hybrid|hybride|e-hybrid/i.test(fullTitle)) fuelFr = 'Hybride';

    $card.find('ul.alt-feats li').each((__, liEl) => {
      const txt = cleanText($(liEl).text());
      const minMatch = txt.match(/Min\.\s*(\d+)\s*days?\s*rental/i);
      if (minMatch) minDays = parseInt(minMatch[1], 10);
      else if (/^Free Delivery$/i.test(txt)) {
        if (!rawOptions.includes('Livraison gratuite')) rawOptions.push('Livraison gratuite');
      } else if (/^Insurance included$/i.test(txt)) {
        if (!rawOptions.includes('Assurance incluse')) rawOptions.push('Assurance incluse');
      } else if (txt && !/deposit/i.test(txt) && txt.length < 40 && !rawOptions.includes(txt)) {
        rawOptions.push(txt);
      }
    });

    const kmIncludedText = cleanText($card.find('.alt-price_km').first().text());
    if (/unlimited/i.test(kmIncludedText)) {
      if (!rawOptions.includes('Kilométrage illimité')) rawOptions.push('Kilométrage illimité');
    } else {
      const kmLimitMatch = kmIncludedText.match(/(\d+)\s*km/i);
      if (kmLimitMatch) {
        const kmLabel = `${kmLimitMatch[1]} km/jour inclus`;
        if (!rawOptions.includes(kmLabel)) rawOptions.push(kmLabel);
      }
    }

    const locPinText = cleanText($card.find('.alt-loc_t').text());
    if (/airport|aéroport/i.test(locPinText) && !rawOptions.includes('Livraison aéroport')) rawOptions.push('Livraison aéroport');

    const descText = cleanText($card.find('p.alt-desc').text());
    const firstWord = (descText.split(/[\s,]+/)[0] || '').toLowerCase();
    if (EN_TO_FR_COLOR[firstWord]) {
      const cLabel = `Couleur : ${EN_TO_FR_COLOR[firstWord]}`;
      if (!rawOptions.includes(cLabel)) rawOptions.push(cLabel);
    }

    const location = resolveLocationFromText(sourceUrl, `${locPinText} ${pageUrl}`, hashString(id));

    const { features, quickFacts } = buildRentalFeatures({
      isMoto: false, brand, model, year, mileage: '', fuelFr, gearboxFr: 'Automatique',
      doors: '4', minDays, title: fullTitle, location
    });

    results.push({
      id, kind: 'Car', listingType: 'rental', priceUnit: 'day',
      title: { en: fullTitle, ar: fullTitle },
      price, quickFacts, features,
      options: rawOptions.map((opt) => ({ en: opt, ar: opt, raw: opt })),
      images: images.slice(0, 8),
      sourceUrl, location
    });
  });

  return results;
}

/**
 * 3. Parse RentalMotoMarrakech.com Motorbike/Scooter Detail HTML
 */
export function parseRentalMotoMarrakechHtml(html, sourceUrl, fallbackImg = '') {
  const $ = cheerio.load(html);
  const slug = sourceUrl.split('/').filter(Boolean).pop() || 'moto';
  const id = `rmm-${slug}`;

  // Images — Pattern A: og:image-anchored. The fallbackImg from the fleet
  // listing page is appended only if the detail page yielded nothing.
  const galleryImages = extractListingImages($, {
    cdnPattern: /smartrental\.ma\/storage\//i,
    gallerySelectors: [
      '[class*="gallery"]',
      '[class*="slider"]',
      '[class*="carousel"]',
      '.images'
    ],
    origin: 'https://rentalmotomarrakech.com',
    maxCount: 4
  });
  const images = galleryImages.length > 0
    ? galleryImages
    : (fallbackImg ? [fallbackImg] : []);

  $('script, style, nav, header, footer').remove();
  const text = cleanText($('body').text());

  const brandMatch = text.match(/Brand\s+([A-Za-zÀ-ÿ0-9-]+)\s+Model\s+([A-Za-zÀ-ÿ0-9\s.-]+?)\s+Category/i);
  let rawTitle = brandMatch ? `${brandMatch[1]} ${brandMatch[2]}` : slug.replace(/-\d+$/, '').replace(/-/g, ' ');
  // Slugs lose the slash in "125/155" or "125/250" ("nmax-125155") -> restore it.
  rawTitle = rawTitle.replace(/(\d{3})(\d{3})$/, '$1/$2').replace(/\b(\d{3})\s*cc\b/i, '$1');
  const { brand, model, fullTitle } = splitBrandAndModel(rawTitle);

  let price = 0;
  const eurMatch = text.match(/([\d.,]+)\s*€\s*\/\s*Day/i);
  if (eurMatch) {
    const eur = parseFloat(eurMatch[1].replace(',', '.'));
    if (Number.isFinite(eur) && eur > 0) price = Math.round((eur * 10.8) / 10) * 10;
  }
  if (/vespa\s*primavera/i.test(fullTitle) && price > 600) price = 270;
  if (/sym\s*s\b|gabelli\s*verona/i.test(fullTitle) && price > 600) price = 220;
  if (!price) {
    console.warn(`[RMM] No price parsed for ${sourceUrl}, skipping.`);
    return null;
  }

  // The page's "Displacement" is identical for every bike (254 cc on all scooters): trust it only if it matches the name.
  const engineCc = reconcileEngineCc(fullTitle, (text.match(/Displacement\s*(\d+)\s*cc/i) || [])[1]);
  const isScooter = /scooter|vespa|agility|nmax|xmax|sym|neos|bws|stunt|verona/i.test(`${fullTitle} ${text}`);
  const gearboxFr = isScooter || /x-adv/i.test(fullTitle) ? 'Automatique' : 'Manuelle';

  const year = '2024';
  const mileage = '';
  const location = resolveLocationFromText('Marrakech', '', 0);

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: true, brand, model, year, mileage, fuelFr: 'Essence',
    gearboxFr, minDays: null, engineCc, title: fullTitle, location
  });

  const rawOptions = [];
  if (/A motorcycle lock is included/i.test(text)) rawOptions.push('Antivol inclus');
  if (/Roadside breakdown assistance/i.test(text)) rawOptions.push('Assistance routière');
  if (/Driver helmet is included/i.test(text)) rawOptions.push('Casque conducteur inclus');
  if (/Basic insurance is included/i.test(text)) rawOptions.push('Assurance de base incluse');
  if (/Optional passenger helmet[\s\S]{0,80}\+\s*0\.00\s*€/i.test(text)) rawOptions.push('Casque passager gratuit');

  const options = rawOptions.map((opt) => ({ en: opt, ar: opt, raw: opt }));

  return {
    id, kind: 'Moto', listingType: 'rental', priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price, quickFacts, features, options,
    images: images.slice(0, 4),
    sourceUrl, location
  };
}

/**
 * 4. Parse Location-Scooter-Marrakech.com Detail HTML
 */
export function parseLocationScooterMarrakechHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const slug = sourceUrl.split('/').filter(Boolean).pop() || 'scooter';
  const id = `lsm-${slug}`;

  // Images — Pattern A: og:image-anchored, replaces the previous
  // page-wide $('img') sweep that captured header/footer logo variants.
  const imgs = extractListingImages($, {
    cdnPattern: /location-scooter-marrakech\.com\/.*images\/data\//i,
    gallerySelectors: [
      '[class*="gallery"]',
      '[class*="slides"]',
      '[class*="carousel"]',
      'article'
    ],
    origin: 'https://location-scooter-marrakech.com',
    maxCount: 10
  });

  $('script, style, nav, header, footer').remove();
  const text = cleanText($('body').text());

  const hTitle = cleanText($('h1, h2').first().text()) || safeDecodeUri(slug).replace(/-/g, ' ');
  const { brand, model, fullTitle } = splitBrandAndModel(hTitle);

  let price = 0;
  const eurMatch = text.match(/(\d+)\s*€/i);
  if (eurMatch) price = Math.round((parseInt(eurMatch[1], 10) * 10.8) / 10) * 10;
  if (!price) {
    console.warn(`[LSM] No price parsed for ${sourceUrl}, skipping.`);
    return null;
  }

  const yearMatch = text.match(/Model:\s*(20\d\d)/i);
  const year = yearMatch ? yearMatch[1] : '2024';
  const location = resolveLocationFromText('Marrakech', '', 0);

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: true, brand, model, year, mileage: '', fuelFr: 'Essence',
    gearboxFr: 'Automatique',
    minDays: /2 to 4 Days/i.test(text) ? 2 : null,
    engineCc: /125/i.test(fullTitle) ? '125' : '50',
    title: fullTitle, location
  });

  const rawOptions = [];
  if (/Zero deductible insurance|Franchise 0/i.test(text)) rawOptions.push('Franchise 0 € (Zero deductible insurance)');
  if (/Collision Damage Waiver/i.test(text)) rawOptions.push('Collision Damage Waiver');
  if (/Anti-theft protection/i.test(text)) rawOptions.push('Anti-theft protection');

  return {
    id, kind: 'Moto', listingType: 'rental', priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price, quickFacts, features,
    options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
    images: imgs, sourceUrl, location
  };
}

/**
 * 4b. Parse XenoRide.ma Motorbike/Scooter Detail HTML (Tangier)
 */
export function parseXenoRideHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const slug = sourceUrl.split('/').filter(Boolean).pop() || 'moto';
  const id = `xenoride-${slug}`;

  // Images — Pattern A: og:image-anchored; Sanity URLs are upscaled.
  const imgs = extractListingImages($, {
    cdnPattern: /cdn\.sanity\.io\/images\//i,
    gallerySelectors: [
      '[class*="gallery"]',
      'figure',
      '[class*="slider"]',
      '[class*="carousel"]'
    ],
    origin: 'https://xenoride.ma',
    maxCount: 6,
    upscale: [
      { from: /&w=\d+&h=\d+/g, to: '&w=1200&h=900' }
    ]
  });

  const rawH1 = cleanText($('h1').first().text())
    .replace(/\s+[àa]\s+louer.*$/i, '')
    .replace(/\s+tanger$/i, '');
  const { brand, model, fullTitle } = splitBrandAndModel(rawH1 || slug.replace(/-/g, ' '));

  $('script, style, nav, header, footer').remove();
  const text = cleanText($('body').text());

  let price = 0;
  const madMatch = text.match(/(\d+)\s*MAD\s*\/\s*Jour/i);
  if (madMatch) price = parseInt(madMatch[1], 10);
  if (!price) {
    console.warn(`[XenoRide] No price parsed for ${sourceUrl}, skipping.`);
    return null;
  }

  const yearMatch = text.match(/Ann[eé]e\s*:?\s*(20\d\d)/i) || rawH1.match(/\b(20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : '2025';

  const kmMatch = text.match(/Kilom[eé]trage\s*:?\s*([\d.]+)\s*km/i);
  const mileage = kmMatch ? `${kmMatch[1].replace(/\./g, ',')} km` : '';

  const ccMatch = text.match(/(\d+)\s*cc/i);
  const engineCc = ccMatch ? ccMatch[1] : '50';
  const isManual = /manuelle/i.test(text) && !/automatique/i.test(text);
  const gearboxFr = isManual ? 'Manuelle' : 'Automatique';
  const location = resolveLocationFromText('Tanger', text, 0);

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: true, brand, model, year, mileage, fuelFr: 'Essence',
    gearboxFr, minDays: null, engineCc, title: fullTitle, location
  });

  const rawOptions = [];
  if (/Assurance incluse/i.test(text)) rawOptions.push('Assurance incluse');
  if (/2 casques inclus/i.test(text)) rawOptions.push('2 casques inclus');
  if (/Kilom[eé]trage illimit[eé]/i.test(text)) rawOptions.push('Kilométrage illimité');
  if (/Assistance 24\/7/i.test(text)) rawOptions.push('Assistance 24/7');
  if (/Support t[eé]l[eé]phone/i.test(text)) rawOptions.push('Support téléphone');
  if (/Top case/i.test(text)) rawOptions.push('Top case');

  return {
    id, kind: 'Moto', listingType: 'rental', priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price, quickFacts, features,
    options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
    images: imgs.slice(0, 6), sourceUrl, location
  };
}

/**
 * 4c. Parse MarrakechMoto.com Detail HTML (Marrakech)
 */
export function parseMarrakechMotoHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const slug = sourceUrl.split('/').filter(Boolean).pop() || 'moto';
  const id = `mmoto-${slug}`;

  // Images — Pattern A: og:image-anchored.
  const imgs = extractListingImages($, {
    cdnPattern: /supabase\.co\/.*\/motos\//i,
    gallerySelectors: [
      '[class*="gallery"]',
      '[class*="slider"]',
      'main article'
    ],
    origin: 'https://marrakechmoto.com',
    maxCount: 2
  });

  const rawH1 = cleanText($('h1').first().text()) || slug.replace(/-/g, ' ');
  const { brand, model, fullTitle } = splitBrandAndModel(rawH1);

  $('script, style, nav, header, footer').remove();
  const text = cleanText($('body').text());

  let price = 0;
  const eurMatch = text.match(/(\d+)\s*€\s*\/\s*jour/i);
  if (eurMatch) price = Math.round((parseInt(eurMatch[1], 10) * 10.8) / 10) * 10;
  if (!price) {
    console.warn(`[MarrakechMoto] No price parsed for ${sourceUrl}, skipping.`);
    return null;
  }

  const yearMatch = text.match(/Mod[eè]le\s*(20\d\d)/i);
  const year = yearMatch ? yearMatch[1] : '2025';

  // The first "NNN cc" on the page belongs to another bike (853 cc appeared on XT 250 / Himalayan 411 / F 750 GS).
  const engineCc = reconcileEngineCc(fullTitle, (text.match(/(\d{2,4})\s*cc/i) || [])[1]);
  const isScooter = /scooter|agility|50\b/i.test(fullTitle);
  const gearboxFr = isScooter ? 'Automatique' : 'Manuelle';
  const location = resolveLocationFromText('Marrakech', text, 0);

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: true, brand, model, year, mileage: '', fuelFr: 'Essence',
    gearboxFr, minDays: null, engineCc, title: fullTitle, location
  });

  const rawOptions = [];
  if (/Top case aluminium/i.test(text)) rawOptions.push('Top case aluminium');
  if (/Valises lat[eé]rales/i.test(text)) rawOptions.push('Valises latérales');
  if (/Support t[eé]l[eé]phone/i.test(text)) rawOptions.push('Support téléphone + USB');
  if (/Casque\s*&\s*gants/i.test(text)) rawOptions.push('Casque & gants');
  if (/Assurance RC incluse/i.test(text)) rawOptions.push('Assurance RC incluse');
  if (/Assistance 24h\/24/i.test(text)) rawOptions.push('Assistance 24h/24');

  return {
    id, kind: 'Moto', listingType: 'rental', priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price, quickFacts, features,
    options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
    images: imgs.slice(0, 2), sourceUrl, location
  };
}

/**
 * 4d. Parse Ride2Atlas.com Detail HTML (Marrakech)
 */
export function parseRide2AtlasHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const slug = sourceUrl.split('/').filter(Boolean).pop() || 'moto';
  const id = `r2a-${slug}`;

  // Images — Pattern A: og:image-anchored.
  const imgs = extractListingImages($, {
    cdnPattern: /ride2atlas\.com\/wp-content\/uploads\//i,
    gallerySelectors: [
      '.elementor-image-carousel',
      '.swiper-slide',
      '.wp-block-gallery',
      'figure'
    ],
    origin: 'https://ride2atlas.com',
    maxCount: 2
  });

  // The first <h2> on these pages is the generic section heading "motos" (every listing was titled "motos"),
  // so build the name from the heading only when it looks like a model, otherwise from the URL slug.
  const slugWords = slug.replace(/^location-/i, '').replace(/-marrakech$/i, '').replace(/-/g, ' ').trim();
  const looksLikeModel = (t) => t && t.length >= 5 && t.length < 60 && !/^(motos?|scooters?|location|nos|our)\b/i.test(t) &&
    slugWords.toLowerCase().split(' ').some((w) => w.length > 2 && t.toLowerCase().includes(w));
  const headingCandidates = [$('h1').first().text(), $('meta[property="og:title"]').attr('content') || '', $('h2').first().text()]
    .map((t) => cleanText(t).replace(/^location\s+(?:de\s+)?(?:moto|scooter)?\s*/i, '').replace(/\s*(?:\u00e0|a|in)?\s*marrakech.*$/i, '').trim());
  const rawH2 = headingCandidates.find(looksLikeModel) || slugWords.replace(/\b(\w)/g, (m) => m.toUpperCase());
  const { brand, model, fullTitle } = splitBrandAndModel(rawH2);

  $('script, style, nav, header, footer').remove();
  const text = cleanText($('body').text());

  let price = 0;
  // Ride2Atlas is a WooCommerce site: the price is shown as "€25.00" (symbol FIRST) and the deposit as
  // "Deposit: 100€". The old "NN €" pattern therefore picked the deposit, and later the tail of a
  // neighbouring bike's NAME in the "similar bikes" list ("Himalayan 450 €85.00" -> 450 EUR = 4860 MAD).
  // Order of trust: JSON-LD offer price -> the "€NN.NN" right after this page's own heading -> "NN €/jour".
  let eurValue = 0;
  const ld = html.match(/"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?\s*,\s*"priceCurrency"\s*:\s*"EUR"/i);
  if (ld) eurValue = Math.round(parseFloat(ld[1].replace(',', '.')));
  if (!eurValue) {
    const heading = cleanText($('h1').first().text());
    const at = heading ? text.indexOf(heading) : -1;
    const afterHeading = at >= 0 ? text.slice(at + heading.length, at + heading.length + 80) : '';
    const sym = afterHeading.match(/€\s*(\d+(?:[.,]\d+)?)/);
    if (sym) eurValue = Math.round(parseFloat(sym[1].replace(',', '.')));
  }
  if (!eurValue) {
    const perDay = text.match(/(\d+)\s*€\s*\/\s*(?:jour|day)/i);
    if (perDay) eurValue = parseInt(perDay[1], 10);
  }
  if (eurValue) price = Math.round((eurValue * 10.8) / 10) * 10;
  if (!price) {
    console.warn(`[Ride2Atlas] No price parsed for ${sourceUrl}, skipping.`);
    return null;
  }
  if (price > 500 && /\b(50|110|125)\s*(cc)?\b|cappuccino|agility|symphony/i.test(`${fullTitle} ${slug}`)) {
    console.warn(`[Ride2Atlas] Implausible price ${price} MAD/day for small scooter ${sourceUrl}, skipping.`);
    return null;
  }

  const engineCc = engineCcFromTitle(fullTitle) || engineCcFromTitle(slug);
  const isScooter = /scooter|cappuccino|agility|symphony/i.test(fullTitle) || /scooter/i.test(slug);
  const gearboxFr = isScooter ? 'Automatique' : 'Manuelle';
  const location = resolveLocationFromText('Marrakech', text, 0);

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: true, brand, model, year: '2024', mileage: '', fuelFr: 'Essence',
    gearboxFr, minDays: null, engineCc, title: fullTitle, location
  });

  const rawOptions = [];
  if (/Assurance incluse/i.test(text)) rawOptions.push('Assurance incluse');
  if (/Casque et gants inclus/i.test(text)) rawOptions.push('Casque et gants inclus');
  if (/Kilom[eé]trage illimit[eé]/i.test(text)) rawOptions.push('Kilométrage illimité');
  if (/Assistance 24\/7/i.test(text)) rawOptions.push('Assistance 24/7');

  return {
    id, kind: 'Moto', listingType: 'rental', priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price, quickFacts, features,
    options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
    images: imgs.slice(0, 2), sourceUrl, location
  };
}

/**
 * 4e. Parse Keni-Rides.com Detail HTML (Kénitra / National)
 */
export function parseKeniRidesHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const slug = sourceUrl.split('/').filter(Boolean).pop() || 'moto';
  const id = `keni-${slug}`;

  // Images — Pattern A: og:image-anchored.
  const imgs = extractListingImages($, {
    cdnPattern: /keni-rides\.com\/bikes\//i,
    gallerySelectors: [
      '[class*="gallery"]',
      '[class*="slider"]',
      'article',
      '.content'
    ],
    origin: 'https://keni-rides.com',
    maxCount: 4
  });

  const rawH1 = cleanText($('h1').first().text()) || slug.replace(/-/g, ' ');
  const { brand, model, fullTitle } = splitBrandAndModel(rawH1);

  $('script, style, nav, header, footer').remove();
  const text = cleanText($('body').text());

  let price = 0;
  const eurMatch = text.match(/€\s*(\d+)\s*\/\s*day/i) || text.match(/Tarif journalier\s*€\s*(\d+)/i);
  if (eurMatch) price = Math.round((parseInt(eurMatch[1], 10) * 10.8) / 10) * 10;
  if (!price) {
    console.warn(`[KeniRides] No price parsed for ${sourceUrl}, skipping.`);
    return null;
  }

  const ccMatch = text.match(/Cylindr[eé]e\s*([\d\s]+)\s*cc/i);
  const engineCc = ccMatch ? ccMatch[1].replace(/\s+/g, '') : '';
  const minDaysMatch = text.match(/Location minimale\s*:\s*(\d+)\s*jours/i);
  const minDays = minDaysMatch ? parseInt(minDaysMatch[1], 10) : 2;
  const location = resolveLocationFromText('Kénitra', text, 0);

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: true, brand, model, year: '2024', mileage: '', fuelFr: 'Essence',
    gearboxFr: 'Manuelle', minDays, engineCc, title: fullTitle, location
  });

  const rawOptions = [];
  if (/Top case & valises aluminium/i.test(text)) rawOptions.push('Top case & valises aluminium');
  if (/Barres de protection moteur/i.test(text)) rawOptions.push('Barres de protection moteur');
  if (/Pare-brise touring r[eé]glable/i.test(text)) rawOptions.push('Pare-brise touring réglable');
  if (/Prise 12V & USB/i.test(text)) rawOptions.push('Prise 12V & USB');
  if (/Poign[eé]es chauffantes/i.test(text)) rawOptions.push('Poignées chauffantes');
  if (/Feux additionnels LED/i.test(text)) rawOptions.push('Feux additionnels LED');

  return {
    id, kind: 'Moto', listingType: 'rental', priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price, quickFacts, features,
    options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
    images: imgs.slice(0, 4), sourceUrl, location
  };
}

/**
 * 5. Generic rental URL dispatcher. Parsers may return null to signal
 *    "no trustworthy price" — the caller then skips the record.
 */
export async function importRentalListing(url, delayMs = DEFAULT_DELAY_MS, meta = {}) {
  const actualDelay = Math.max(MIN_DELAY_MS, delayMs);
  console.log(`[Rental Importer] Fetching public rental listing: ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
    }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${url}`);

  const html = await response.text();
  let listing = null;

  if (url.includes('goride.ma')) listing = parseGoRideHtml(html, url);
  else if (url.includes('oneclickdrive.ma')) listing = parseOneClickDriveHtml(html, url);
  else if (url.includes('rentalmotomarrakech.com')) listing = parseRentalMotoMarrakechHtml(html, url, meta.fallbackImg);
  else if (url.includes('location-scooter-marrakech.com')) listing = parseLocationScooterMarrakechHtml(html, url);
  else if (url.includes('xenoride.ma')) listing = parseXenoRideHtml(html, url);
  else if (url.includes('marrakechmoto.com')) listing = parseMarrakechMotoHtml(html, url);
  else if (url.includes('ride2atlas.com')) listing = parseRide2AtlasHtml(html, url);
  else if (url.includes('keni-rides.com')) listing = parseKeniRidesHtml(html, url);

  if (actualDelay > 0) await sleep(actualDelay);
  return listing;
}

/**
 * Cross-city de-duplication.
 * Some sources list the same physical vehicle under several cities:
 *  - OneClickDrive repeats each car on every city page (different listing id each time)
 *  - OXBikers publishes one fleet page per agency city (same bike, city-specific price)
 * We keep ONE listing per vehicle. When a vehicle is offered in several cities we keep
 * the copy in the city that currently has the fewest listings of that kind, so cities with
 * few vehicles (especially motos) get filled first. Cars and motos are balanced separately.
 * Idempotent: running it on an already de-duplicated list changes nothing.
 */
const CROSS_CITY_MOTO_SOURCES = new Set(['oxbikers']);

function crossCityKey(x) {
  const title = String((x.title && x.title.en) || '').trim().toLowerCase();
  if (x.kind === 'Car') {
    return ['Car', title, x.price, (x.images && x.images[0]) || x.sourceUrl || x.id].join('|');
  }
  const source = String(x.id || '').split('-')[0];
  if (CROSS_CITY_MOTO_SOURCES.has(source)) return ['Moto', source, title].join('|');
  return ['Moto', 'id', x.id].join('|'); // other moto sources are already one-per-bike
}

export function dedupeAcrossCities(list) {
  const groups = new Map();
  for (const x of list) {
    const k = crossCityKey(x);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  }

  const loads = { Car: new Map(), Moto: new Map() };
  const chosen = new Set();
  // Single-city vehicles are fixed first; vehicles with more choices fill the emptiest cities.
  const ordered = [...groups.values()].sort((a, b) => a.length - b.length);
  for (const group of ordered) {
    const load = loads[group[0].kind] || (loads[group[0].kind] = new Map());
    const cityOf = (v) => (v.location && v.location.city) || '';
    let best = group[0];
    for (const cand of group) {
      if ((load.get(cityOf(cand)) || 0) < (load.get(cityOf(best)) || 0)) best = cand;
    }
    chosen.add(best);
    load.set(cityOf(best), (load.get(cityOf(best)) || 0) + 1);
  }

  return list.filter((x) => chosen.has(x));
}

export function syncRentalFiles(rawList, dataDir = path.resolve(process.cwd(), 'data')) {
  const rentalsList = dedupeAcrossCities(rawList);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'rentals.imported.json'), JSON.stringify(rentalsList, null, 2), 'utf-8');
  fs.writeFileSync(
    path.join(dataDir, 'rentals.data.js'),
    `// Automatically exported verified Moroccan rental listings for server and edge runtimes\nexport const DEFAULT_RENTAL_LISTINGS = ${JSON.stringify(rentalsList, null, 2)};\n`,
    'utf-8'
  );
  fs.writeFileSync(
    path.join(dataDir, 'rentals.demo.js'),
    `/*\n * Real verified Moroccan rental vehicle listings (daily rates in MAD/day).\n * Used for instant client-side rendering and static/fallback operation.\n */\nwindow.DEMO_RENTAL_LISTINGS = ${JSON.stringify(rentalsList, null, 2)};\n`,
    'utf-8'
  );
  fs.writeFileSync(path.join(dataDir, 'rentals.demo.json'), JSON.stringify(rentalsList, null, 2), 'utf-8');
}

/**
 * 5b. Parse an OXBikers.com city fleet page (https://oxbikers.com/fr/motorbikes/<Agency>)
 *     One card per bike: image, <h2> title, "À partir de €NN" price, description, included gear.
 *     Prices are indicative EUR/day and differ per agency city; converted to MAD like the other
 *     EUR sources. OXBikers publishes no model year, so Year is intentionally left out.
 *     Cards are located from their <h2> (not from CSS class names) so small template changes
 *     on the site do not break the parser.
 */
export function parseOxBikersCityHtml(html, pageUrl, cityName) {
  const $ = cheerio.load(html);
  const location = resolveLocationFromText(cityName, '', 0);
  const citySlug = cleanText(cityName).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  const PRICE_RE = /(?:À\s*partir\s*de|A\s*partir\s*de|From|Desde|Ab)\s*€\s*([\d.,]+)/i;
  const PRICE_FALLBACK_RE = /([\d.,]+)\s*€/;
  const results = [];
  const seenTitles = new Set();

  $('h2').each((_, h2El) => {
    const rawTitle = cleanText($(h2El).text());
    if (!rawTitle || rawTitle.length > 60) return;

    // Climb from the heading to the smallest ancestor that has the price (and an image),
    // stopping before it would swallow a second heading (= the whole grid).
    let node = $(h2El);
    let card = null;
    for (let depth = 0; depth < 8; depth++) {
      const parent = node.parent();
      if (!parent.length || parent.find('h2').length > 1) break;
      node = parent;
      if (PRICE_RE.test(node.text()) || PRICE_FALLBACK_RE.test(node.text())) {
        card = node;
        if (node.find('img').length) break;
      }
    }
    if (!card) return;

    const cardText = card.text();
    const priceMatch = cardText.match(PRICE_RE) || cardText.match(PRICE_FALLBACK_RE);
    const eur = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : NaN;
    if (!Number.isFinite(eur) || eur <= 0) return;
    const price = Math.round((eur * 10.8) / 10) * 10;

    // "Suzuki dr 650" -> "Suzuki DR 650"
    const title = rawTitle.replace(/\s+/g, ' ').replace(/\bdr\s?(\d)/i, 'DR $1');
    const titleKey = title.toLowerCase();
    if (seenTitles.has(titleKey)) return;
    seenTitles.add(titleKey);

    const imgCandidates = [];
    card.find('img').each((__, imgEl) => {
      // Lazy-loaded images keep a placeholder in `src`, so check the data-* attributes first.
      const src = [$(imgEl).attr('data-src'), $(imgEl).attr('data-lazy-src'), $(imgEl).attr('src')]
        .find((v) => v && !/loader|logo|drapo|\.gif(\?|$)|^data:/i.test(v));
      if (!src) return;
      try { imgCandidates.push(new URL(src, pageUrl).href); } catch (_) { /* ignore bad src */ }
    });
    const images = [...new Set(imgCandidates)].slice(0, 4);
    if (!images.length) return;

    const descs = card.find('p').map((__, el) => cleanText($(el).text())).get()
      .filter((t) => t && !/permis|qt[eé]\b/i.test(t));
    const desc = descs.sort((a, b) => b.length - a.length)[0] || '';

    const ccDesc = desc.match(/(\d[\d\s\u00a0]*)\s*cm\s*[³3]/i);
    const ccTitle = title.match(/(\d{3,4})/);
    let engineCc = ccDesc ? ccDesc[1].replace(/[\s\u00a0]/g, '') : (ccTitle ? ccTitle[1] : '');
    if (!(Number(engineCc) >= 50 && Number(engineCc) <= 2000)) engineCc = '';

    const rawOptions = [];
    card.find('li').each((__, liEl) => {
      const t = cleanText($(liEl).text());
      if (t && t.length > 1 && t.length < 40 && !rawOptions.includes(t)) rawOptions.push(t);
    });

    const { brand, model, fullTitle } = splitBrandAndModel(title);
    const { features, quickFacts } = buildRentalFeatures({
      isMoto: true, brand, model, year: '', mileage: '', fuelFr: 'Essence',
      gearboxFr: 'Manuelle', minDays: null, engineCc, title: fullTitle, location
    });

    const modelSlug = fullTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    results.push({
      id: `oxbikers-${modelSlug}-${citySlug}`,
      kind: 'Moto', listingType: 'rental', priceUnit: 'day',
      title: { en: fullTitle, ar: fullTitle },
      price, quickFacts, features,
      options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
      images,
      sourceUrl: `${pageUrl.split('#')[0]}#${modelSlug}`,
      location
    });
  });

  return results;
}

// OXBikers agencies -> city name understood by resolveLocationFromText.
// Ouarzazate-Zagora is left out on purpose: add it once MOROCCAN_CITIES knows Ouarzazate.
const OXBIKERS_AGENCIES = [
  { page: 'Marrakech', city: 'Marrakech' },
  { page: 'Rabat', city: 'Rabat' },
  { page: 'Fes', city: 'Fès' },
  { page: 'Tanger-Tetouan-Elhoceima', city: 'Tanger' },
  { page: 'Agadir-Essaouira', city: 'Agadir' },
  { page: 'Casablanca-Mohammedia', city: 'Casablanca' }
];

export async function crawlOxBikersFleet(delayMs = DEFAULT_DELAY_MS) {
  const results = [];
  for (const { page, city } of OXBIKERS_AGENCIES) {
    const url = `https://oxbikers.com/fr/motorbikes/${page}`;
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html', 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' }
      });
      if (!r.ok) { console.warn(`[OXBikers] HTTP ${r.status} for ${url}`); continue; }
      const bikes = parseOxBikersCityHtml(await r.text(), url, city);
      console.log(`[OXBikers] ${city}: ${bikes.length} bikes`);
      results.push(...bikes);
    } catch (err) {
      console.warn(`[OXBikers] ${url}: ${err.message}`);
    }
    await sleep(Math.max(MIN_DELAY_MS, delayMs));
  }
  // The same bike appears on several agency pages; syncRentalFiles keeps one city per bike.
  return results;
}

/**
 * 6. Extract MotoNomad.ma Motorcycle & Scooter Fleet (structured JSON)
 */
export async function crawlMotoNomadFleet() {
  const results = [];
  try {
    const res = await fetch('https://motonomad.ma/motorcycle-rental-list/', {
      headers: { 'User-Agent': USER_AGENT }
    });
    if (!res.ok) return results;
    const html = await res.text();

    const jsonStr = extractBalancedObject(html, 'var mbpFront =');
    if (!jsonStr) return results;
    let parsed;
    try { parsed = JSON.parse(jsonStr); } catch (_) { return results; }

    const bikes = Array.isArray(parsed.bikes) ? parsed.bikes : [];
    const optionCatalog = new Map(
      (Array.isArray(parsed.options) ? parsed.options : []).map((o) => [Number(o.id), cleanText(o.name)])
    );

    const mnLocations = [
      resolveLocationFromText('Casablanca', '', 0),
      resolveLocationFromText('Rabat', '', 1),
      resolveLocationFromText('Tanger', '', 2),
      resolveLocationFromText('Fès', '', 3)
    ];

    for (let i = 0; i < bikes.length; i++) {
      const b = bikes[i];
      if (!b || !b.name || !b.image_url) continue;
      if (b.image_url.includes('Logo') || b.image_url.includes('LOGO')) continue;

      const rawDailyMad = b.tiers && b.tiers[0] && b.tiers[0].price ? Number(b.tiers[0].price) : Number(b.price_min);
      if (!Number.isFinite(rawDailyMad) || rawDailyMad <= 0) continue;
      const price = Math.round(rawDailyMad / 10) * 10;

      const yearMatch = b.name.match(/\b(20\d\d)\b/) || String(b.year || '').match(/\b(20\d\d)\b/);
      const year = yearMatch ? yearMatch[1] : '2025';
      const { brand, model, fullTitle } = splitBrandAndModel(b.name);
      const engineCc = reconcileEngineCc(b.name, b.engine, { trustScrapedWithoutTitle: true });
      const isScooter = /scooter|agility|fiddle|orbit|frappuccino|oxwin|50cc|125/i.test(`${b.name} ${b.category} ${engineCc}`);
      const gearboxFr = isScooter ? 'Automatique' : 'Manuelle';
      const loc = mnLocations[i % mnLocations.length];

      const { features, quickFacts } = buildRentalFeatures({
        isMoto: true, brand, model, year, mileage: '',
        fuelFr: /oxwin|es1/i.test(b.name) ? 'Électrique' : 'Essence',
        gearboxFr, minDays: b.min_days || null, engineCc, title: fullTitle, location: loc
      });

      const rawOptions = Array.isArray(b.free_options)
        ? b.free_options.map((idNum) => optionCatalog.get(Number(idNum))).filter(Boolean)
        : [];

      const sourceUrl = `https://motonomad.ma/motorcycle-rental-list/#bike-${b.id}`;
      results.push({
        id: `motonomad-${b.id}`,
        kind: 'Moto', listingType: 'rental', priceUnit: 'day',
        title: { en: fullTitle, ar: fullTitle },
        price, quickFacts, features,
        options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
        images: [b.image_url], sourceUrl, location: loc
      });
    }
  } catch (err) {
    console.warn('[Rental Importer] MotoNomad crawl warning:', err.message);
  }
  return results;
}

export async function main() {
  const args = process.argv.slice(2);
  let urls = [];
  let outFile = 'data/rentals.imported.json';
  let delayMs = DEFAULT_DELAY_MS;
  let isDryRun = false;
  let isCrawlMode = false;
  let crawlLimit = 1250;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--crawl') isCrawlMode = true;
    else if (args[i] === '--limit' && args[i + 1]) crawlLimit = parseInt(args[++i], 10) || 1250;
    else if (args[i] === '--file' && args[i + 1]) {
      const filePath = args[++i];
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        urls.push(...fileContent.split('\n').map((u) => u.trim()).filter(Boolean));
      } else {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }
    } else if (args[i] === '--out' && args[i + 1]) outFile = args[++i];
    else if (args[i] === '--delay' && args[i + 1]) delayMs = Math.max(MIN_DELAY_MS, parseInt(args[++i], 10) || DEFAULT_DELAY_MS);
    else if (args[i] === '--dry-run') isDryRun = true;
    else if (args[i].startsWith('http')) urls.push(args[i]);
  }

  if (urls.length === 0 && !isCrawlMode) {
    console.log(`
RwidaGuessr - Conservative Moroccan Vehicle Rental Importer

Specialized Moroccan rental websites supported:
  - GoRide.ma (https://www.goride.ma)
  - OneClickDrive.ma (https://www.oneclickdrive.ma)
  - RentalMotoMarrakech.com (https://rentalmotomarrakech.com/parke)
  - MotoNomad.ma (https://motonomad.ma/motorcycle-rental-list/)
  - OXBikers.com (https://oxbikers.com/fr/motorbikes)
  - Location-Scooter-Marrakech.com (https://location-scooter-marrakech.com/rental)

Usage:
  node scripts/import-rentals.js <url1> [url2] ...
  node scripts/import-rentals.js --file rental-urls.txt [--out data/rentals.imported.json] [--delay 1500]
  node scripts/import-rentals.js --crawl [--limit 350] [--out data/rentals.imported.json] [--delay 1500]
`);
    return;
  }

  const resolvedOut = path.resolve(process.cwd(), outFile);
  let existingListings = [];
  if (fs.existsSync(resolvedOut)) {
    try {
      existingListings = JSON.parse(fs.readFileSync(resolvedOut, 'utf-8'));
      if (!Array.isArray(existingListings)) existingListings = [];
    } catch (_) { existingListings = []; }
  }

  const seenIds = new Set(existingListings.map((x) => x.id));
  const seenUrls = new Set(existingListings.map((x) => x.sourceUrl));
  const currentList = [...existingListings];

  // --limit caps UNIQUE CARS only. Motorbikes are never counted against it, so
  // car listings can no longer crowd the moto sources out of the run.
  const isCarUrl = (u) => /goride\.ma|oneclickdrive\.ma/i.test(u);
  const uniqueCarCount = () => dedupeAcrossCities(currentList).filter((x) => x.kind === 'Car').length;

  const rmmImageMap = new Map();

  if (isCrawlMode) {
    console.log(`[Rental Crawler] Discovering Moroccan rental listings up to target ${crawlLimit}...`);

    // 1. GoRide.ma sitemap
    try {
      const smRes = await fetch('https://www.goride.ma/sitemap.xml', { headers: { 'User-Agent': USER_AGENT } });
      if (smRes.ok) {
        const smText = await smRes.text();
        const smUrls = [...smText.matchAll(/<loc>(.*?)<\/loc>/g)]
          .map((m) => m[1])
          .filter((u) => u.includes('?id=') && !u.includes('/en/') && !u.includes('/ar/'));
        for (const u of smUrls) if (!seenUrls.has(u) && !urls.includes(u)) urls.push(u);
        console.log(`[Rental Crawler] Queued ${smUrls.length} car rental URLs from GoRide.ma`);
      }
    } catch (e) {
      console.warn('[Rental Crawler] GoRide sitemap error:', e.message);
    }

    // 2. OneClickDrive.ma catalogs
    const ocdCities = [
      { slug: 'casablanca', maxPages: 12 }, { slug: 'marrakech', maxPages: 10 },
      { slug: 'rabat', maxPages: 7 }, { slug: 'tangier', maxPages: 7 },
      { slug: 'agadir', maxPages: 7 }, { slug: 'fes', maxPages: 6 },
      { slug: 'nador', maxPages: 4 }, { slug: 'oujda', maxPages: 4 }
    ];
    const ocdCatalogUrls = [];
    for (const { slug, maxPages } of ocdCities) {
      for (let p = 1; p <= maxPages; p++) {
        ocdCatalogUrls.push(p === 1 ? `https://www.oneclickdrive.ma/${slug}` : `https://www.oneclickdrive.ma/${slug}?page=${p}`);
      }
    }
    ocdCatalogUrls.push(
      'https://www.oneclickdrive.ma/casablanca/electric-car-rental',
      'https://www.oneclickdrive.ma/casablanca/hybrid-car-rental',
      'https://www.oneclickdrive.ma/marrakech/electric-car-rental',
      'https://www.oneclickdrive.ma/marrakech/hybrid-car-rental',
      'https://www.oneclickdrive.ma/rabat/hybrid-car-rental',
      'https://www.oneclickdrive.ma/tangier/hybrid-car-rental'
    );

    let ocdDirectAdded = 0;
    const OCD_BATCH = delayMs <= 300 ? 3 : 1;
    for (let i = 0; i < ocdCatalogUrls.length && uniqueCarCount() < crawlLimit; i += OCD_BATCH) {
      const batchPages = ocdCatalogUrls.slice(i, i + OCD_BATCH);
      const pageCardsList = await Promise.all(
        batchPages.map(async (pUrl) => {
          try {
            const r = await fetch(pUrl, { headers: { 'User-Agent': USER_AGENT } });
            if (!r.ok) return [];
            const h = await r.text();
            return parseOneClickDriveCatalogHtml(h, pUrl);
          } catch (_) { return []; }
        })
      );
      for (const cards of pageCardsList) {
        for (const item of cards) {
          if (item && item.price > 0 && item.images && item.images.length > 0 &&
              !seenIds.has(item.id) && !seenUrls.has(item.sourceUrl)) {
            currentList.push(item);
            seenIds.add(item.id);
            seenUrls.add(item.sourceUrl);
            ocdDirectAdded++;
          }
        }
      }
      if (!isDryRun && ocdDirectAdded > 0 && i % 12 === 0) syncRentalFiles(currentList, path.dirname(resolvedOut));
      if (OCD_BATCH > 1) await sleep(delayMs);
    }
    console.log(`[Rental Crawler] Imported ${ocdDirectAdded} new car rental listings from OneClickDrive.ma catalogs (total: ${currentList.length})`);

    // 3. RentalMotoMarrakech.com
    try {
      const rmmRes = await fetch('https://rentalmotomarrakech.com/parke', { headers: { 'User-Agent': USER_AGENT } });
      if (rmmRes.ok) {
        const rmmHtml = await rmmRes.text();
        const $r = cheerio.load(rmmHtml);
        $r('img[src*="smartrental"]').each((_, imgEl) => {
          const src = $r(imgEl).attr('src');
          let parent = $r(imgEl).parent();
          while (parent.length && parent.find('a[href*="/parke/"]').length === 0) parent = parent.parent();
          const href = parent.find('a[href*="/parke/"]').first().attr('href');
          if (href && src) {
            rmmImageMap.set(href, src);
            if (!seenUrls.has(href) && !urls.includes(href)) urls.push(href);
          }
        });
        console.log(`[Rental Crawler] Queued ${rmmImageMap.size} motorbike rental URLs from RentalMotoMarrakech.com`);
      }
    } catch (_) {}

    // 4. Location-Scooter-Marrakech.com
    try {
      const lsmRes = await fetch('https://location-scooter-marrakech.com/rental', { headers: { 'User-Agent': USER_AGENT } });
      if (lsmRes.ok) {
        const lsmHtml = await lsmRes.text();
        const $l = cheerio.load(lsmHtml);
        let lsmAdded = 0;
        $l('a[href*="moto-details"]').each((_, el) => {
          const href = $l(el).attr('href');
          if (href && !seenUrls.has(href) && !urls.includes(href)) { urls.push(href); lsmAdded++; }
        });
        console.log(`[Rental Crawler] Queued ${lsmAdded} scooter rental URLs from Location-Scooter-Marrakech.com`);
      }
    } catch (_) {}

    const xenoUrls = [
      'https://xenoride.ma/motos/cooper-touring-pro-a-louer',
      'https://xenoride.ma/motos/scooter-cappuccino-s-2025-a-louer-tanger',
      'https://xenoride.ma/motos/sh-cooper-a-louer',
      'https://xenoride.ma/motos/magotti-vespucci',
      'https://xenoride.ma/motos/sanya-x1000',
      'https://xenoride.ma/motos/honda-sh-mode',
      'https://xenoride.ma/motos/location-scooter-sh-daytona-sport-tanger'
    ];
    const mmotoUrls = [
      'https://marrakechmoto.com/motos/bmw-1250-gs', 'https://marrakechmoto.com/motos/bmw-850-gs',
      'https://marrakechmoto.com/motos/bmw-750-gs', 'https://marrakechmoto.com/motos/himalayan-450',
      'https://marrakechmoto.com/motos/himalayan-411', 'https://marrakechmoto.com/motos/kymco-agility-50',
      'https://marrakechmoto.com/motos/yamaha-xt-250', 'https://marrakechmoto.com/motos/bmw-f900-gs',
      'https://marrakechmoto.com/motos/bmw-f800-gs', 'https://marrakechmoto.com/motos/bmw-r1300-gs'
    ];
    const r2aUrls = [
      'https://ride2atlas.com/moto/location-cf-moto-mt450-marrakech/',
      'https://ride2atlas.com/moto/location-bmw-310-gs-marrakech/',
      'https://ride2atlas.com/moto/location-bmw-f-800-gs-marrakech/',
      'https://ride2atlas.com/moto/location-scooter-cappuccino-50cc-marrakech/',
      'https://ride2atlas.com/moto/location-ktm-390-adventure-marrakech/',
      'https://ride2atlas.com/moto/location-scooter-kymco-agility-marrakech/',
      'https://ride2atlas.com/moto/location-scooter-sym-symphony-marrakech/',
      'https://ride2atlas.com/moto/location-bmw-850-gs-marrakech/',
      'https://ride2atlas.com/moto/location-royal-enfield-himalayan-411-marrakech/',
      'https://ride2atlas.com/moto/location-royal-enfield-himalayan-450-marrakech/'
    ];
    const keniUrls = [
      'https://keni-rides.com/nos-motos/bmw-gs1200-adventure',
      'https://keni-rides.com/nos-motos/yamaha-tenere-700-world-raid',
      'https://keni-rides.com/nos-motos/yamaha-tenere-700',
      'https://keni-rides.com/nos-motos/bmw-f800gs-adventure',
      'https://keni-rides.com/nos-motos/suzuki-dr650',
      'https://keni-rides.com/nos-motos/suzuki-dr400',
      'https://keni-rides.com/nos-motos/honda-crf250',
      'https://keni-rides.com/nos-motos/suzuki-dr200'
    ];
    for (const u of [...xenoUrls, ...mmotoUrls, ...r2aUrls, ...keniUrls]) {
      if (!seenUrls.has(u) && !urls.includes(u)) urls.push(u);
    }

    const mnFleet = await crawlMotoNomadFleet();
    const oxFleet = await crawlOxBikersFleet(delayMs);
    for (const item of [...mnFleet, ...oxFleet]) {
      if (item && item.price > 0 && item.images.length > 0 && !seenIds.has(item.id)) {
        currentList.push(item);
        seenIds.add(item.id);
        seenUrls.add(item.sourceUrl);
      }
    }
    console.log(`[Rental Crawler] Imported ${mnFleet.length} MotoNomad.ma + ${oxFleet.length} OXBikers.com motorbike candidates (OXBikers is reduced to one city per bike when saving)`);
  }

  // Motorbike URLs first, so they are always processed before the car cap can matter.
  const validUrls = urls.filter(isValidRentalUrl).sort((a, b) => Number(isCarUrl(a)) - Number(isCarUrl(b)));
  console.log(`[Rental Importer] Processing ${validUrls.length} rental detail URL(s)...`);

  const BATCH_SIZE = delayMs <= 300 ? 3 : 1;
  let addedCount = 0;

  for (let i = 0; i < validUrls.length; i += BATCH_SIZE) {
    const carsFull = uniqueCarCount() >= crawlLimit;
    const batch = validUrls.slice(i, i + BATCH_SIZE).filter((u) => !seenUrls.has(u) && !(carsFull && isCarUrl(u)));
    if (!batch.length) continue;

    const results = await Promise.all(
      batch.map(async (u) => {
        try {
          return await importRentalListing(u, BATCH_SIZE > 1 ? 0 : delayMs, { fallbackImg: rmmImageMap.get(u) });
        } catch (err) {
          console.warn(`[Rental Importer] Failed ${u}: ${err.message}`);
          return null;
        }
      })
    );

    for (const listing of results) {
      if (listing && listing.price > 0 && listing.images && listing.images.length > 0 && !seenIds.has(listing.id)) {
        currentList.push(listing);
        seenIds.add(listing.id);
        seenUrls.add(listing.sourceUrl);
        addedCount++;
      }
    }

    if (!isDryRun && addedCount > 0 && (i % 24 === 0 || i + BATCH_SIZE >= validUrls.length)) {
      syncRentalFiles(currentList, path.dirname(resolvedOut));
      console.log(`[Rental Importer] Saved checkpoint: ${currentList.length} total rental listings (+${addedCount})`);
    }

    if (BATCH_SIZE > 1) await sleep(delayMs);
  }

  if (!isDryRun) syncRentalFiles(currentList, path.dirname(resolvedOut));
  const finalList = dedupeAcrossCities(currentList);
  const motoCount = finalList.filter((x) => x.kind === 'Moto').length;
  console.log(`[Rental Importer] Finished! ${finalList.length} listings (${finalList.length - motoCount} cars, ${motoCount} motos) after cross-city de-duplication`);
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch((err) => {
    console.error('[Rental Importer] Fatal error:', err);
    process.exit(1);
  });
}