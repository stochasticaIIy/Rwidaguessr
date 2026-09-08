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
  if (guess !== null && (!Number.isFinite(guess) || guess < 0 || guess > 100_000_000)) return Response.json({ error: 'Invalid price.' }, { status: 400 });
  const difference = guess === null ? null : Math.abs(guess - listing.price);
  const relativeError = guess === null ? 1 : difference / listing.price;
  const score = Math.max(0, Math.round(1000 * (1 - Math.min(1, relativeError))));
  return Response.json({ actualPrice: listing.price, difference, score }, { headers: { 'cache-control': 'no-store' } });
}
