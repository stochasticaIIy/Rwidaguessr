import { DEFAULT_LISTINGS } from '../../data/listings.data.js';

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

function sanitizeListingFeatures(item) {
  if (!Array.isArray(item.features)) return item.features;
  return item.features.filter((f) => {
    const label = f.label;
    const en = (label && typeof label === 'object' ? (label.en || label.fr || label.raw || '') : String(label || '')).toLowerCase().trim();
    const ar = (label && typeof label === 'object' ? (label.ar || '') : '').toLowerCase().trim();
    if (en.includes('tax horsepower') || en === 'tax hp' || en.includes('puissance fiscale') || ar.includes('الجبائية')) return false;
    if (en.includes('transmission') || ar.includes('ناقل الحركة')) return false;
    // Remove horsepower completely per user request and replace with statut de douane
    if (en.includes('horsepower') || ar.includes('حصان') || en.includes('power')) return false;
    if (en.includes('body type') || en.includes('carrosserie') || ar.includes('نوع الهيكل') || ar.includes('هيكل')) return false;
    const val = f.value && typeof f.value === 'object' ? (f.value.en || f.value.fr || f.value.raw || '') : String(f.value || '');
    if (!val || val.toLowerCase() === 'n/a') return false;
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

const PRICE_SCRUB_REGEX = /(?:💰|prix|ثمن|tarif|vendu|cout|coût)?\s*[:=]?\s*\d{1,3}(?:[\s.,]\d{3})*\s*(?:dh|mad|dhs|درهم|د\.م|مليون|سنتيم)\b|(?:prix|ثمن)\s*[:=]?\s*[\d\s.,*]+(?:\b|dh|درهم)|(?:prix\s*fixe|prix\s*n[ée]gociable|prix\s*[àa]\s*d[ée]battre|bon\s*prix|ثمن\s*مناسب|قابل\s*للتفاوض|الثمن\s*التالي)|(?:الضريبة|ضريبة)\s*[:=]?\s*\d+\s*(?:dh|درهم)?/gi;

function sanitizeListingSummary(item) {
  if (!item.summary) return item.summary;
  const cleanStr = (str) => {
    if (!str || typeof str !== 'string') return str;
    let cleaned = str
      .replace(/^découvrez\s+l['’]annonce\s+.*?(?=[\u0600-\u06FF]|$)/i, '')
      .replace(/\b\d{4}[A-Za-z]+_phrase\b\.?/gi, '')
      .replace(/\bcarburant\s*:\s*[\w\s-]+\.?/gi, '')
      .replace(/\bréférence\s*\d+\s*sur\s*moteur\.ma\.?/gi, '')
      .replace(/\bsur\s*moteur\.ma\.?/gi, '')
      .replace(PRICE_SCRUB_REGEX, '')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned;
  };

  if (typeof item.summary === 'string') {
    return cleanStr(item.summary);
  }
  return {
    ...item.summary,
    original: cleanStr(item.summary.original),
    ar: cleanStr(item.summary.ar),
    en: cleanStr(item.summary.en)
  };
}

export async function onRequestGet({ request, env = {} }) {
  const signingSecret = env.GAME_SIGNING_SECRET || env.APP_SECRET || FALLBACK_SECRET;
  let listings = DEFAULT_LISTINGS;
  if (env.LISTINGS_JSON) {
    try { listings = JSON.parse(env.LISTINGS_JSON); } catch (_) {}
  }
  const valid = (listings || []).filter((item) => item.id && Number.isFinite(item.price) && item.title && item.summary && item.features);
  if (valid.length < 5) return Response.json({ error: 'At least five valid listings are required.' }, { status: 503 });
  const url = new URL(request.url);
  const desiredSeconds = Number(url.searchParams.get('seconds')) || 120;
  const seconds = Math.min(MAX_SECONDS, Math.max(30, desiredSeconds));
  const expiresAt = Date.now() + seconds * 1000 + 10_000;

  const mode = (url.searchParams.get('mode') || '').toLowerCase().trim();
  let pool = valid;
  if (mode === 'cars' || mode === 'car' || mode === 'voiture') {
    const cars = valid.filter((item) => {
      const k = (item.kind || '').toLowerCase();
      return k.includes('car') || k.includes('voiture');
    });
    if (cars.length >= 5) pool = cars;
  } else if (mode === 'motorbikes' || mode === 'moto' || mode === 'motos' || mode === 'motorcycle') {
    const motos = valid.filter((item) => {
      const k = (item.kind || '').toLowerCase();
      return k.includes('moto') || k.includes('bike');
    });
    if (motos.length >= 5) pool = motos;
  }

  const isMotoMode = mode === 'motorbikes' || mode === 'moto' || mode === 'motos' || mode === 'motorcycle';
  const region = (url.searchParams.get('region') || '').toLowerCase().trim();
  const fuel = isMotoMode ? '' : (url.searchParams.get('fuel') || '').toLowerCase().trim();

  const isMatchRegion = (item, r) => {
    if (!r || r === 'all') return true;
    return (item.location && item.location.region || '').toLowerCase() === r;
  };
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

  if ((region && region !== 'all') && (fuel && fuel !== 'all')) {
    const both = pool.filter((item) => isMatchRegion(item, region) && isMatchFuel(item, fuel));
    if (both.length >= 5) {
      pool = both;
    } else if (both.length > 0) {
      const sameFuel = pool.filter((item) => isMatchFuel(item, fuel) && !isMatchRegion(item, region));
      pool = [...both, ...sameFuel];
      if (pool.length < 5) {
        const sameRegion = pool.filter((item) => isMatchRegion(item, region) && !isMatchFuel(item, fuel));
        pool = [...pool, ...sameRegion];
      }
    }
  } else if (region && region !== 'all') {
    const regional = pool.filter((item) => isMatchRegion(item, region));
    if (regional.length >= 5) pool = regional;
  } else if (fuel && fuel !== 'all') {
    const fuelFiltered = pool.filter((item) => isMatchFuel(item, fuel));
    if (fuelFiltered.length >= 5) pool = fuelFiltered;
  }

  const sampleCount = Math.min(pool.length, 15);
  const sampledItems = sample(pool, sampleCount);

  const signedListings = await Promise.all(sampledItems.map(async ({ price, ...publicListing }) => {
    const payload = base64url(new TextEncoder().encode(JSON.stringify({ id: publicListing.id, expiresAt })));
    return {
      ...publicListing,
      summary: sanitizeListingSummary(publicListing),
      features: sanitizeListingFeatures(publicListing),
      options: sanitizeListingOptions(publicListing),
      token: `${payload}.${await sign(payload, signingSecret)}`
    };
  }));

  const round = signedListings.slice(0, 5);
  const reserves = signedListings.slice(5);
  return Response.json({ round, reserves }, { headers: { 'cache-control': 'no-store' } });
}
