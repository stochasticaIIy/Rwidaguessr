import { DEFAULT_LISTINGS } from '../../data/listings.data.js';
import { DEFAULT_RENTAL_LISTINGS } from '../../data/rentals.data.js';

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

const KNOWN_VALUATION_BRANDS = [
  'mercedes-benz', 'mercedes', 'land rover', 'range rover', 'alfa romeo', 'aston martin',
  'volkswagen', 'renault', 'peugeot', 'citroen', 'dacia', 'hyundai', 'kia', 'toyota',
  'ford', 'opel', 'fiat', 'audi', 'bmw', 'porsche', 'jeep', 'nissan', 'seat', 'cupra',
  'skoda', 'volvo', 'mini', 'suzuki', 'honda', 'mitsubishi', 'mazda', 'chevrolet', 'mg',
  'byd', 'tesla', 'changan', 'geely', 'haval', 'chery', 'dfsk', 'jaguar', 'maserati',
  'bentley', 'ferrari', 'lamborghini', 'cadillac', 'yamaha', 'kawasaki', 'ducati', 'ktm',
  'harley-davidson', 'harley', 'triumph', 'aprilia', 'vespa', 'piaggio', 'kymco', 'sym',
  'cfmoto', 'cf moto', 'royal enfield', 'benelli', 'mbk', 'becane', 'docker', 'sanya',
  'vinto', 'gabelli', 'tvs', 'austin', 'zontes', 'voge', 'hanway', 'segway', 'can-am'
];

function normalizeValuationStr(str = '') {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .toLowerCase()
    .trim();
}

export function extractCanonicalBrandModel(item) {
  const getFeat = (pat) => {
    const f = (item.features || []).find((feat) => pat.test(feat.label?.en || feat.label?.fr || feat.label?.ar || feat.label || ''));
    return normalizeValuationStr(f?.value?.en || f?.value?.fr || f?.value?.ar || f?.value || '');
  };
  let brand = getFeat(/brand|marque|علامة/i);
  let model = getFeat(/model|modèle|طراز/i);
  const title = normalizeValuationStr(item.title?.en || item.title?.ar || item.title || '');

  if (!brand || brand === 'autre' || brand === 'other') {
    for (const kb of KNOWN_VALUATION_BRANDS) {
      if (new RegExp(`\\b${kb.replace('-', '[\\s-]')}\\b`, 'i').test(title)) {
        brand = kb;
        break;
      }
    }
  }
  if (brand === 'mercedes') brand = 'mercedes-benz';
  if (brand === 'harley') brand = 'harley-davidson';
  if (brand === 'cf moto') brand = 'cfmoto';
  if (brand === 'range rover') brand = 'land rover';

  if (!model || model === 'autre' || model === 'other') {
    let cleanedTitle = title
      .replace(/\b(19\d\d|20\d\d)\b/g, ' ')
      .replace(/\b(autre|garantie|pack|complet|iridium|gris|noir|blanc|essence|esseence|essense|diesel|hybride|electrique|moto|scooter|neuf|00\s*km|0\s*km)\b/g, ' ');
    if (brand && brand !== 'autre') {
      cleanedTitle = cleanedTitle.replace(new RegExp(`\\b${brand.replace('-', '[\\s-]')}\\b`, 'gi'), ' ');
    }
    cleanedTitle = cleanedTitle
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/(?:^|\s)-+(?:\s|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const tokens = cleanedTitle.split(' ').filter((t) => t && t !== '-');
    if (tokens.length > 0) {
      model = tokens.slice(0, 2).join(' ');
    }
  }

  let canonModel = (model || '')
    .replace(/\b(19\d\d|20\d\d)\b/g, ' ')
    .replace(/(?:^|\s)-+(?:\s|$)/g, ' ')
    .replace(/\b(s\s*line|qouatro|quattro|pack\s*m|blackline|berline|coupe|cabriolet|sportback|5\s*seater|7\s*seater|tech\s*max|supersport|super\s*tech|tft|abs|lc|adventure|trophy|race\s*edition|digital|cc|gtline|gt-line|r-line|r\s*line|pick-up|pickup|fuel\s*cell)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (brand === 'himalayan') { brand = 'royal enfield'; canonModel = 'himalayan'; }
  if (brand === 'v-strom') { brand = 'suzuki'; canonModel = 'v-strom 250'; }
  if (/^t[-\s]?max/.test(canonModel)) canonModel = 'tmax';
  if (/adv\s*350/.test(canonModel) || /adv\s*350/.test(title)) canonModel = 'adv 350';
  else if (/^x[-\s]?adv|^adv$/.test(canonModel)) canonModel = 'x-adv 750';
  if (/^n[-\s]?max/.test(canonModel)) canonModel = 'nmax 125';
  if (/^x[-\s]?max/.test(canonModel)) canonModel = 'xmax';
  if (/^mt[-\s]?07/.test(canonModel)) canonModel = 'mt-07';
  if (/^mt[-\s]?09/.test(canonModel)) canonModel = 'mt-09';
  if (/^mt[-\s]?03/.test(canonModel)) canonModel = 'mt-03';
  if (/^tracer\s*9/.test(canonModel)) canonModel = 'tracer 9';
  if (/^tracer\s*7/.test(canonModel)) canonModel = 'tracer 7';
  if (/^v[-\s]?strom\s*650/.test(canonModel)) canonModel = 'v-strom 650';
  if (/^v[-\s]?strom\s*800/.test(canonModel)) canonModel = 'v-strom 800';
  if (/^v[-\s]?strom\s*250/.test(canonModel)) canonModel = 'v-strom 250';
  if (/tenere\s*700/.test(canonModel)) canonModel = 'tenere 700';
  if (/himalayan/.test(canonModel)) canonModel = 'himalayan';
  if (/450\s*mt|mt\s*450/.test(canonModel)) canonModel = '450 mt';
  if (/700\s*cl[-\s]?x/.test(canonModel)) canonModel = '700 cl-x';
  if (/agility/.test(canonModel)) canonModel = 'agility';
  if (/\bbws\b/.test(canonModel) || /\bbws\b/.test(title)) { brand = 'mbk'; canonModel = 'bws'; }
  if (/\bneos\b/.test(canonModel) || /\bneos\b/.test(title)) { brand = 'yamaha'; canonModel = 'neos'; }
  if (/^z\s*1000$|^z1000$/.test(canonModel)) canonModel = 'z1000';
  if (/^z\s*900$|^z900$/.test(canonModel)) canonModel = 'z900';
  if (/^z\s*800$|^z800$/.test(canonModel)) canonModel = 'z800';
  if (/^z\s*650|^z650/.test(canonModel)) canonModel = 'z650';
  if (/^sh\s*125/.test(canonModel)) canonModel = 'sh 125';
  if (/^sh\s*150/.test(canonModel)) canonModel = 'sh 150';
  if (/^sh\s*300/.test(canonModel)) canonModel = 'sh 300';
  if (/^sh\s*350/.test(canonModel)) canonModel = 'sh 350';
  if (/gold\s*wing|goldwing/.test(canonModel)) canonModel = 'goldwing 1800';
  if (/hornet/.test(canonModel)) canonModel = 'hornet';
  if (/panamerica|pan\s*america/.test(canonModel)) canonModel = 'pan america 1250';
  if (/^300\s*gts|^gts\s*300|^gts\s*310|^gts\s*super/.test(canonModel)) canonModel = 'gts 300';
  if (/^sprint/.test(canonModel)) canonModel = 'sprint';
  if (/^50\s*st$|^symphony/.test(canonModel)) canonModel = 'symphony';
  if (/f\s*800\s*gs|f800\s*gs/.test(canonModel)) canonModel = 'f800 gs';
  if (/f\s*750\s*gs|f750\s*gs/.test(canonModel)) canonModel = 'f750 gs';
  if (/f\s*850\s*gs|f850\s*gs/.test(canonModel)) canonModel = 'f850 gs';
  if (/f\s*900\s*gs|f900\s*gs|gs\s*900|^f900$/.test(canonModel)) canonModel = 'f900 gs';
  if (/r\s*1200\s*gs|r1200\s*gs/.test(canonModel)) canonModel = 'r1200 gs';
  if (/r\s*1250\s*gs|r1250\s*gs/.test(canonModel)) canonModel = 'r1250 gs';
  if (/r\s*1300\s*gs|r1300\s*gs/.test(canonModel)) canonModel = 'r1300 gs';
  if (/clio/.test(canonModel)) canonModel = 'clio';
  if (/macan/.test(canonModel)) canonModel = 'macan';
  if (/^duster$|^deuster$/.test(canonModel)) canonModel = 'duster';
  if (/^logan$|^logane$/.test(canonModel)) canonModel = 'logan';
  if (/^500\s*c$|^500c$|^500\s*sport$|^500$/.test(canonModel)) canonModel = '500';
  if (/^t[-\s]?roc$/.test(canonModel)) canonModel = 't-roc';
  if (/^touareg/.test(canonModel)) canonModel = 'touareg';
  if (/^tiguan/.test(canonModel)) canonModel = 'tiguan';
  if (/^tucson/.test(canonModel)) canonModel = 'tucson';
  if (/i10/.test(canonModel)) canonModel = 'i10';
  if (/^sportage/.test(canonModel)) canonModel = 'sportage';
  if (/^juke$|^jouk$/.test(canonModel)) canonModel = 'juke';
  if (/^corsa$|^coorssa$/.test(canonModel)) canonModel = 'corsa';
  if (/^corolla/.test(canonModel)) canonModel = 'corolla';
  if (/evoc|evoque/.test(canonModel)) canonModel = 'range rover evoque';
  if (/range\s*rover\s*sport|^sport$/.test(canonModel) && brand === 'land rover') canonModel = 'range rover sport';
  if (/range\s*rover\s*vogue|^vogue$|^range\s*rover$/.test(canonModel) && brand === 'land rover') canonModel = 'range rover vogue';
  if (brand === 'mercedes-benz') {
    if (/^(c|c-class|c class|classe c|c200|c200 d|c220|c220 d)$/.test(canonModel)) canonModel = 'classe c';
    if (/^(a|a-class|a class|classe a|a200|a180)$/.test(canonModel)) canonModel = 'classe a';
    if (/^(e|e-class|e class|classe e|e200|e220|e220 d)$/.test(canonModel)) canonModel = 'classe e';
    if (/^(s|s-class|s class|classe s|s350|s350 d|s500)$/.test(canonModel)) canonModel = 'classe s';
    if (/^(v|v-class|v class|classe v)$/.test(canonModel)) canonModel = 'classe v';
    if (/^(cla|classe cla)$/.test(canonModel)) canonModel = 'classe cla';
    if (/^(gla|classe gla)$/.test(canonModel)) canonModel = 'classe gla';
    if (/^gle\b|^classe gle\b/.test(canonModel)) canonModel = 'classe gle';
    if (/^glc\b|^classe glc\b/.test(canonModel)) canonModel = 'classe glc';
    if (/^g63\b|^classe g\b/.test(canonModel)) canonModel = 'g63 amg';
  }
  if (/^golf\b/.test(canonModel) && !/gti|r\b/.test(canonModel)) canonModel = 'golf';
  if (/^q3\b/.test(canonModel)) canonModel = 'q3';
  if (/^q5\b/.test(canonModel)) canonModel = 'q5';
  if (/^q7\b/.test(canonModel)) canonModel = 'q7';
  if (/^q8\b/.test(canonModel)) canonModel = 'q8';
  if (/^a3\b/.test(canonModel)) canonModel = 'a3';
  if (/^a4\b/.test(canonModel)) canonModel = 'a4';

  return { brand: brand || 'autre', model: canonModel || model || 'autre' };
}

function extractListingYear(item) {
  const f = (item.features || []).find((feat) => /year|année|سنة/i.test(feat.label?.en || feat.label?.fr || feat.label?.ar || feat.label || ''));
  let year = parseInt(f?.value?.en || f?.value?.fr || f?.value?.ar || f?.value || '', 10);
  if (!Number.isFinite(year)) {
    const yFromQuick = (item.quickFacts || []).map((q) => (typeof q === 'object' ? (q.en || q.ar) : q)).find((v) => /^\d{4}$/.test(String(v)));
    year = parseInt(yFromQuick, 10);
  }
  return Number.isFinite(year) ? year : 2018;
}

export function computeMarketValuation(item, allListings = DEFAULT_LISTINGS) {
  if (!item || !Number.isFinite(item.price)) return null;
  const askingPrice = item.price;
  const fullKindPool = (allListings || []).filter((l) => l && Number.isFinite(l.price) && l.price > 0 && l.kind === item.kind);
  const isRental = item.listingType === 'rental' || item.priceUnit === 'day' || (fullKindPool.length > 0 && fullKindPool[0].listingType === 'rental');

  const { brand, model } = extractCanonicalBrandModel(item);
  const year = extractListingYear(item);

  let estimated = null;

  // 1. Canonical (brand + model) cohort across all years (adjusted to target year)
  if (brand && model && model !== 'autre' && model !== 'other') {
    const exactAll = fullKindPool.filter((l) => {
      const peerBM = extractCanonicalBrandModel(l);
      return peerBM.brand === brand && peerBM.model === model;
    });

    if (exactAll.length >= 2) {
      const adjusted = exactAll.map((peer) => {
        const pYear = extractListingYear(peer);
        return peer.price * Math.pow(1.065, year - pYear);
      });
      adjusted.sort((a, b) => a - b);
      const cut = adjusted.length >= 5 ? Math.floor(adjusted.length * 0.15) : 0;
      const valid = adjusted.slice(cut, adjusted.length - cut);
      estimated = valid.reduce((a, b) => a + b, 0) / valid.length;
    }
  }

  // 2. Fallback for singleton models or "Autre" models — 100% deterministic per (kind, brand, model, year)
  if (!estimated) {
    const sameCohort = fullKindPool.filter((l) => {
      const peerBM = extractCanonicalBrandModel(l);
      return peerBM.brand === brand && peerBM.model === model && extractListingYear(l) === year;
    });
    const cohortAvg = sameCohort.length > 0
      ? sameCohort.reduce((a, b) => a + b.price, 0) / sameCohort.length
      : askingPrice;

    if (sameCohort.length >= 2) {
      estimated = cohortAvg;
    } else {
      const brandSegmentPeers = fullKindPool.filter((l) => {
        const peerBM = extractCanonicalBrandModel(l);
        if (peerBM.brand !== brand) return false;
        const pYear = extractListingYear(l);
        if (Math.abs(pYear - year) > 3) return false;
        return l.price >= cohortAvg * 0.55 && l.price <= cohortAvg * 1.65;
      });

      if (brandSegmentPeers.length >= 2) {
        const adjustedPeers = brandSegmentPeers.map((p) => p.price * Math.pow(1.065, year - extractListingYear(p)));
        const peerAvg = adjustedPeers.reduce((a, b) => a + b, 0) / adjustedPeers.length;
        estimated = peerAvg * 0.5 + cohortAvg * 0.5;
      } else {
        const canonicalKey = `${item.kind}|${brand}|${model}|${year}`;
        let h = 0;
        for (let i = 0; i < canonicalKey.length; i++) h = (h * 31 + canonicalKey.charCodeAt(i)) & 0xffffff;
        const deltaPct = ((h % 19) - 9) / 100;
        estimated = cohortAvg * (1 - deltaPct);
      }
    }
  }

  if (isRental) {
    estimated = Math.max(50, Math.round(estimated / 10) * 10);
  } else {
    estimated = Math.max(2000, Math.round(estimated / 1000) * 1000);
  }
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
  let saleListings = DEFAULT_LISTINGS;
  if (env.LISTINGS_JSON) {
    try { saleListings = JSON.parse(env.LISTINGS_JSON); } catch (_) {}
  }
  let rentalListings = DEFAULT_RENTAL_LISTINGS;
  if (env.RENTAL_LISTINGS_JSON) {
    try { rentalListings = JSON.parse(env.RENTAL_LISTINGS_JSON); } catch (_) {}
  }
  const isRentalToken = token.listingType === 'rental' || body.listingType === 'rental';
  const primaryPool = isRentalToken ? rentalListings : saleListings;
  const secondaryPool = isRentalToken ? saleListings : rentalListings;
  let listing = (primaryPool || []).find((item) => item.id === token.id && Number.isFinite(item.price));
  let activePool = primaryPool;
  if (!listing) {
    listing = (secondaryPool || []).find((item) => item.id === token.id && Number.isFinite(item.price));
    activePool = secondaryPool;
  }
  if (!listing) return Response.json({ error: 'Listing not found.' }, { status: 404 });
  const guess = body.guess === null ? null : Number(body.guess);
  if (guess !== null && (!Number.isFinite(guess) || guess <= 0 || guess > 100_000_000)) return Response.json({ error: 'Invalid price.' }, { status: 400 });
  const difference = guess === null ? null : Math.abs(guess - listing.price);
  const relativeError = guess === null ? 1 : difference / listing.price;
  const score = Math.max(0, Math.round(1000 * (1 - Math.min(1, relativeError))));
  const marketValuation = computeMarketValuation(listing, activePool);
  return Response.json({ actualPrice: listing.price, difference, score, marketValuation, listingType: listing.listingType || (isRentalToken ? 'rental' : 'sale') }, { headers: { 'cache-control': 'no-store' } });
}
