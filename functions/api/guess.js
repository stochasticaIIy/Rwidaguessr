import { DEFAULT_LISTINGS } from '../../data/listings.data.js';

const FALLBACK_SECRET = 'rwida-guessr-cloud-signing-key-production-fallback';

function fromBase64url(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((value.length + 3) % 4);
  return new Uint8Array([...atob(padded)].map((char) => char.charCodeAt(0)));
}
function base64url(bytes) { return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''); }
async function sign(text, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text))));
}
function secureEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0;
}

export function computeMarketValuation(item, allListings = DEFAULT_LISTINGS) {
  if (!item || !Number.isFinite(item.price)) return null;
  const askingPrice = item.price;
  
  const getFeature = (pattern) => {
    const f = (item.features || []).find((feat) => {
      const lbl = (feat.label?.en || feat.label?.fr || feat.label?.ar || feat.label || '');
      return pattern.test(lbl);
    });
    return f?.value?.en || f?.value?.fr || f?.value?.ar || f?.value || '';
  };

  const brand = String(getFeature(/brand|marque|علامة/i)).trim().toLowerCase();
  const model = String(getFeature(/model|modèle|طراز/i)).trim().toLowerCase();
  
  let year = parseInt(getFeature(/year|année|سنة/i), 10);
  if (!Number.isFinite(year)) {
    const yFromQuick = (item.quickFacts || []).map(q => typeof q === 'object' ? (q.en || q.ar) : q).find(v => /^\d{4}$/.test(String(v)));
    year = parseInt(yFromQuick, 10);
  }
  if (!Number.isFinite(year)) year = 2018;

  let mileage = null;
  const kmStr = getFeature(/mileage|kilom|مسافة/i) || (item.quickFacts || []).map(q => typeof q === 'object' ? (q.en || q.ar) : q).find(v => /km/i.test(String(v)));
  if (kmStr) {
    const n = parseInt(String(kmStr).replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(n)) mileage = n;
  }
  if (!mileage) mileage = 120000;

  const pool = (allListings || []).filter(l => l && l.id !== item.id && Number.isFinite(l.price) && l.price > 0 && l.kind === item.kind);

  let estimated = null;

  if (brand && model && model !== 'autre' && model !== 'other') {
    const exact = pool.filter((l) => {
      const b = String((l.features || []).find(f => /brand|marque|علامة/i.test(f.label?.en || f.label || ''))?.value?.en || '').trim().toLowerCase();
      const m = String((l.features || []).find(f => /model|modèle|طراز/i.test(f.label?.en || f.label || ''))?.value?.en || '').trim().toLowerCase();
      return b === brand && m === model;
    });

    if (exact.length >= 2) {
      const adjusted = exact.map((peer) => {
        let pYear = parseInt((peer.features || []).find(f => /year|année|سنة/i.test(f.label?.en || f.label || ''))?.value?.en, 10) || 2018;
        let pKm = 120000;
        const pKmStr = (peer.features || []).find(f => /mileage|kilom|مسافة/i.test(f.label?.en || f.label || ''))?.value?.en;
        if (pKmStr) {
          const num = parseInt(String(pKmStr).replace(/[^\d]/g, ''), 10);
          if (Number.isFinite(num)) pKm = num;
        }
        let val = peer.price * Math.pow(1.065, year - pYear);
        const kmFactor = 1 + ((pKm - mileage) / 100000) * 0.04;
        val *= Math.max(0.75, Math.min(1.25, kmFactor));
        return val;
      });
      adjusted.sort((a, b) => a - b);
      const cut = Math.floor(adjusted.length * 0.1);
      const valid = adjusted.slice(cut, adjusted.length - cut);
      estimated = valid.reduce((a, b) => a + b, 0) / valid.length;
    } else if (exact.length === 1) {
      const peer = exact[0];
      const pYear = parseInt((peer.features || []).find(f => /year|année|سنة/i.test(f.label?.en || f.label || ''))?.value?.en, 10) || 2018;
      estimated = peer.price * Math.pow(1.065, year - pYear);
    }
  }

  if (!estimated && brand) {
    const brandPeers = pool.filter(l => {
      const b = String((l.features || []).find(f => /brand|marque|علامة/i.test(f.label?.en || f.label || ''))?.value?.en || '').trim().toLowerCase();
      return b === brand;
    });
    if (brandPeers.length >= 2) {
      const similarYear = brandPeers.filter(p => {
        const pYear = parseInt((p.features || []).find(f => /year|année|سنة/i.test(f.label?.en || f.label || ''))?.value?.en, 10) || 2018;
        return Math.abs(pYear - year) <= 3;
      });
      const candidates = similarYear.length >= 2 ? similarYear : brandPeers;
      const avg = candidates.reduce((a, b) => a + b.price, 0) / candidates.length;
      estimated = avg * 0.4 + askingPrice * 0.6;
    }
  }

  if (!estimated) {
    let h = 0;
    for (let i = 0; i < (item.id || '').length; i++) h = (h * 31 + item.id.charCodeAt(i)) & 0xffffff;
    const deltaPct = ((h % 23) - 11) / 100;
    estimated = askingPrice * (1 - deltaPct);
  }

  if (estimated > askingPrice * 1.55) estimated = askingPrice * 1.25;
  if (estimated < askingPrice * 0.65) estimated = askingPrice * 0.8;

  estimated = Math.max(10000, Math.round(estimated / 1000) * 1000);
  const diff = askingPrice - estimated;
  const ratio = Math.round((diff / estimated) * 1000) / 1000;

  let tier = 'fair';
  if (ratio <= -0.10) tier = 'deal';
  else if (ratio <= 0.12) tier = 'fair';
  else if (ratio <= 0.25) tier = 'high';
  else tier = 'overpriced';

  return {
    estimatedMarketPrice: estimated,
    askingPrice,
    diff,
    ratio,
    ratioPct: Math.round(ratio * 1000) / 10,
    tier
  };
}

export async function onRequestPost({ request, env = {} }) {
  const signingSecret = env.GAME_SIGNING_SECRET || env.APP_SECRET || FALLBACK_SECRET;
  let body; try { body = await request.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  const [payload, signature] = String(body.token || '').split('.');
  if (!payload || !signature || !secureEqual(signature, await sign(payload, signingSecret))) return Response.json({ error: 'Invalid game token.' }, { status: 403 });
  let token; try { token = JSON.parse(new TextDecoder().decode(fromBase64url(payload))); } catch { return Response.json({ error: 'Invalid game token.' }, { status: 403 }); }
  if (!token.id || token.expiresAt < Date.now()) return Response.json({ error: 'This round has expired.' }, { status: 410 });
  let listings = DEFAULT_LISTINGS;
  if (env.LISTINGS_JSON) {
    try { listings = JSON.parse(env.LISTINGS_JSON); } catch (_) {}
  }
  const listing = listings.find((item) => item.id === token.id && Number.isFinite(item.price));
  if (!listing) return Response.json({ error: 'Listing not found.' }, { status: 404 });
  const guess = body.guess === null ? null : Number(body.guess);
  if (guess !== null && (!Number.isFinite(guess) || guess <= 0 || guess > 100_000_000)) return Response.json({ error: 'Invalid price.' }, { status: 400 });
  const difference = guess === null ? null : Math.abs(guess - listing.price);
  const relativeError = guess === null ? 1 : difference / listing.price;
  const score = Math.max(0, Math.round(1000 * (1 - Math.min(1, relativeError))));
  const marketValuation = computeMarketValuation(listing, listings);
  return Response.json({ actualPrice: listing.price, difference, score, marketValuation }, { headers: { 'cache-control': 'no-store' } });
}
