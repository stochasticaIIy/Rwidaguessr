import { DEFAULT_LISTINGS } from '../../data/listings.data.js';
import { DEFAULT_RENTAL_LISTINGS } from '../../data/rentals.data.js';

const MAX_SECONDS = 50 * 60;
const FALLBACK_SECRET = 'rwida-guessr-cloud-signing-key-production-fallback';

function base64url(bytes) {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
async function sign(text, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text))));
}
function sample(items, count) {
  return [...items].sort(() => crypto.getRandomValues(new Uint32Array(1))[0] - 0x80000000).slice(0, count);
}

function getModelKey(item) {
  const fMap = {};
  if (Array.isArray(item.features)) {
    for (const f of item.features) {
      const lbl = f.label && typeof f.label === 'object' ? (f.label.en || f.label.fr || f.label.ar || f.label.raw || '') : String(f.label || '');
      const val = f.value && typeof f.value === 'object' ? (f.value.en || f.value.fr || f.value.ar || f.value.raw || '') : String(f.value || '');
      fMap[String(lbl).toLowerCase().trim()] = val;
    }
  }
  const brand = fMap['brand'] || '';
  const model = fMap['model'] || '';
  const title = item.title && typeof item.title === 'object' ? (item.title.en || item.title.ar || '') : String(item.title || '');
  return `${brand} ${model} ${title}`
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupByModel(items) {
  const seen = new Map();
  for (const item of items) {
    const k = getModelKey(item);
    if (!k) { seen.set(Symbol(), item); continue; }
    if (!seen.has(k)) seen.set(k, item);
  }
  const deduped = [...seen.values()];
  return deduped.length >= 5 ? deduped : items;
}

function sanitizeListingFeatures(item, isRental = false) {
  if (!Array.isArray(item.features)) return item.features;
  const fuel = getListingFuel(item);
  const isCar = !((item.kind || '').toLowerCase().includes('moto') || (item.kind || '').toLowerCase().includes('bike'));
  let hasMotorisationElectric = false;
  let motorisationLabelMatch = false;
  let hasExplicitFuelRow = false;
  for (const f of item.features) {
    const lbl = f.label && typeof f.label === 'object' ? (f.label.en || f.label.fr || f.label.raw || '') : String(f.label || '');
    const lblLo = String(lbl).toLowerCase().trim();
    if (lblLo === 'motorisation' || lblLo.includes('motorisation')) {
      motorisationLabelMatch = true;
      const val = f.value && typeof f.value === 'object' ? (f.value.en || f.value.fr || f.value.raw || f.value.ar || '') : String(f.value || '');
      const v = String(val).toLowerCase();
      if (v.includes('electric') || v.includes('electrique') || v.includes('électrique') || v.includes('كهربائي')) hasMotorisationElectric = true;
    }
    if (lblLo.includes('fuel') || lblLo.includes('carburant') || lblLo.includes('وقود')) {
      hasExplicitFuelRow = true;
    }
  }
  const isElectricCar = isCar && (fuel === 'electric' || (motorisationLabelMatch && hasMotorisationElectric));
  const injectFuelRow = isElectricCar && hasMotorisationElectric && !hasExplicitFuelRow;
  const out = [];
  for (const f of item.features) {
    const label = f.label;
    const en = (label && typeof label === 'object' ? (label.en || label.fr || label.raw || '') : String(label || '')).toLowerCase().trim();
    const ar = (label && typeof label === 'object' ? (label.ar || '') : '').toLowerCase().trim();
    const val = f.value && typeof f.value === 'object' ? (f.value.en || f.value.fr || f.value.raw || '') : String(f.value || '');
    if (!val || val.toLowerCase() === 'n/a') continue;
    if (en === 'city' || en.includes('city') || en.includes('ville') || ar.includes('مدينة')) continue;
    if (en.includes('transmission') || ar.includes('ناقل الحركة')) continue;
    if ((en.includes('horsepower') && !en.includes('tax') && !en.includes('fiscale')) || (ar.includes('حصان') && !ar.includes('جبائية') && !ar.includes('ضريب')) || en.includes('puissance din')) continue;
    if (isElectricCar) {
      if (en === 'motorisation' || ar.includes('motorisation')) continue;
    }
    if (isRental) {
      if (en.includes('security deposit') || en.includes('caution') || ar.includes('ضمانة')) continue;
      if (en.includes('custom') || en.includes('douane') || ar.includes('جمارك')) continue;
      if (en.includes('tax horsepower') || en === 'tax hp' || en.includes('puissance fiscale') || ar.includes('الجبائية')) continue;
      if (en.includes('1ère main') || en.includes('première main') || en.includes('first owner') || ar.includes('المالك الأول')) continue;
      if (en.includes('condition') || ar.includes('الحالة والصيانة')) continue;
    }
    if (injectFuelRow && en.includes('year')) {
      out.push({ label: { en: 'Fuel', ar: 'الوقود' }, value: { en: 'Electric', ar: 'كهربائي' } });
    }
    out.push(f);
  }
  if (injectFuelRow && !out.some(f => {
    const en = ((f.label && typeof f.label === 'object' ? (f.label.en || '') : '') || '').toLowerCase().trim();
    return en.includes('fuel') || en.includes('carburant');
  })) {
    out.unshift({ label: { en: 'Fuel', ar: 'الوقود' }, value: { en: 'Electric', ar: 'كهربائي' } });
  }
  return out;
}

function sanitizeListingQuickFacts(item, isRental = false) {
  if (!Array.isArray(item.quickFacts)) return [];
  if (!isRental) return item.quickFacts;
  return item.quickFacts.filter((q) => {
    const val = (typeof q === 'object' ? (q.en || q.fr || q.ar || '') : String(q || '')).toLowerCase().trim();
    if (!val) return false;
    if (val.includes('dédouan') || val.includes('dedouan') || val.includes('ww au maroc') || val.includes('مجمركة') || val.includes('جمرك')) return false;
    if (val.includes('1ère') || val.includes('main')) return false;
    if (/\b\d+\s*cv\b/i.test(val) || val.includes('خيل')) return false;
    return true;
  });
}

function sanitizeListingOptions(item) {
  if (!Array.isArray(item.options)) return [];
  return item.options.filter((opt) => {
    const raw = (opt && typeof opt === 'object' ? (opt.raw || opt.fr || opt.en || opt.ar || '') : String(opt || '')).toLowerCase().trim();
    if (raw.includes('état du véhicule') || raw.includes('etat du vehicule') || raw.includes('حالة المركبة') || raw.includes('حالة السيارة')) {
      return false;
    }
    return true;
  });
}

function getListingFuel(item) {
  if (!item) return '';
  const fuelFeature = (item.features || []).find((f) => {
    const lbl = (f.label && (f.label.en || f.label.fr || f.label.ar || f.label)) || '';
    const l = String(lbl).toLowerCase();
    return l.includes('fuel') || l.includes('carburant') || l.includes('وقود');
  });
  if (fuelFeature) {
    const val = (fuelFeature.value && (fuelFeature.value.en || fuelFeature.value.fr || fuelFeature.value.ar || fuelFeature.value)) || '';
    const v = String(val).toLowerCase();
    if (v.includes('diesel') || v.includes('ديزل') || v.includes('مازوط')) return 'diesel';
    if (v.includes('petrol') || v.includes('essence') || v.includes('بنزين') || v.includes('ليسانس')) return 'petrol';
    if (v.includes('electric') || v.includes('electrique') || v.includes('électrique') || v.includes('كهربائي')) return 'electric';
    if (v.includes('hybrid') || v.includes('hybride') || v.includes('هجين')) return 'hybrid';
  }
  for (const q of (item.quickFacts || [])) {
    const val = (typeof q === 'object' ? (q.en || q.fr || q.ar || '') : String(q || '')).toLowerCase();
    if (val.includes('diesel') || val.includes('ديزل') || val.includes('مازوط')) return 'diesel';
    if (val.includes('essence') || val.includes('petrol') || val.includes('بنزين') || val.includes('ليسانس')) return 'petrol';
    if (val.includes('electric') || val.includes('electrique') || val.includes('électrique') || val.includes('كهربائي')) return 'electric';
    if (val.includes('hybrid') || val.includes('hybride') || val.includes('هجين')) return 'hybrid';
  }
  if ((item.kind || '').toLowerCase().includes('moto') || (item.kind || '').toLowerCase().includes('bike')) {
    return 'petrol';
  }
  return '';
}

export const LUXURY_BRANDS = [
  'mercedes-benz', 'mercedes', 'bmw', 'audi', 'porsche', 'jaguar', 'maserati',
  'alfa romeo', 'lexus', 'volvo', 'bentley', 'ferrari', 'lamborghini',
  'aston martin', 'rolls-royce', 'cadillac', 'tesla'
];

export function isSuv(item) {
  if (!item) return false;
  const brand = (item.features?.find(f => /brand|marque|علامة/i.test(f.label?.en || f.label?.fr || f.label?.ar || f.label))?.value?.en || '').toLowerCase();
  const title = (item.title?.en || item.title?.ar || item.title || '').toLowerCase();
  const bodyFeat = (item.features?.find(f => /body|carrosserie|هيكل/i.test(f.label?.en || f.label?.fr || f.label?.ar || f.label))?.value?.en || '').toLowerCase();
  if (/suv|4x4|crossover|tout-terrain/i.test(bodyFeat)) return true;
  if (/land rover|range rover|jeep/i.test(brand) || /land rover|range rover|jeep/i.test(title)) return true;
  return /duster|tucson|sportage|tiguan|touareg|kodiaq|tarraco|rav4|cr-v|cx-5|cx-3|cx-30|cx-60|cx-90|q2|q3|q5|q7|q8|x1|x2|x3|x4|x5|x6|x7|\bxm\b|ix\b|ix1|ix3|gla|glb|glc|gle|gls|classe g\b|g63\b|cayenne|macan|range rover|evoque|velar|defender|discovery|land cruiser|prado|patrol|stelvio|tonale|renegade|compass|wrangler|cherokee|captur|2008|3008|5008|c3 aircross|c5 aircross|juke|qashqai|x-trail|ateca|arona|formentor|kuga|taigo|t-roc|t-cross|kamiq|karoq|kadjar|austral|arkana|koleos|grandland|crossland|mokka|frontera|santa fe|sorento|niro|stonic|kona|bayon|ecosport|edge|explorer|puma|stepway|lodgy|xv\b|forester|outback|escalade|levante|grecale|urus|bentayga|cullinan|dbx|e-tron/i.test(title);
}

export function isLuxuryExcludingSuv(item) {
  if (!item || isSuv(item)) return false;
  const brand = (item.features?.find(f => /brand|marque|علامة/i.test(f.label?.en || f.label?.fr || f.label?.ar || f.label))?.value?.en || '').toLowerCase();
  const title = (item.title?.en || item.title?.ar || item.title || '').toLowerCase();
  return LUXURY_BRANDS.some(lb => brand.includes(lb) || new RegExp('\\b' + lb.replace('-', '[\\s-]') + '\\b', 'i').test(title));
}

export function isEverydayCar(item) {
  if (!item) return false;
  const k = (item.kind || '').toLowerCase();
  if (k.includes('moto') || k.includes('bike')) return false;
  return !isSuv(item) && !isLuxuryExcludingSuv(item);
}

export async function onRequestGet({ request, env = {} }) {
  const signingSecret = env.GAME_SIGNING_SECRET || env.APP_SECRET || FALLBACK_SECRET;
  const url = new URL(request.url);
  const rawType = (url.searchParams.get('type') || '').toLowerCase().trim();
  const rawMode = (url.searchParams.get('mode') || '').toLowerCase().trim();
  const carType = (url.searchParams.get('carType') || url.searchParams.get('cartype') || '').toLowerCase().trim();
  const isRental = rawType === 'rental' || rawType === 'rent' || rawType === 'location' || rawMode.startsWith('rental');

  let listings = isRental ? DEFAULT_RENTAL_LISTINGS : DEFAULT_LISTINGS;
  if (isRental && env.RENTAL_LISTINGS_JSON) {
    try { listings = JSON.parse(env.RENTAL_LISTINGS_JSON); } catch (_) {}
  } else if (!isRental && env.LISTINGS_JSON) {
    try { listings = JSON.parse(env.LISTINGS_JSON); } catch (_) {}
  }
  const valid = (listings || []).filter((item) => item.id && Number.isFinite(item.price) && item.title && item.features);
  if (valid.length < 5) return Response.json({ error: 'At least five valid listings are required.' }, { status: 503 });
  const desiredSeconds = Number(url.searchParams.get('seconds')) || 120;
  const seconds = Math.min(MAX_SECONDS, Math.max(30, desiredSeconds));
  const expiresAt = Date.now() + seconds * 1000 + 10_000;

  const mode = rawMode.replace(/^rental[_-]?/, '');
  const activeCarType = carType || (['everyday', 'suv', 'suvs', 'luxury', 'luxury_no_suv'].includes(mode) ? mode : '');
  let pool = valid;
  const isCarMode = mode === 'cars' || mode === 'car' || mode === 'voiture' || ['everyday', 'suv', 'suvs', 'luxury', 'luxury_no_suv'].includes(mode);

  if (isCarMode) {
    let cars = valid.filter((item) => {
      const k = (item.kind || '').toLowerCase();
      return k.includes('car') || k.includes('voiture');
    });
    if (activeCarType && activeCarType !== 'all') {
      if (activeCarType === 'suv' || activeCarType === 'suvs') {
        const suvCars = cars.filter(isSuv);
        if (suvCars.length >= 5) cars = suvCars;
      } else if (activeCarType === 'luxury' || activeCarType === 'luxury_no_suv') {
        const luxCars = cars.filter(isLuxuryExcludingSuv);
        if (luxCars.length >= 5) cars = luxCars;
      } else if (activeCarType === 'everyday') {
        const everydayCars = cars.filter(isEverydayCar);
        if (everydayCars.length >= 5) cars = everydayCars;
      }
    }
    if (cars.length >= 5) pool = cars;
  } else if (mode === 'motorbikes' || mode === 'moto' || mode === 'motos' || mode === 'motorcycle') {
    const motos = valid.filter((item) => {
      const k = (item.kind || '').toLowerCase();
      return k.includes('moto') || k.includes('bike');
    });
    if (motos.length >= 5) pool = motos;
  }

  const isMotoMode = mode === 'motorbikes' || mode === 'moto' || mode === 'motos' || mode === 'motorcycle';
  const fuel = isMotoMode ? '' : (url.searchParams.get('fuel') || '').toLowerCase().trim();

  const isMatchFuel = (item, f) => {
    if (!f || f === 'all') return true;
    const lf = getListingFuel(item);
    if (f === 'diesel') return lf === 'diesel';
    if (f === 'petrol' || f === 'essence') return lf === 'petrol';
    if (f === 'hybrid') return lf === 'hybrid';
    if (f === 'electric' || f === 'electrique') return lf === 'electric';
    if (f === 'eco' || f === 'electric_hybrid') return lf === 'electric' || lf === 'hybrid';
    return true;
  };

  if (fuel && fuel !== 'all') {
    const fuelFiltered = pool.filter((item) => isMatchFuel(item, fuel));
    if (fuelFiltered.length >= 5) pool = fuelFiltered;
  }

  pool = dedupByModel(pool);

  const sampleCount = Math.min(pool.length, 15);
  const sampledItems = sample(pool, sampleCount);

  const signedListings = await Promise.all(sampledItems.map(async ({ price, summary, ...publicListing }) => {
    const listingType = isRental ? 'rental' : (publicListing.listingType || 'sale');
    const payload = base64url(new TextEncoder().encode(JSON.stringify({ id: publicListing.id, listingType, expiresAt })));
    return {
      ...publicListing,
      listingType,
      priceUnit: isRental ? 'day' : (publicListing.priceUnit || 'total'),
      quickFacts: sanitizeListingQuickFacts(publicListing, isRental),
      features: sanitizeListingFeatures(publicListing, isRental),
      options: sanitizeListingOptions(publicListing),
      token: `${payload}.${await sign(payload, signingSecret)}`
    };
  }));

  const round = signedListings.slice(0, 5);
  const reserves = signedListings.slice(5);
  return Response.json({ round, reserves, listingType: isRental ? 'rental' : 'sale' }, { headers: { 'cache-control': 'no-store' } });
}
