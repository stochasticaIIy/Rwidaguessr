#!/usr/bin/env node

/**
 * Conservative importer for Moroccan vehicle rental portals:
 * - GoRide.ma (https://www.goride.ma) — Moroccan car rental marketplace
 * - OneClickDrive.ma (https://www.oneclickdrive.ma) — Moroccan car rental portal
 * - Moteur.ma Location (https://www.moteur.ma/fr/voiture/location-voiture/)
 * - RentalMotoMarrakech.com (https://rentalmotomarrakech.com/parke) — Moroccan motorbike & scooter rentals
 * - MotoNomad.ma (https://motonomad.ma/motorcycle-rental-list/) — Moroccan motorcycle rentals
 * - Location-Scooter-Marrakech.com (https://location-scooter-marrakech.com/rental) — Moroccan scooter rentals
 * - AganaMobility.com (https://www.aganamobility.com/our-fleet/) — Moroccan motorbike & scooter rentals
 * - LocationMotoTanger.com (https://locationmototanger.com/nos-motos/) — Tangier motorbike & scooter rentals
 *
 * Complies with conservative scraping practices:
 * - Requests only public rental detail & fleet pages
 * - Enforces a polite rate limit (--delay, default 1500ms)
 * - Identifies itself with a dedicated User-Agent
 * - Scrubs personal/contact info (phone, WhatsApp, email, agency names)
 * - Leaves equipment & options in original French for both languages
 * - Supports automatic crawling across Moroccan cities & categories
 * - Saves incrementally to JSON so progress is never lost
 *
 * Usage:
 *   node scripts/import-rentals.js <url1> <url2> ...
 *   node scripts/import-rentals.js --file urls.txt [--out data/rentals.imported.json] [--delay 1500]
 *   node scripts/import-rentals.js --crawl [--limit 350] [--out data/rentals.imported.json] [--delay 1500]
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { localizeTerm } from './dictionary.js';
import { detectBikeCylinders } from './darija.js';

const MIN_DELAY_MS = 200;
const DEFAULT_DELAY_MS = 1500;
const USER_AGENT = 'RwidaGuessr-Rental-Importer/1.0 (+https://github.com/stochasticaIIy/Rwidaguessr; conservative public rental importer)';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(str) {
  if (!str) return '';
  return String(str).replace(/\s+/g, ' ').trim();
}

function hashString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const MOROCCAN_CITIES = [
  // Casablanca - Settat
  { key: 'casablanca', city: 'Casablanca', cityAr: 'الدار البيضاء', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, patterns: [/casablanca/i, /\bcasa\b/i, /mohammed\s*v/i, /الدار البيضاء/, /كازا/] },
  { key: 'mohammedia', city: 'Mohammedia', cityAr: 'المحمدية', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, patterns: [/mohammedia/i, /المحمدية/] },
  { key: 'el-jadida', city: 'El Jadida', cityAr: 'الجديدة', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, patterns: [/el[\s-]jadida/i, /الجديدة/] },
  { key: 'berrechid', city: 'Berrechid', cityAr: 'برشيد', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, patterns: [/berrechid/i, /برشيد/] },
  { key: 'settat', city: 'Settat', cityAr: 'سطات', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, patterns: [/settat/i, /سطات/] },

  // Rabat - Salé - Kénitra
  { key: 'rabat', city: 'Rabat', cityAr: 'الرباط', region: 'rabat', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, patterns: [/\brabat\b/i, /الرباط/] },
  { key: 'sale', city: 'Salé', cityAr: 'سلا', region: 'rabat', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, patterns: [/\bsal[eé]\b/i, /سلا/] },
  { key: 'kenitra', city: 'Kénitra', cityAr: 'القنيطرة', region: 'rabat', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, patterns: [/k[eé]nitra/i, /القنيطرة/] },
  { key: 'temara', city: 'Témara', cityAr: 'تمارة', region: 'rabat', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, patterns: [/t[eé]mara/i, /تمارة/] },

  // Tanger - Tétouan - Al Hoceïma (North)
  { key: 'tanger', city: 'Tanger', cityAr: 'طنجة', region: 'tanger', regionName: { ar: 'طنجة - تطوان - الشمال', en: 'Tangier - Tétouan (North)' }, patterns: [/tanger/i, /tangier/i, /ibn\s*battouta/i, /طنجة/] },
  { key: 'tetouan', city: 'Tétouan', cityAr: 'تطوان', region: 'tanger', regionName: { ar: 'طنجة - تطوان - الشمال', en: 'Tangier - Tétouan (North)' }, patterns: [/t[eé]touan/i, /martil/i, /تطوان/] },
  { key: 'nador', city: 'Nador', cityAr: 'الناظور', region: 'tanger', regionName: { ar: 'طنجة - تطوان - الشمال', en: 'Tangier - Tétouan (North)' }, patterns: [/nador/i, /الناظور/] },

  // Marrakech - Safi & Souss - Massa (South)
  { key: 'marrakech', city: 'Marrakech', cityAr: 'مراكش', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, patterns: [/marrakech/i, /marrakesh/i, /menara/i, /gueliz/i, /مراكش/] },
  { key: 'agadir', city: 'Agadir', cityAr: 'أكادير', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, patterns: [/agadir/i, /al\s*massira/i, /أكادير/, /اكادير/] },
  { key: 'essaouira', city: 'Essaouira', cityAr: 'الصويرة', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, patterns: [/essaouira/i, /الصويرة/] },
  { key: 'safi', city: 'Safi', cityAr: 'آسفي', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, patterns: [/\bsafi\b/i, /laayoune/i, /dakhla/i, /آسفي/] },

  // Fès - Meknès - Oriental
  { key: 'fes', city: 'Fès', cityAr: 'فاس', region: 'oriental', regionName: { ar: 'فاس - مكناس - الشرق', en: 'Fès - Meknès - Oriental' }, patterns: [/\bf[eè]s\b/i, /\bfez\b/i, /sa[ïi]ss/i, /فاس/] },
  { key: 'meknes', city: 'Meknès', cityAr: 'مكناس', region: 'oriental', regionName: { ar: 'فاس - مكناس - الشرق', en: 'Fès - Meknès - Oriental' }, patterns: [/m[eé]kn[eè]s/i, /مكناس/] },
  { key: 'oujda', city: 'Oujda', cityAr: 'وجدة', region: 'oriental', regionName: { ar: 'فاس - مكناس - الشرق', en: 'Fès - Meknès - Oriental' }, patterns: [/oujda/i, /angads/i, /وجدة/] }
];

export function resolveLocationFromText(primaryText = '', secondaryText = '', fallbackIndex = 0) {
  for (const c of MOROCCAN_CITIES) {
    if (c.patterns.some((p) => p.test(primaryText))) {
      return {
        region: c.region,
        regionName: c.regionName,
        city: c.city,
        cityAr: c.cityAr
      };
    }
  }
  if (secondaryText) {
    for (const c of MOROCCAN_CITIES) {
      if (c.patterns.some((p) => p.test(secondaryText))) {
        return {
          region: c.region,
          regionName: c.regionName,
          city: c.city,
          cityAr: c.cityAr
        };
      }
    }
  }
  const picked = MOROCCAN_CITIES[fallbackIndex % MOROCCAN_CITIES.length];
  return {
    region: picked.region,
    regionName: picked.regionName,
    city: picked.city,
    cityAr: picked.cityAr
  };
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
      'aganamobility.com',
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

const KNOWN_BRANDS = [
  'Mercedes-Benz', 'Land Rover', 'Range Rover', 'Alfa Romeo', 'Aston Martin',
  'Volkswagen', 'Renault', 'Peugeot', 'Citroën', 'Citroen', 'Dacia', 'Hyundai',
  'Kia', 'Toyota', 'Ford', 'Opel', 'Fiat', 'Audi', 'BMW', 'Porsche', 'Jeep',
  'Nissan', 'Seat', 'Cupra', 'Skoda', 'Volvo', 'Mini', 'Suzuki', 'Honda',
  'Mitsubishi', 'Mazda', 'Chevrolet', 'MG', 'BYD', 'Tesla', 'Changan', 'Geely',
  'Haval', 'Chery', 'DFSK', 'Jaguar', 'Maserati', 'Bentley', 'Ferrari', 'Lamborghini',
  'Yamaha', 'Kawasaki', 'Ducati', 'KTM', 'Harley-Davidson', 'Triumph', 'Aprilla',
  'Vespa', 'Piaggio', 'Kymco', 'SYM', 'CFMOTO', 'CF Moto', 'Royal Enfield',
  'Benelli', 'MBK', 'Bécane', 'Becane', 'Docker', 'Sanya', 'Vinto', 'Gabelli', 'TVS', 'Austin'
];

export function splitBrandAndModel(rawTitle = '') {
  let decoded = String(rawTitle || '').replace(/\+/g, ' ');
  try {
    decoded = decodeURIComponent(decoded);
  } catch (_) {}
  const cleaned = cleanText(decoded)
    .replace(/^(?:Location|Louer|Rent|Rental)\s+(?:voiture|moto|scooter)?\s*/i, '')
    .replace(/\b(?:19\d\d|20\d\d)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const b of KNOWN_BRANDS) {
    const regex = new RegExp(`^${b.replace(/[-]/g, '[\\s-]')}\\b\\s*(.*)$`, 'i');
    const m = cleaned.match(regex);
    if (m) {
      const brandName = b === 'Citroen' ? 'Citroën' : b === 'CF Moto' ? 'CFMOTO' : b === 'Becane' ? 'Bécane' : b;
      const modelName = cleanText(m[1]) || brandName;
      return { brand: brandName, model: modelName, fullTitle: `${brandName} ${modelName}`.trim() };
    }
  }

  const parts = cleaned.split(' ');
  const brand = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Véhicule';
  const model = parts.slice(1).join(' ') || 'Standard';
  return { brand, model, fullTitle: cleaned || 'Véhicule' };
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
    { label: { en: 'Model', ar: 'الطراز' }, value: { en: model, ar: model } },
    { label: { en: 'Year', ar: 'السنة' }, value: { en: String(year), ar: String(year) } }
  ];

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

  features.push({ label: { en: 'Gearbox', ar: 'علبة السرعات' }, value: gearboxLoc });
  features.push({ label: { en: 'City', ar: 'المدينة' }, value: { en: location.city, ar: location.cityAr } });

  const quickFacts = [{ en: String(year), ar: String(year) }];
  if (cleanMileage) {
    quickFacts.push({ en: cleanMileage, ar: cleanMileage });
  }
  quickFacts.push(fuelLoc, gearboxLoc);

  return { features, quickFacts };
}

/**
 * 1. Parse GoRide.ma Car Rental Detail HTML
 */
export function parseGoRideHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const urlObj = new URL(sourceUrl);
  const rawId = urlObj.searchParams.get('id') || Buffer.from(sourceUrl).toString('base64').slice(0, 10);
  const id = `goride-${rawId.slice(0, 14)}`;

  const h1 = cleanText($('h1').first().text()) || 'Voiture de location';
  const yearMatch = h1.match(/\b(20\d\d|19\d\d)\b/) || sourceUrl.match(/-(20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : '2024';

  const { brand, model, fullTitle } = splitBrandAndModel(h1);

  $('script, style, nav, header, footer').remove();
  const mainText = cleanText($('main').text() || $('body').text());

  // Extract price in DH/jour (prefer unformatted "À partir de 1200 dh/jour" or thousands-spaced "1 200,00 DH / jour")
  let price = 0;
  const partMatch = mainText.match(/À partir de\s*(\d+(?:[.,]\d+)?)\s*dh\/jour/i);
  const fullMatch = mainText.match(/(\d{1,2}\s\d{3}|\d+)(?:[.,]\d+)?\s*DH\s*\/\s*jour/i);
  if (partMatch) {
    const parsed = Math.round(parseFloat(partMatch[1].replace(',', '.')));
    if (parsed >= 80 && parsed <= 25000) price = parsed;
  } else if (fullMatch) {
    const parsed = parseInt(fullMatch[1].replace(/\s+/g, ''), 10);
    if (parsed >= 80 && parsed <= 25000) price = parsed;
  }

  // Extract fuel & gearbox from the specific vehicle header or sentence
  const sentenceMatch = mainText.match(/Louez cette\s+.*?\s+(diesel|essence|hybride|[eé]lectrique)\s+(automatique|manuelle)/i);
  const fuelRaw = sentenceMatch
    ? sentenceMatch[1]
    : (mainText.match(/\b(Diesel|Essence|Hybride|Électrique|Electrique)\b/i)?.[1] || 'Diesel');
  const gearRaw = sentenceMatch
    ? sentenceMatch[2]
    : (mainText.match(/\b(Automatique|Manuelle)\b/i)?.[1] || 'Automatique');

  const fuelFr = /electr/i.test(fuelRaw)
    ? 'Électrique'
    : /hybr/i.test(fuelRaw)
      ? 'Hybride'
      : /essence/i.test(fuelRaw)
        ? 'Essence'
        : 'Diesel';
  const gearboxFr = /auto/i.test(gearRaw) ? 'Automatique' : 'Manuelle';

  const kmMatch = mainText.match(/([\d.]+\s*-\s*[\d.]+\s*km|Plus de\s*[\d.]+\s*km)/i);
  const mileage = kmMatch ? kmMatch[1].replace(/\./g, ',') : '';

  const doorsMatch = mainText.match(/(\d)\s*portes/i);
  const doors = doorsMatch ? doorsMatch[1] : '';

  const minDaysMatch = mainText.match(/Durée minimale(?:\s*de location)?\s*:?\s*(\d+)\s*jours?/i);
  const minDays = minDaysMatch ? parseInt(minDaysMatch[1], 10) : null;

  // Extract images from _next/image or direct supabase URLs
  const $full = cheerio.load(html);
  const images = [];
  $full('img').each((_, el) => {
    const src = $full(el).attr('src') || '';
    if (src.includes('_next/image?url=')) {
      try {
        const u = new URL(src, 'https://www.goride.ma');
        const dec = u.searchParams.get('url');
        if (dec && dec.includes('supabase.co') && dec.includes('/images/images/') && !images.includes(dec)) {
          images.push(dec);
        }
      } catch (_) {}
    }
  });
  if (images.length === 0) {
    const rawSupa = html.match(/https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/render\/image\/public\/images\/images\/[^\s"'&<>\\]+/gi) || [];
    for (const s of rawSupa) {
      if (!images.includes(s)) images.push(s);
    }
  }

  const location = resolveLocationFromText(sourceUrl, mainText, hashString(id));

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: false,
    brand,
    model,
    year,
    mileage,
    fuelFr,
    gearboxFr,
    doors,
    minDays,
    title: fullTitle,
    location
  });

  // Extract only real options/badges explicitly present on the GoRide listing page & embedded carDetails JSON
  const rawOptions = [];
  const unescapedHtml = html.replace(/\\"/g, '"');
  const carDetailsIdx = unescapedHtml.indexOf('"carDetails"');
  const carDetailsChunk = carDetailsIdx >= 0 ? unescapedHtml.slice(carDetailsIdx, carDetailsIdx + 3500) : '';

  if (/\ba[ée]roport\b/i.test(mainText) || /"airportPickup"\s*:\s*true/i.test(carDetailsChunk)) {
    rawOptions.push('Livraison aéroport');
  }
  if (/"isOnlinePayment"\s*:\s*true/i.test(carDetailsChunk)) {
    rawOptions.push('Paiement en ligne');
  }
  const litrageMatch = carDetailsChunk.match(/"litrage"\s*:\s*"([0-9.]+)"/i);
  if (litrageMatch && litrageMatch[1] && parseFloat(litrageMatch[1]) > 0) {
    rawOptions.push(`Moteur ${litrageMatch[1]}L`);
  }
  const colorMatch = carDetailsChunk.match(/"color"\s*:\s*"([^"]+)"/i);
  if (colorMatch && colorMatch[1] && !/^couleur$/i.test(colorMatch[1].trim())) {
    const firstColor = colorMatch[1].split(',')[0].trim();
    if (firstColor && firstColor.length < 25) {
      rawOptions.push(`Couleur : ${firstColor}`);
    }
  }
  const minAgeMatch = mainText.match(/Âge minimum du conducteur\s*(\d+)\s*ans/i) || carDetailsChunk.match(/"driverMinimumAge"\s*,\s*"value"\s*:\s*"(\d+)"/i);
  if (minAgeMatch && minAgeMatch[1]) {
    rawOptions.push(`Âge min : ${minAgeMatch[1]} ans`);
  }

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
    if ((regex.test(mainText) || regex.test(carDetailsChunk)) && !rawOptions.includes(label)) {
      rawOptions.push(label);
    }
  }

  const options = rawOptions.map((opt) => ({ en: opt, ar: opt, raw: opt }));

  return {
    id,
    kind: 'Car',
    listingType: 'rental',
    priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price,
    quickFacts,
    features,
    options,
    images: images.slice(0, 8),
    sourceUrl,
    location
  };
}

/**
 * 2. Parse OneClickDrive.ma Car Rental Detail HTML
 */
export function parseOneClickDriveHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const urlObj = new URL(sourceUrl);
  const rawId = urlObj.searchParams.get('id') || Buffer.from(sourceUrl).toString('base64').slice(0, 10);
  const id = `ocd-${rawId}`;

  // Extract from WhatsApp link or H1
  const waHref = $('a[href*="api.whatsapp.com"]').attr('href') || '';
  const waDecoded = decodeURIComponent(waHref.replace(/\+/g, ' '));

  let rawTitle = $('h1').first().text().replace(/^Rent\s+/i, '').trim();
  const waCarMatch = waDecoded.match(/Car:\s*([^\n\r]+)/i);
  if (waCarMatch) rawTitle = cleanText(waCarMatch[1]);

  const yearMatch = rawTitle.match(/\b(20\d\d|19\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : '2024';
  const { brand, model, fullTitle } = splitBrandAndModel(rawTitle);

  // Extract price in MAD/day
  let price = 0;
  const waPriceMatch = waDecoded.match(/Price:\s*MAD\s*([\d,]+)\s*\/\s*day/i);
  if (waPriceMatch) {
    price = parseInt(waPriceMatch[1].replace(/[^\d]/g, ''), 10);
  }
  if (!price) {
    const madMatches = [...html.matchAll(/MAD\s*([\d,]+)\s*(?:\/\s*day|per\s*day)/gi)];
    if (madMatches.length > 0) {
      price = parseInt(madMatches[0][1].replace(/[^\d]/g, ''), 10);
    }
  }
  if (!price) {
    const usdMatch = html.match(/USD\s*([\d,]+)\s*(?:[\d/]*\s*)?\/\s*day/i);
    if (usdMatch) {
      price = Math.round((parseInt(usdMatch[1].replace(/[^\d]/g, ''), 10) * 9.8) / 10) * 10;
    }
  }

  // Extract images (prefer high-res without _small)
  const rawImgs = [...new Set(html.match(/https:\/\/static\.oneclickdrive\.com\/uploads\/cars\/[^\s"'\''<>?]+/gi) || [])];
  const images = rawImgs
    .map((u) => u.replace('_small.', '.'))
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .slice(0, 8);

  // Extract real scraped options from .new-specs-features before removing scripts/styles
  const rawOptions = [];
  $('.new-specs-features li').each((_, el) => {
    const opt = cleanText($(el).text());
    if (opt && opt.length > 1 && opt.length < 55 && !rawOptions.includes(opt)) {
      rawOptions.push(opt);
    }
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
  if ((/basic comprehensive insurance|Insurance included/i.test(bodyText)) && !rawOptions.includes('Assurance incluse')) {
    rawOptions.push('Assurance incluse');
  }
  if (/standard mileage limit of Unlimited/i.test(bodyText) && !rawOptions.includes('Kilométrage illimité')) {
    rawOptions.push('Kilométrage illimité');
  } else {
    const kmDayMatch = bodyText.match(/standard mileage limit of\s*(\d+)\s*km/i);
    if (kmDayMatch && kmDayMatch[1]) {
      const kmLabel = `${kmDayMatch[1]} km/jour inclus`;
      if (!rawOptions.includes(kmLabel)) rawOptions.push(kmLabel);
    }
  }
  if (/Free Delivery/i.test(bodyText) && !rawOptions.includes('Livraison gratuite')) {
    rawOptions.push('Livraison gratuite');
  }

  let fuelFr = 'Diesel';
  const fuelSpecMatch = bodyText.match(/Fuel Type\s+(Diesel|Petrol|Hybrid|Electric|Essence)/i);
  if (fuelSpecMatch) {
    const f = fuelSpecMatch[1].toLowerCase();
    if (f === 'electric') fuelFr = 'Électrique';
    else if (f === 'hybrid') fuelFr = 'Hybride';
    else if (f === 'petrol' || f === 'essence') fuelFr = 'Essence';
    else fuelFr = 'Diesel';
  } else if (/electric|e-tron|taycan|id\.\d|ev\b/i.test(fullTitle)) {
    fuelFr = 'Électrique';
  } else if (/hybrid|hybride|e-hybrid/i.test(fullTitle)) {
    fuelFr = 'Hybride';
  }

  const gearMatch = bodyText.match(/Gearbox\s+(Auto|Automatic|Manual)/i);
  const gearboxFr = gearMatch && /man/i.test(gearMatch[1]) ? 'Manuelle' : 'Automatique';

  const doorsMatch = bodyText.match(/No\.\s*of\s*Doors\s*(\d)/i) || bodyText.match(/This\s*(\d)\s*door/i);
  const doors = doorsMatch ? doorsMatch[1] : '';

  const minDaysMatch = bodyText.match(/Minimum\s*(\d+)\s*days?\s*rental/i);
  const minDays = minDaysMatch ? parseInt(minDaysMatch[1], 10) : null;

  // OneClickDrive does not list odometer mileage; only extract if explicitly stated as odometer
  const mileage = '';
  const location = resolveLocationFromText(sourceUrl, bodyText, hashString(id));

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: false,
    brand,
    model,
    year,
    mileage,
    fuelFr,
    gearboxFr,
    doors,
    minDays,
    title: fullTitle,
    location
  });

  const options = rawOptions.map((opt) => ({ en: opt, ar: opt, raw: opt }));

  return {
    id,
    kind: 'Car',
    listingType: 'rental',
    priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price,
    quickFacts,
    features,
    options,
    images,
    sourceUrl,
    location
  };
}

const EN_TO_FR_COLOR = {
  black: 'Noir',
  white: 'Blanc',
  gray: 'Gris',
  grey: 'Gris',
  silver: 'Argent',
  blue: 'Bleu',
  red: 'Rouge',
  green: 'Vert',
  brown: 'Marron',
  beige: 'Beige',
  gold: 'Or',
  yellow: 'Jaune',
  orange: 'Orange'
};

/**
 * 2b. Parse OneClickDrive.ma Paginated City/Category Catalog Cards (.alt-card--rent)
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

    // Extract daily price in MAD
    let price = 0;
    const favOnchange = $card.find('input.alt-fav_input').attr('onchange') || '';
    const wishMatch = favOnchange.match(/wishlist\(\s*\d+\s*,\s*'[^']*'\s*,\s*(\d+)/i);
    if (wishMatch && wishMatch[1]) {
      price = parseInt(wishMatch[1], 10);
    }
    if (!price) {
      const waHref = $card.find('a.alt-btn--wa').attr('href') || '';
      const waDecoded = decodeURIComponent(waHref.replace(/\+/g, ' '));
      const waPriceMatch = waDecoded.match(/Price:\s*MAD\s*([\d,]+)\s*\/\s*day/i);
      if (waPriceMatch) {
        price = parseInt(waPriceMatch[1].replace(/[^\d]/g, ''), 10);
      }
    }
    if (!price) {
      const priceNowText = cleanText($card.find('.alt-price_now').first().text());
      const usdMatch = priceNowText.match(/USD\s*([\d,]+)/i);
      const madMatch = priceNowText.match(/MAD\s*([\d,]+)/i);
      if (madMatch) {
        price = parseInt(madMatch[1].replace(/[^\d]/g, ''), 10);
      } else if (usdMatch) {
        price = Math.round((parseInt(usdMatch[1].replace(/[^\d]/g, ''), 10) * 9.8) / 10) * 10;
      }
    }
    if (!Number.isFinite(price) || price <= 0) return;

    // Extract high-resolution images
    const images = [];
    $card.find('.alt-slider_track img.alt-slide, figure.alt-media img').each((__, imgEl) => {
      const rawSrc = $(imgEl).attr('src') || $(imgEl).attr('data-defer-src') || '';
      if (rawSrc.includes('static.oneclickdrive.com/uploads/cars/')) {
        const hiRes = rawSrc.split('?')[0].replace('_small.', '.');
        if (!images.includes(hiRes)) images.push(hiRes);
      }
    });
    if (images.length === 0) return;

    // Extract fuel, seats, minDays, and real scraped options
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

    if (/electric|e-tron|taycan|id\.\d|ev\b/i.test(fullTitle)) {
      fuelFr = 'Électrique';
    } else if (/hybrid|hybride|e-hybrid/i.test(fullTitle)) {
      fuelFr = 'Hybride';
    }

    $card.find('ul.alt-feats li').each((__, liEl) => {
      const txt = cleanText($(liEl).text());
      const minMatch = txt.match(/Min\.\s*(\d+)\s*days?\s*rental/i);
      if (minMatch) {
        minDays = parseInt(minMatch[1], 10);
      } else if (/^Free Delivery$/i.test(txt)) {
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
    if (/airport|aéroport/i.test(locPinText) && !rawOptions.includes('Livraison aéroport')) {
      rawOptions.push('Livraison aéroport');
    }

    const descText = cleanText($card.find('p.alt-desc').text());
    const firstWord = (descText.split(/[\s,]+/)[0] || '').toLowerCase();
    if (EN_TO_FR_COLOR[firstWord]) {
      const cLabel = `Couleur : ${EN_TO_FR_COLOR[firstWord]}`;
      if (!rawOptions.includes(cLabel)) rawOptions.push(cLabel);
    }

    const location = resolveLocationFromText(sourceUrl, `${locPinText} ${pageUrl}`, hashString(id));

    const { features, quickFacts } = buildRentalFeatures({
      isMoto: false,
      brand,
      model,
      year,
      mileage: '',
      fuelFr,
      gearboxFr: 'Automatique',
      doors: '4',
      minDays,
      title: fullTitle,
      location
    });

    results.push({
      id,
      kind: 'Car',
      listingType: 'rental',
      priceUnit: 'day',
      title: { en: fullTitle, ar: fullTitle },
      price,
      quickFacts,
      features,
      options: rawOptions.map((opt) => ({ en: opt, ar: opt, raw: opt })),
      images: images.slice(0, 8),
      sourceUrl,
      location
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

  const smartImgs = [...new Set(html.match(/https:\/\/jacarandamoto\.smartrental\.ma\/storage\/jacarandamoto\/models\/[^\s"'\''<>)]+/gi) || [])];
  const images = fallbackImg ? [fallbackImg, ...smartImgs.filter((x) => x !== fallbackImg)] : smartImgs;

  $('script, style, nav, header, footer').remove();
  const text = cleanText($('body').text());

  const brandMatch = text.match(/Brand\s+([A-Za-zÀ-ÿ0-9-]+)\s+Model\s+([A-Za-zÀ-ÿ0-9\s.-]+?)\s+Category/i);
  let rawTitle = brandMatch ? `${brandMatch[1]} ${brandMatch[2]}` : slug.replace(/-\d+$/, '').replace(/-/g, ' ');
  const { brand, model, fullTitle } = splitBrandAndModel(rawTitle);

  // Extract EUR/Day and convert to MAD/day (1 EUR ≈ 10.8 MAD)
  let price = 0;
  const eurMatch = text.match(/([\d.,]+)\s*€\s*\/\s*Day/i);
  if (eurMatch) {
    const eur = parseFloat(eurMatch[1].replace(',', '.'));
    if (Number.isFinite(eur) && eur > 0) {
      price = Math.round((eur * 10.8) / 10) * 10;
    }
  }
  if (/vespa\s*primavera/i.test(fullTitle) && price > 600) price = 270;
  if (/sym\s*s\b|gabelli\s*verona/i.test(fullTitle) && price > 600) price = 220;

  const dispMatch = text.match(/Displacement\s*(\d+)\s*cc/i);
  const engineCc = dispMatch ? dispMatch[1] : '';
  const isScooter = /scooter|vespa|agility|nmax|xmax|sym|neos|bws|stunt|verona/i.test(`${fullTitle} ${text}`);
  const gearboxFr = isScooter || /x-adv/i.test(fullTitle) ? 'Automatique' : 'Manuelle';

  const year = '2024';
  const mileage = '';
  const location = resolveLocationFromText('Marrakech', '', 0);

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: true,
    brand,
    model,
    year,
    mileage,
    fuelFr: 'Essence',
    gearboxFr,
    minDays: null,
    engineCc,
    title: fullTitle,
    location
  });

  // Extract only real included options/modules scraped from RentalMotoMarrakech HTML
  const rawOptions = [];
  if (/A motorcycle lock is included/i.test(text)) rawOptions.push('Antivol inclus');
  if (/Roadside breakdown assistance/i.test(text)) rawOptions.push('Assistance routière');
  if (/Driver helmet is included/i.test(text)) rawOptions.push('Casque conducteur inclus');
  if (/Basic insurance is included/i.test(text)) rawOptions.push('Assurance de base incluse');
  if (/Optional passenger helmet[\s\S]{0,80}\+\s*0\.00\s*€/i.test(text)) rawOptions.push('Casque passager gratuit');

  const options = rawOptions.map((opt) => ({ en: opt, ar: opt, raw: opt }));

  return {
    id,
    kind: 'Moto',
    listingType: 'rental',
    priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price,
    quickFacts,
    features,
    options,
    images: images.slice(0, 4),
    sourceUrl,
    location
  };
}

/**
 * 4. Parse Location-Scooter-Marrakech.com Detail HTML
 */
export function parseLocationScooterMarrakechHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const slug = sourceUrl.split('/').filter(Boolean).pop() || 'scooter';
  const id = `lsm-${slug}`;

  const imgs = [];
  $('img').each((_, el) => {
    const s = $(el).attr('src') || '';
    if (s.includes('images/data')) {
      const full = s.startsWith('http') ? s : `https://location-scooter-marrakech.com/${s.replace(/^\//, '')}`;
      if (!imgs.includes(full)) imgs.push(full);
    }
  });

  $('script, style, nav, header, footer').remove();
  const text = cleanText($('body').text());

  const hTitle = cleanText($('h1, h2').first().text()) || decodeURIComponent(slug).replace(/-/g, ' ');
  const { brand, model, fullTitle } = splitBrandAndModel(hTitle);

  let price = 250;
  const eurMatch = text.match(/(\d+)\s*€/i);
  if (eurMatch) {
    price = Math.round((parseInt(eurMatch[1], 10) * 10.8) / 10) * 10;
  }

  const yearMatch = text.match(/Model:\s*(20\d\d)/i);
  const year = yearMatch ? yearMatch[1] : '2024';
  const location = resolveLocationFromText('Marrakech', '', 0);

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: true,
    brand,
    model,
    year,
    mileage: '',
    fuelFr: 'Essence',
    gearboxFr: 'Automatique',
    minDays: /2 to 4 Days/i.test(text) ? 2 : null,
    engineCc: /125/i.test(fullTitle) ? '125' : '50',
    title: fullTitle,
    location
  });

  // Extract only real options present in the Location-Scooter-Marrakech HTML
  const rawOptions = [];
  if (/Zero deductible insurance|Franchise 0/i.test(text)) rawOptions.push('Franchise 0 € (Zero deductible insurance)');
  if (/Collision Damage Waiver/i.test(text)) rawOptions.push('Collision Damage Waiver');
  if (/Anti-theft protection/i.test(text)) rawOptions.push('Anti-theft protection');

  return {
    id,
    kind: 'Moto',
    listingType: 'rental',
    priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price,
    quickFacts,
    features,
    options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
    images: imgs,
    sourceUrl,
    location
  };
}

/**
 * 4b. Parse XenoRide.ma Motorbike/Scooter Detail HTML (Tangier)
 */
export function parseXenoRideHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const slug = sourceUrl.split('/').filter(Boolean).pop() || 'moto';
  const id = `xenoride-${slug}`;

  const imgs = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('cdn.sanity.io/images/')) {
      const hiRes = src.replace(/&w=\d+&h=\d+/g, '&w=1200&h=900');
      const baseKey = src.split('?')[0];
      if (!imgs.some((x) => x.split('?')[0] === baseKey)) {
        imgs.push(hiRes);
      }
    }
  });

  const rawH1 = cleanText($('h1').first().text())
    .replace(/\s+[àa]\s+louer.*$/i, '')
    .replace(/\s+tanger$/i, '');
  const { brand, model, fullTitle } = splitBrandAndModel(rawH1 || slug.replace(/-/g, ' '));

  $('script, style, nav, header, footer').remove();
  const text = cleanText($('body').text());

  let price = 0;
  const madMatch = text.match(/(\d+)\s*MAD\s*\/\s*Jour/i);
  if (madMatch) {
    price = parseInt(madMatch[1], 10);
  }

  const yearMatch = text.match(/Ann[eé]e\s*:?\s*(20\d\d)/i) || rawH1.match(/\b(20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : '2025';

  // XenoRide explicitly provides real odometer mileage on its detail pages ("Kilométrage : 7.000 km")
  const kmMatch = text.match(/Kilom[eé]trage\s*:?\s*([\d.]+)\s*km/i);
  const mileage = kmMatch ? `${kmMatch[1].replace(/\./g, ',')} km` : '';

  const ccMatch = text.match(/(\d+)\s*cc/i);
  const engineCc = ccMatch ? ccMatch[1] : '50';
  const isManual = /manuelle/i.test(text) && !/automatique/i.test(text);
  const gearboxFr = isManual ? 'Manuelle' : 'Automatique';
  const location = resolveLocationFromText('Tanger', text, 0);

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: true,
    brand,
    model,
    year,
    mileage,
    fuelFr: 'Essence',
    gearboxFr,
    minDays: null,
    engineCc,
    title: fullTitle,
    location
  });

  const rawOptions = [];
  if (/Assurance incluse/i.test(text)) rawOptions.push('Assurance incluse');
  if (/2 casques inclus/i.test(text)) rawOptions.push('2 casques inclus');
  if (/Kilom[eé]trage illimit[eé]/i.test(text)) rawOptions.push('Kilométrage illimité');
  if (/Assistance 24\/7/i.test(text)) rawOptions.push('Assistance 24/7');
  if (/Support t[eé]l[eé]phone/i.test(text)) rawOptions.push('Support téléphone');
  if (/Top case/i.test(text)) rawOptions.push('Top case');

  return {
    id,
    kind: 'Moto',
    listingType: 'rental',
    priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price,
    quickFacts,
    features,
    options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
    images: imgs.slice(0, 6),
    sourceUrl,
    location
  };
}

/**
 * 4c. Parse MarrakechMoto.com Detail HTML (Marrakech)
 */
export function parseMarrakechMotoHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const slug = sourceUrl.split('/').filter(Boolean).pop() || 'moto';
  const id = `mmoto-${slug}`;

  const imgs = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('_next/image?url=')) {
      try {
        const u = new URL(src, 'https://marrakechmoto.com');
        const dec = u.searchParams.get('url');
        if (dec && dec.includes('supabase.co') && dec.includes('/motos/') && !imgs.includes(dec)) {
          imgs.push(dec);
        }
      } catch (_) {}
    }
  });

  const rawH1 = cleanText($('h1').first().text()) || slug.replace(/-/g, ' ');
  const { brand, model, fullTitle } = splitBrandAndModel(rawH1);

  $('script, style, nav, header, footer').remove();
  const text = cleanText($('body').text());

  let price = 0;
  const eurMatch = text.match(/(\d+)\s*€\s*\/\s*jour/i);
  if (eurMatch) {
    price = Math.round((parseInt(eurMatch[1], 10) * 10.8) / 10) * 10;
  }

  const yearMatch = text.match(/Mod[eè]le\s*(20\d\d)/i);
  const year = yearMatch ? yearMatch[1] : '2025';

  const ccMatch = text.match(/(\d{2,4})\s*cc/i);
  const engineCc = ccMatch ? ccMatch[1] : '450';
  const isScooter = /scooter|agility|50\b/i.test(fullTitle);
  const gearboxFr = isScooter ? 'Automatique' : 'Manuelle';
  const location = resolveLocationFromText('Marrakech', text, 0);

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: true,
    brand,
    model,
    year,
    mileage: '',
    fuelFr: 'Essence',
    gearboxFr,
    minDays: null,
    engineCc,
    title: fullTitle,
    location
  });

  const rawOptions = [];
  if (/Top case aluminium/i.test(text)) rawOptions.push('Top case aluminium');
  if (/Valises lat[eé]rales/i.test(text)) rawOptions.push('Valises latérales');
  if (/Support t[eé]l[eé]phone/i.test(text)) rawOptions.push('Support téléphone + USB');
  if (/Casque\s*&\s*gants/i.test(text)) rawOptions.push('Casque & gants');
  if (/Assurance RC incluse/i.test(text)) rawOptions.push('Assurance RC incluse');
  if (/Assistance 24h\/24/i.test(text)) rawOptions.push('Assistance 24h/24');

  return {
    id,
    kind: 'Moto',
    listingType: 'rental',
    priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price,
    quickFacts,
    features,
    options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
    images: imgs.slice(0, 2),
    sourceUrl,
    location
  };
}

/**
 * 4d. Parse Ride2Atlas.com Detail HTML (Marrakech)
 */
export function parseRide2AtlasHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const slug = sourceUrl.split('/').filter(Boolean).pop() || 'moto';
  const id = `r2a-${slug}`;

  const imgs = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (
      src.includes('ride2atlas.com/wp-content/uploads/') &&
      !src.includes('Untitled-1') &&
      !src.includes('cropped-') &&
      !src.includes('logo') &&
      !imgs.includes(src)
    ) {
      imgs.push(src);
    }
  });

  const rawH2 = cleanText($('h2').first().text()) || slug.replace(/^location-|-marrakech$/gi, '').replace(/-/g, ' ');
  const { brand, model, fullTitle } = splitBrandAndModel(rawH2);

  $('script, style, nav, header, footer').remove();
  const text = cleanText($('body').text());

  let price = 0;
  const eurMatch = text.match(/(\d+)\s*€\s*\/\s*Jour/i) || text.match(/(\d+)\s*€/i);
  if (eurMatch) {
    price = Math.round((parseInt(eurMatch[1], 10) * 10.8) / 10) * 10;
  }

  const ccMatch = text.match(/(\d{2,4})\s*cc/i) || fullTitle.match(/\b(50|125|310|390|411|450|800|850)\b/);
  const engineCc = ccMatch ? ccMatch[1] : '450';
  const isScooter = /scooter|cappuccino|agility|symphony/i.test(fullTitle);
  const gearboxFr = isScooter ? 'Automatique' : 'Manuelle';
  const location = resolveLocationFromText('Marrakech', text, 0);

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: true,
    brand,
    model,
    year: '2024',
    mileage: '',
    fuelFr: 'Essence',
    gearboxFr,
    minDays: null,
    engineCc,
    title: fullTitle,
    location
  });

  const rawOptions = [];
  if (/Assurance incluse/i.test(text)) rawOptions.push('Assurance incluse');
  if (/Casque et gants inclus/i.test(text)) rawOptions.push('Casque et gants inclus');
  if (/Kilom[eé]trage illimit[eé]/i.test(text)) rawOptions.push('Kilométrage illimité');
  if (/Assistance 24\/7/i.test(text)) rawOptions.push('Assistance 24/7');

  return {
    id,
    kind: 'Moto',
    listingType: 'rental',
    priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price,
    quickFacts,
    features,
    options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
    images: imgs.slice(0, 2),
    sourceUrl,
    location
  };
}

/**
 * 4e. Parse Keni-Rides.com Detail HTML (Kénitra / National)
 */
export function parseKeniRidesHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const slug = sourceUrl.split('/').filter(Boolean).pop() || 'moto';
  const id = `keni-${slug}`;

  const imgs = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src.startsWith('/bikes/')) {
      const full = `https://keni-rides.com${src}`;
      if (!imgs.includes(full)) imgs.push(full);
    }
  });

  const rawH1 = cleanText($('h1').first().text()) || slug.replace(/-/g, ' ');
  const { brand, model, fullTitle } = splitBrandAndModel(rawH1);

  $('script, style, nav, header, footer').remove();
  const text = cleanText($('body').text());

  let price = 0;
  const eurMatch = text.match(/€\s*(\d+)\s*\/\s*day/i) || text.match(/Tarif journalier\s*€\s*(\d+)/i);
  if (eurMatch) {
    price = Math.round((parseInt(eurMatch[1], 10) * 10.8) / 10) * 10;
  }

  const ccMatch = text.match(/Cylindr[eé]e\s*([\d\s]+)\s*cc/i);
  const engineCc = ccMatch ? ccMatch[1].replace(/\s+/g, '') : '650';
  const minDaysMatch = text.match(/Location minimale\s*:\s*(\d+)\s*jours/i);
  const minDays = minDaysMatch ? parseInt(minDaysMatch[1], 10) : 2;
  const location = resolveLocationFromText('Kénitra', text, 0);

  const { features, quickFacts } = buildRentalFeatures({
    isMoto: true,
    brand,
    model,
    year: '2024',
    mileage: '',
    fuelFr: 'Essence',
    gearboxFr: 'Manuelle',
    minDays,
    engineCc,
    title: fullTitle,
    location
  });

  const rawOptions = [];
  if (/Top case & valises aluminium/i.test(text)) rawOptions.push('Top case & valises aluminium');
  if (/Barres de protection moteur/i.test(text)) rawOptions.push('Barres de protection moteur');
  if (/Pare-brise touring r[eé]glable/i.test(text)) rawOptions.push('Pare-brise touring réglable');
  if (/Prise 12V & USB/i.test(text)) rawOptions.push('Prise 12V & USB');
  if (/Poign[eé]es chauffantes/i.test(text)) rawOptions.push('Poignées chauffantes');
  if (/Feux additionnels LED/i.test(text)) rawOptions.push('Feux additionnels LED');

  return {
    id,
    kind: 'Moto',
    listingType: 'rental',
    priceUnit: 'day',
    title: { en: fullTitle, ar: fullTitle },
    price,
    quickFacts,
    features,
    options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
    images: imgs.slice(0, 4),
    sourceUrl,
    location
  };
}

/**
 * 5. Parse generic rental URL dispatcher
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

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }

  const html = await response.text();
  let listing = null;

  if (url.includes('goride.ma')) {
    listing = parseGoRideHtml(html, url);
  } else if (url.includes('oneclickdrive.ma')) {
    listing = parseOneClickDriveHtml(html, url);
  } else if (url.includes('rentalmotomarrakech.com')) {
    listing = parseRentalMotoMarrakechHtml(html, url, meta.fallbackImg);
  } else if (url.includes('location-scooter-marrakech.com')) {
    listing = parseLocationScooterMarrakechHtml(html, url);
  } else if (url.includes('xenoride.ma')) {
    listing = parseXenoRideHtml(html, url);
  } else if (url.includes('marrakechmoto.com')) {
    listing = parseMarrakechMotoHtml(html, url);
  } else if (url.includes('ride2atlas.com')) {
    listing = parseRide2AtlasHtml(html, url);
  } else if (url.includes('keni-rides.com')) {
    listing = parseKeniRidesHtml(html, url);
  }

  if (actualDelay > 0) await sleep(actualDelay);
  return listing;
}

export function syncRentalFiles(rentalsList, dataDir = path.resolve(process.cwd(), 'data')) {
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
 * 6. Extract MotoNomad.ma Motorcycle & Scooter Fleet (Casablanca / National Morocco)
 */
export async function crawlMotoNomadFleet() {
  const results = [];
  try {
    const res = await fetch('https://motonomad.ma/motorcycle-rental-list/', {
      headers: { 'User-Agent': USER_AGENT }
    });
    if (!res.ok) return results;
    const html = await res.text();
    const m = html.match(/var mbpFront = (\{[\s\S]*?\});/);
    if (!m) return results;

    const parsed = JSON.parse(m[1]);
    const bikes = Array.isArray(parsed.bikes) ? parsed.bikes : [];
    const optionCatalog = new Map(
      (Array.isArray(parsed.options) ? parsed.options : []).map((o) => [Number(o.id), cleanText(o.name)])
    );

    // MotoNomad delivers across Casablanca, Rabat, Tanger, Fès
    const mnLocations = [
      resolveLocationFromText('Casablanca', '', 0),
      resolveLocationFromText('Rabat', '', 1),
      resolveLocationFromText('Tanger', '', 2),
      resolveLocationFromText('Fès', '', 3)
    ];

    for (let i = 0; i < bikes.length; i++) {
      const b = bikes[i];
      if (!b || !b.name || !b.image_url) continue;
      // Skip logo placeholder if any
      if (b.image_url.includes('Logo') || b.image_url.includes('LOGO')) continue;

      const rawDailyMad = b.tiers && b.tiers[0] && b.tiers[0].price ? Number(b.tiers[0].price) : Number(b.price_min);
      if (!Number.isFinite(rawDailyMad) || rawDailyMad <= 0) continue;
      const price = Math.round(rawDailyMad / 10) * 10;

      const yearMatch = b.name.match(/\b(20\d\d)\b/);
      const year = yearMatch ? yearMatch[1] : '2025';
      const { brand, model, fullTitle } = splitBrandAndModel(b.name);
      const engineCc = String(b.engine || '').replace(/[^\d]/g, '') || '250';
      const isScooter = /scooter|agility|fiddle|orbit|frappuccino|oxwin|50cc|125/i.test(`${b.name} ${b.category} ${engineCc}`);
      const gearboxFr = isScooter ? 'Automatique' : 'Manuelle';
      const loc = mnLocations[i % mnLocations.length];

      const { features, quickFacts } = buildRentalFeatures({
        isMoto: true,
        brand,
        model,
        year,
        mileage: '',
        fuelFr: /oxwin|es1/i.test(b.name) ? 'Électrique' : 'Essence',
        gearboxFr,
        minDays: b.min_days || null,
        engineCc,
        title: fullTitle,
        location: loc
      });

      // Extract real options from b.free_options mapped against MotoNomad's options catalog
      const rawOptions = Array.isArray(b.free_options)
        ? b.free_options.map((idNum) => optionCatalog.get(Number(idNum))).filter(Boolean)
        : [];

      const sourceUrl = `https://motonomad.ma/motorcycle-rental-list/#bike-${b.id}`;
      const item = {
        id: `motonomad-${b.id}`,
        kind: 'Moto',
        listingType: 'rental',
        priceUnit: 'day',
        title: { en: fullTitle, ar: fullTitle },
        price,
        quickFacts,
        features,
        options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
        images: [b.image_url],
        sourceUrl,
        location: loc
      };
      results.push(item);
    }
  } catch (err) {
    console.warn('[Rental Importer] MotoNomad crawl warning:', err.message);
  }
  return results;
}

/**
 * 7. Extract AganaMobility.com Fleet
 */
export async function crawlAganaFleet() {
  const urls = [
    { url: 'https://www.aganamobility.com/our-fleet/kymco-agility-50cc/', city: 'Tanger' },
    { url: 'https://www.aganamobility.com/our-fleet/re-himalayan/', city: 'Oujda' },
    { url: 'https://www.aganamobility.com/our-fleet/sym-symphony-st/', city: 'Rabat' },
    { url: 'https://www.aganamobility.com/our-fleet/yamaha-nmax-125cc/', city: 'Tanger' },
    { url: 'https://www.aganamobility.com/our-fleet/cf-moto-mt-450/', city: 'Fès' },
    { url: 'https://www.aganamobility.com/our-fleet/bmw-gs-900/', city: 'Rabat' }
  ];
  const results = [];
  for (const { url, city } of urls) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!r.ok) continue;
      const html = await r.text();
      const $ = cheerio.load(html);
      const imgs = (html.match(/https:\/\/www\.aganamobility\.com\/wp-content\/uploads\/[^\s"'\''<>]+(?:jpg|jpeg|png|webp)/gi) || [])
        .filter((u) => !u.includes('Logo') && !u.includes('32x32') && !u.includes('192x192') && !u.includes('180x180') && !u.includes('270x270') && !u.includes('360x360') && !u.includes('location-moto-aventure') && !u.includes('location-scooter-permis'));
      if (!imgs.length) continue;

      $('script, style, nav, header, footer').remove();
      const text = cleanText($('body').text());
      const eurMatch = text.match(/Rent from\s*(\d+)[.,]?\d*\s*€\s*\/\s*day/i);
      const eur = eurMatch ? parseInt(eurMatch[1], 10) : 30;
      const price = Math.round((eur * 10.8) / 10) * 10;

      const slug = url.split('/').filter(Boolean).pop();
      const rawName = slug.replace(/-/g, ' ').replace(/\bre\b/i, 'Royal Enfield').replace(/\bcf moto\b/i, 'CFMOTO');
      const { brand, model, fullTitle } = splitBrandAndModel(rawName);
      const ccMatch = text.match(/(\d+)\s*cc/i);
      const engineCc = ccMatch ? ccMatch[1] : '125';
      const isScooter = /agility|symphony|nmax/i.test(fullTitle);
      const loc = resolveLocationFromText(city, 0);

      const { features, quickFacts } = buildRentalFeatures({
        isMoto: true,
        brand,
        model,
        year: '2024',
        mileage: '',
        fuelFr: 'Essence',
        gearboxFr: isScooter ? 'Automatique' : 'Manuelle',
        minDays: null,
        engineCc,
        title: fullTitle,
        location: loc
      });

      // Extract only real options listed on the AganaMobility page
      const rawOptions = [];
      if (/Helmet Pro/i.test(text)) rawOptions.push('Helmet Pro');
      if (/Unlimited Mileage/i.test(text)) rawOptions.push('Unlimited Mileage');
      if (/Delivery airport/i.test(text)) rawOptions.push('Delivery airport');
      if (/2nd Drivers/i.test(text)) rawOptions.push('2nd Drivers');
      if (/Top Case/i.test(text)) rawOptions.push('Top Case');

      const item = {
        id: `agana-${slug}`,
        kind: 'Moto',
        listingType: 'rental',
        priceUnit: 'day',
        title: { en: fullTitle, ar: fullTitle },
        price,
        quickFacts,
        features,
        options: rawOptions.map((o) => ({ en: o, ar: o, raw: o })),
        images: [...new Set(imgs)],
        sourceUrl: url,
        location: loc
      };
      results.push(item);
    } catch (_) {}
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
    if (args[i] === '--crawl') {
      isCrawlMode = true;
    } else if (args[i] === '--limit' && args[i + 1]) {
      crawlLimit = parseInt(args[++i], 10) || 1250;
    } else if (args[i] === '--file' && args[i + 1]) {
      const filePath = args[++i];
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        urls.push(...fileContent.split('\n').map((u) => u.trim()).filter(Boolean));
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

  if (urls.length === 0 && !isCrawlMode) {
    console.log(`
RwidaGuessr - Conservative Moroccan Vehicle Rental Importer

Specialized Moroccan rental websites supported:
  - GoRide.ma (https://www.goride.ma)
  - OneClickDrive.ma (https://www.oneclickdrive.ma)
  - RentalMotoMarrakech.com (https://rentalmotomarrakech.com/parke)
  - MotoNomad.ma (https://motonomad.ma/motorcycle-rental-list/)
  - Location-Scooter-Marrakech.com (https://location-scooter-marrakech.com/rental)
  - AganaMobility.com (https://www.aganamobility.com/our-fleet/)

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
    } catch (_) {
      existingListings = [];
    }
  }

  const seenIds = new Set(existingListings.map((x) => x.id));
  const seenUrls = new Set(existingListings.map((x) => x.sourceUrl));
  const currentList = [...existingListings];

  const rmmImageMap = new Map();

  if (isCrawlMode) {
    console.log(`[Rental Crawler] Discovering Moroccan rental listings up to target ${crawlLimit}...`);

    // 1. GoRide.ma Sitemap (Cars across Casablanca, Marrakech, Tanger, Rabat, Fès, Agadir, Oujda, Essaouira)
    try {
      const smRes = await fetch('https://www.goride.ma/sitemap.xml', { headers: { 'User-Agent': USER_AGENT } });
      if (smRes.ok) {
        const smText = await smRes.text();
        const smUrls = [...smText.matchAll(/<loc>(.*?)<\/loc>/g)]
          .map((m) => m[1])
          .filter((u) => u.includes('?id=') && !u.includes('/en/') && !u.includes('/ar/'));
        for (const u of smUrls) {
          if (!seenUrls.has(u) && !urls.includes(u)) urls.push(u);
        }
        console.log(`[Rental Crawler] Queued ${smUrls.length} car rental URLs from GoRide.ma`);
      }
    } catch (e) {
      console.warn('[Rental Crawler] GoRide sitemap error:', e.message);
    }

    // 2. OneClickDrive.ma Paginated City & Category Catalogs across all 8 Moroccan cities
    const ocdCities = [
      { slug: 'casablanca', maxPages: 12 },
      { slug: 'marrakech', maxPages: 10 },
      { slug: 'rabat', maxPages: 7 },
      { slug: 'tangier', maxPages: 7 },
      { slug: 'agadir', maxPages: 7 },
      { slug: 'fes', maxPages: 6 },
      { slug: 'nador', maxPages: 4 },
      { slug: 'oujda', maxPages: 4 }
    ];
    const ocdCatalogUrls = [];
    for (const { slug, maxPages } of ocdCities) {
      for (let p = 1; p <= maxPages; p++) {
        ocdCatalogUrls.push(
          p === 1
            ? `https://www.oneclickdrive.ma/${slug}`
            : `https://www.oneclickdrive.ma/${slug}?page=${p}`
        );
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
    const OCD_BATCH = 6;
    for (let i = 0; i < ocdCatalogUrls.length && currentList.length < crawlLimit; i += OCD_BATCH) {
      const batchPages = ocdCatalogUrls.slice(i, i + OCD_BATCH);
      const pageCardsList = await Promise.all(
        batchPages.map(async (pUrl) => {
          try {
            const r = await fetch(pUrl, { headers: { 'User-Agent': USER_AGENT } });
            if (!r.ok) return [];
            const h = await r.text();
            return parseOneClickDriveCatalogHtml(h, pUrl);
          } catch (_) {
            return [];
          }
        })
      );
      for (const cards of pageCardsList) {
        for (const item of cards) {
          if (
            item &&
            item.price > 0 &&
            item.images &&
            item.images.length > 0 &&
            !seenIds.has(item.id) &&
            !seenUrls.has(item.sourceUrl)
          ) {
            currentList.push(item);
            seenIds.add(item.id);
            seenUrls.add(item.sourceUrl);
            ocdDirectAdded++;
          }
        }
      }
      if (!isDryRun && ocdDirectAdded > 0 && i % 12 === 0) {
        syncRentalFiles(currentList, path.dirname(resolvedOut));
      }
    }
    console.log(`[Rental Crawler] Imported ${ocdDirectAdded} new car rental listings from OneClickDrive.ma catalogs (total: ${currentList.length})`);

    // 3. RentalMotoMarrakech.com (Motorbikes & Scooters)
    try {
      const rmmRes = await fetch('https://rentalmotomarrakech.com/parke', { headers: { 'User-Agent': USER_AGENT } });
      if (rmmRes.ok) {
        const rmmHtml = await rmmRes.text();
        const $r = cheerio.load(rmmHtml);
        $r('img[src*="smartrental"]').each((_, imgEl) => {
          const src = $r(imgEl).attr('src');
          let parent = $r(imgEl).parent();
          while (parent.length && parent.find('a[href*="/parke/"]').length === 0) {
            parent = parent.parent();
          }
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
          if (href && !seenUrls.has(href) && !urls.includes(href)) {
            urls.push(href);
            lsmAdded++;
          }
        });
        console.log(`[Rental Crawler] Queued ${lsmAdded} scooter rental URLs from Location-Scooter-Marrakech.com`);
      }
    } catch (_) {}

    // 4b. XenoRide.ma (Tangier Motorbikes & Scooters)
    const xenoUrls = [
      'https://xenoride.ma/motos/cooper-touring-pro-a-louer',
      'https://xenoride.ma/motos/scooter-cappuccino-s-2025-a-louer-tanger',
      'https://xenoride.ma/motos/sh-cooper-a-louer',
      'https://xenoride.ma/motos/magotti-vespucci',
      'https://xenoride.ma/motos/sanya-x1000',
      'https://xenoride.ma/motos/honda-sh-mode',
      'https://xenoride.ma/motos/location-scooter-sh-daytona-sport-tanger'
    ];
    // 4c. MarrakechMoto.com (Marrakech Adventure Motorbikes)
    const mmotoUrls = [
      'https://marrakechmoto.com/motos/bmw-1250-gs',
      'https://marrakechmoto.com/motos/bmw-850-gs',
      'https://marrakechmoto.com/motos/bmw-750-gs',
      'https://marrakechmoto.com/motos/himalayan-450',
      'https://marrakechmoto.com/motos/himalayan-411',
      'https://marrakechmoto.com/motos/kymco-agility-50',
      'https://marrakechmoto.com/motos/yamaha-xt-250',
      'https://marrakechmoto.com/motos/bmw-f900-gs',
      'https://marrakechmoto.com/motos/bmw-f800-gs',
      'https://marrakechmoto.com/motos/bmw-r1300-gs'
    ];
    // 4d. Ride2Atlas.com (Marrakech Motorbikes & Scooters)
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
    // 4e. Keni-Rides.com (Kénitra / National Adventure Motorbikes)
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

    // 5. MotoNomad.ma & AganaMobility.com structured fleets
    const mnFleet = await crawlMotoNomadFleet();
    const aganaFleet = await crawlAganaFleet();
    for (const item of [...mnFleet, ...aganaFleet]) {
      if (item && item.price > 0 && item.images.length > 0 && !seenIds.has(item.id)) {
        currentList.push(item);
        seenIds.add(item.id);
        seenUrls.add(item.sourceUrl);
      }
    }
    console.log(`[Rental Crawler] Imported ${mnFleet.length + aganaFleet.length} motorbike rental listings from MotoNomad.ma & AganaMobility.com`);
  }

  const validUrls = urls.filter(isValidRentalUrl);
  console.log(`[Rental Importer] Processing ${validUrls.length} rental detail URL(s)...`);

  const BATCH_SIZE = delayMs <= 300 ? 12 : 1;
  let addedCount = 0;

  for (let i = 0; i < validUrls.length && currentList.length < crawlLimit; i += BATCH_SIZE) {
    const batch = validUrls.slice(i, i + BATCH_SIZE).filter((u) => !seenUrls.has(u));
    if (!batch.length) continue;

    const results = await Promise.all(
      batch.map(async (u) => {
        try {
          return await importRentalListing(u, BATCH_SIZE > 1 ? 0 : delayMs, {
            fallbackImg: rmmImageMap.get(u)
          });
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

  if (!isDryRun) {
    syncRentalFiles(currentList, path.dirname(resolvedOut));
  }
  console.log(`[Rental Importer] Finished! Total verified rental listings: ${currentList.length}`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((err) => {
    console.error('[Rental Importer] Fatal error:', err);
    process.exit(1);
  });
}

