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
  const isBike = (item.kind || '').toLowerCase().includes('moto') || (item.kind || '').toLowerCase().includes('bike');
  if (isBike || !Array.isArray(item.features)) return item.features;
  return item.features.filter((f) => {
    const label = f.label;
    const en = (label && typeof label === 'object' ? (label.en || label.fr || label.raw || '') : String(label || '')).toLowerCase().trim();
    const ar = (label && typeof label === 'object' ? (label.ar || '') : '').toLowerCase().trim();
    if (en.includes('douane') || ar.includes('douane') || en.includes('customs') || ar.includes('جمارك')) return false;
    if (en.includes('tax horsepower') || en === 'tax hp' || en.includes('puissance fiscale') || ar.includes('الجبائية')) return false;
    return true;
  });
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

  const round = await Promise.all(sample(pool, 5).map(async ({ price, ...publicListing }) => {
    const payload = base64url(new TextEncoder().encode(JSON.stringify({ id: publicListing.id, expiresAt })));
    return {
      ...publicListing,
      features: sanitizeListingFeatures(publicListing),
      token: `${payload}.${await sign(payload, signingSecret)}`
    };
  }));
  return Response.json({ round }, { headers: { 'cache-control': 'no-store' } });
}
