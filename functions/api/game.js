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
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const randomUint = crypto.getRandomValues(new Uint32Array(1))[0];
    const j = Math.floor((randomUint / 0x100000000) * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}
function sample(items, count) {
  const shuffled = shuffle(items);
  return shuffled.slice(0, Math.min(count, shuffled.length));
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

export function detectCarBodyType(item) {
  const title = (typeof item.title === 'object' ? (item.title?.en || item.title?.ar || '') : String(item.title || '')).toLowerCase();
  if (/duster|tucson|sportage|tiguan|kodiaq|tarraco|rav4|cr-v|cx-5|cx-3|cx-30|q2|q3|q5|q7|q8|x1|x2|x3|x4|x5|x6|x7|gla|glb|glc|gle|gls|classe g|cayenne|macan|range rover|evoque|velar|defender|discovery|land cruiser|prado|patrol|stelvio|tonale|renegade|compass|wrangler|cherokee|captur|2008|3008|5008|c3 aircross|c5 aircross|juke|qashqai|x-trail|ateca|arona|formentor|kuga|taigo|t-roc|t-cross|kamiq|karoq|kadjar|austral|arkana|koleos|grandland|crossland|mokka|frontera|santa fe|sorento|niro|stonic|kona|bayon|ecosport|edge|explorer|puma|stepway|lodgy|xv\b|forester|outback|escalade|levante|grecale|urus|bentayga|cullinan|dbx|e-tron/i.test(title)) {
    return { en: 'SUV / 4x4', ar: 'رباعية الدفع \u2066(SUV / 4x4)\u2069' };
  }
  if (/berlingo|partner|combo|rifter|caddy|dokker|express|kangoo|transit|custom|transporter|expert|jumpy|scudo|vito|traffic|trafic|master|boxer|ducato|jumper|crafter|sprinter|doblo|bipper|nemo|fiorino|courier|connect/i.test(title)) {
    return { en: 'Utility / Van (Utilitaire)', ar: 'نفعية \u2066(Utilitaire)\u2069' };
  }
  if (/picanto|i10|up!|c1|108|aygo|panda|500\b|twingo|clio|208|c3|yaris|i20|rio|polo|ibiza|micra|sandero|fiesta|corsa|fabia|swift|jazz|spark|matiz|ka\b|adam|space star|alto|celerio/i.test(title)) {
    return { en: 'City car (Citadine)', ar: 'سيارة مدينة \u2066(Citadine)\u2069' };
  }
  if (/golf|leon|a3|s[eé]rie\s*1|classe\s*a|megane|308|focus|tipo|ceed|i30|corolla|auris|astra|civic|scala|giulietta|ct200h/i.test(title)) {
    return { en: 'Compact (Compacte)', ar: 'مدمجة \u2066(Compacte)\u2069' };
  }
  if (/passat|superb|arteon|a4|a6|a8|s[eé]rie\s*3|s[eé]rie\s*5|s[eé]rie\s*7|classe\s*c|classe\s*e|classe\s*s|mondeo|508|octavia|talisman|accord|camry|logan|c-elys[eé]e|avensis|insignia|accent|elantra|sonata|optima|k5|cerato|peugeot 301|301|symbol|fluence|latitude|s60|s90|xe\b|xf\b|xj\b|is\b|es\b|gs\b|ls\b|panamera|taycan|model 3|model s/i.test(title)) {
    return { en: 'Sedan (Berline)', ar: 'سيدان \u2066(Berline)\u2069' };
  }
  if (/mustang|camaro|tt\b|s[eé]rie\s*4|s[eé]rie\s*2|s[eé]rie\s*8|classe\s*c\s*coup[eé]|classe\s*e\s*coup[eé]|porsche\s*911|cayman|boxster|rcz|gt86|brz|mx-5|miata|slk|slc|z4|f-type/i.test(title)) {
    return { en: 'Coupé / Sport', ar: 'كوبيه \u2066(Coupé)\u2069' };
  }
  return { en: 'Sedan (Berline)', ar: 'سيدان \u2066(Berline)\u2069' };
}

export function sanitizeListingFeatures(item, isRental = false) {
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
  if (isCar) {
    // Keep ONLY genuine car features:
    // Brand, Model, Year, Mileage, Fuel, Gearbox, Doors (if present)
    // PLUS Body type (Carrosserie)
    // Drop all made-up/unreliable features: Customs status, Origin, Horsepower, Condition, 1ère main, Colour, etc.
    const genuineFeatures = [];
    let hasBrand = false;
    let hasModel = false;
    let hasYear = false;
    let hasMileage = false;
    let hasFuel = false;
    let hasGearbox = false;
    let hasDoors = false;
    let hasBodyType = false;

    for (const f of item.features) {
      const label = f.label;
      const en = (label && typeof label === 'object' ? (label.en || label.fr || label.raw || '') : String(label || '')).toLowerCase().trim();
      const ar = (label && typeof label === 'object' ? (label.ar || '') : '').toLowerCase().trim();
      const val = f.value && typeof f.value === 'object' ? (f.value.en || f.value.fr || f.value.raw || '') : String(f.value || '');
      const valStr = String(val).toLowerCase().trim();
      if (!valStr || valStr === 'n/a' || valStr === 'null' || valStr === 'undefined') continue;

      if ((en === 'brand' || en === 'marque' || ar === 'العلامة' || ar.includes('علامة')) && !hasBrand) {
        genuineFeatures.push(f);
        hasBrand = true;
      } else if ((en === 'model' || en === 'modèle' || ar === 'الطراز' || ar.includes('طراز')) && !hasModel) {
        genuineFeatures.push(f);
        hasModel = true;
      } else if ((en === 'year' || en.startsWith('année') || en === 'annee' || ar === 'السنة' || ar.includes('سنة')) && !hasYear) {
        genuineFeatures.push(f);
        hasYear = true;
      } else if ((en === 'mileage' || en.startsWith('kilom') || ar.includes('مسافة')) && !hasMileage) {
        genuineFeatures.push(f);
        hasMileage = true;
      } else if ((en === 'fuel' || en.startsWith('carburant') || ar.includes('وقود')) && !hasFuel) {
        genuineFeatures.push(f);
        hasFuel = true;
      } else if ((en === 'gearbox' || en.startsWith('boite') || en.startsWith('boîte') || ar.includes('علبة السرعات')) && !hasGearbox) {
        genuineFeatures.push(f);
        hasGearbox = true;
      } else if ((en === 'doors' || en === 'door' || en.startsWith('porte') || ar.includes('أبواب')) && !hasDoors) {
        genuineFeatures.push(f);
        hasDoors = true;
      } else if ((en.includes('body type') || en.includes('carrosserie') || ar.includes('نوع الهيكل')) && !hasBodyType) {
        genuineFeatures.push(f);
        hasBodyType = true;
      }
    }

    if (injectFuelRow && !hasFuel) {
      genuineFeatures.push({ label: { en: 'Fuel', ar: 'الوقود' }, value: { en: 'Electric', ar: 'كهربائي' } });
      hasFuel = true;
    }

    if (!hasGearbox) {
      let gbFact = (item.quickFacts || []).find((q) => {
        const val = (typeof q === 'object' ? (q.en || q.ar || '') : String(q)).toLowerCase();
        return val.includes('auto') || val.includes('man') || val.includes('أوطو') || val.includes('ماني');
      });
      if (gbFact) {
        genuineFeatures.push({ label: { en: 'Gearbox', ar: 'علبة السرعات' }, value: gbFact });
      } else {
        genuineFeatures.push({ label: { en: 'Gearbox', ar: 'علبة السرعات' }, value: { en: 'Manual', ar: 'مانييل' } });
      }
    }

    if (!hasBodyType) {
      const b = detectCarBodyType(item);
      genuineFeatures.push({
        label: { en: 'Body type (Carrosserie)', ar: 'نوع الهيكل \u2066(Carrosserie)\u2069' },
        value: b
      });
    }

    return genuineFeatures;
  }

  const out = [];
  for (const f of item.features) {
    const label = f.label;
    const en = (label && typeof label === 'object' ? (label.en || label.fr || label.raw || '') : String(label || '')).toLowerCase().trim();
    const ar = (label && typeof label === 'object' ? (label.ar || '') : '').toLowerCase().trim();
    const val = f.value && typeof f.value === 'object' ? (f.value.en || f.value.fr || f.value.raw || '') : String(f.value || '');
    if (!val || val.toLowerCase() === 'n/a') continue;
    if (en === 'city' || en.includes('city') || en.includes('ville') || ar.includes('مدينة')) continue;
    if (en.includes('transmission') || ar.includes('ناقل الحركة')) continue;
    if (en.includes('gearbox') || en.includes('boite') || en.includes('boîte') || ar.includes('علبة السرعات')) continue;
    if (en.includes('custom') || en.includes('douane') || ar.includes('جمارك')) continue;
    if (en.includes('first owner') || en.includes('1ère') || en.includes('première') || ar.includes('الأول')) continue;
    if (en.includes('condition') || en.includes('état') || en.includes('etat') || ar.includes('حالة')) continue;
    if (en.includes('body type') || en.includes('carrosserie') || ar.includes('نوع الهيكل')) continue;
    if (en.includes('door') || en.includes('porte') || ar.includes('أبواب')) continue;
    if (en.includes('horsepower') || ar.includes('حصان') || en.includes('puissance')) continue;
    if (en.includes('origin') || en.includes('origine') || ar.includes('الأصل')) continue;
    if (isRental) {
      if (en.includes('security deposit') || en.includes('caution') || ar.includes('ضمانة')) continue;
    }
    out.push(f);
  }
  return out;
}

export function sanitizeListingQuickFacts(item, isRental = false) {
  if (!Array.isArray(item.quickFacts)) return [];
  const isBike = (item.kind || '').toLowerCase().includes('moto') || (item.kind || '').toLowerCase().includes('bike');
  return item.quickFacts.filter((q) => {
    const val = (typeof q === 'object' ? (q.en || q.fr || q.ar || '') : String(q || '')).toLowerCase().trim();
    if (!val) return false;
    if (isBike && (val.includes('auto') || val.includes('man') || val.includes('أوطو') || val.includes('ماني'))) return false;
    if (isRental || isBike) {
      if (val.includes('dédouan') || val.includes('dedouan') || val.includes('ww au maroc') || val.includes('مجمركة') || val.includes('جمرك')) return false;
    }
    if (isRental) {
      if (val.includes('1ère') || val.includes('main')) return false;
      if (/\b\d+\s*cv\b/i.test(val) || val.includes('خيل')) return false;
    }
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

  pool = dedupByModel(shuffle(pool));

  // Deprioritize vehicles recently seen in this user session
  const rawExclude = url.searchParams.get('exclude') || '';
  const excludeIds = new Set(rawExclude.split(',').map((id) => id.trim()).filter(Boolean));
  if (excludeIds.size > 0 && pool.length > 5) {
    const unseen = pool.filter((item) => !excludeIds.has(item.id));
    if (unseen.length >= 15) {
      pool = unseen;
    } else if (unseen.length >= 5) {
      const seen = pool.filter((item) => excludeIds.has(item.id));
      pool = [...unseen, ...shuffle(seen).slice(0, 15 - unseen.length)];
    }
  }

  const sampleCount = Math.min(pool.length, 15);
  const sampledItems = sample(pool, sampleCount);

  const signedListings = await Promise.all(sampledItems.map(async ({ price, summary, sourceUrl, _priceSource, ...publicListing }) => {
    const listingType = isRental ? 'rental' : (publicListing.listingType || 'sale');
    const payload = base64url(new TextEncoder().encode(JSON.stringify({ id: publicListing.id, listingType, expiresAt })));
    return {
      ...publicListing,
      location: publicListing.location || { city: 'Maroc', region: 'Maroc' },
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
