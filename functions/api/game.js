const MAX_SECONDS = 30 * 60;

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

export async function onRequestGet({ request, env }) {
  if (!env.LISTINGS_JSON || !env.GAME_SIGNING_SECRET) return Response.json({ error: 'Game data is not configured.' }, { status: 503 });
  let listings;
  try { listings = JSON.parse(env.LISTINGS_JSON); } catch { return Response.json({ error: 'Invalid listings data.' }, { status: 500 }); }
  const valid = listings.filter((item) => item.id && Number.isFinite(item.price) && item.title && item.summary && item.features);
  if (valid.length < 5) return Response.json({ error: 'At least five valid listings are required.' }, { status: 503 });
  const url = new URL(request.url);
  const desiredSeconds = Number(url.searchParams.get('seconds')) || 120;
  const seconds = Math.min(MAX_SECONDS, Math.max(30, desiredSeconds));
  const expiresAt = Date.now() + seconds * 1000 + 10_000;
  const round = await Promise.all(sample(valid, 5).map(async ({ price, ...publicListing }) => {
    const payload = base64url(new TextEncoder().encode(JSON.stringify({ id: publicListing.id, expiresAt })));
    return { ...publicListing, token: `${payload}.${await sign(payload, env.GAME_SIGNING_SECRET)}` };
  }));
  return Response.json({ round }, { headers: { 'cache-control': 'no-store' } });
}
