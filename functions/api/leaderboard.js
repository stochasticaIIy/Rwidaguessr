const DEFAULT_BIN_ID = '6aa05769ac6210605ab4d5b9';
const DEFAULT_API_KEY = '$2a$10$3xI2W00BsiGhjbq2yCC4jeq6sj7TqNA3I1lGa2AAfthmUjM5M.r7q';

function parseEntry(item) {
  if (Array.isArray(item)) {
    const name = String(item[0] || '').trim();
    const score = Math.round(Number(item[1]) || 0);
    const mode = item[2] ? String(item[2]) : 'cars';
    if (name && score >= 0) return { name, score, mode };
  } else if (item && typeof item === 'object') {
    const name = String(item.name || '').trim();
    const score = Math.round(Number(item.score) || 0);
    const mode = item.mode ? String(item.mode) : 'cars';
    if (name && score >= 0) return { name, score, mode };
  }
  return null;
}

// Expanded character support (supports Arabic diacritics/tashkeel, Latin accents, emoji, numbers, apostrophes, etc.)
function sanitizeName(raw) {
  let cleaned = String(raw || '')
    .replace(/<[^>]*>?/gm, '')
    .replace(/[^\p{L}\p{M}\p{N}\p{Emoji}\s\-_.@#'’()[\]]/gu, '')
    .trim()
    .slice(0, 30);
  if (!cleaned) cleaned = 'حرايفي';
  return cleaned;
}

export async function onRequestGet({ request, env = {} }) {
  const binId = env.JSONBIN_BIN_ID || DEFAULT_BIN_ID;
  const apiKey = env.JSONBIN_API_KEY || DEFAULT_API_KEY;

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { 'X-Master-Key': apiKey }
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Failed to fetch leaderboard from JSONBin', status: response.status },
        { status: 502, headers: { 'cache-control': 'no-store' } }
      );
    }

    const payload = await response.json();
    const rawList = Array.isArray(payload.record) ? payload.record : [];
    const entries = rawList.map(parseEntry).filter(Boolean);
    entries.sort((a, b) => b.score - a.score);

    const leaderboard = entries.map((entry, index) => ({
      rank: index + 1,
      name: entry.name,
      score: entry.score,
      mode: entry.mode || 'cars'
    }));

    return Response.json(
      { leaderboard },
      { headers: { 'cache-control': 'no-store, max-age=0' } }
    );
  } catch (err) {
    return Response.json(
      { error: 'Could not connect to JSONBin', details: err.message },
      { status: 502, headers: { 'cache-control': 'no-store' } }
    );
  }
}

export async function onRequestPost({ request, env = {} }) {
  const binId = env.JSONBIN_BIN_ID || DEFAULT_BIN_ID;
  const apiKey = env.JSONBIN_API_KEY || DEFAULT_API_KEY;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = sanitizeName(body.name);
  let score = Math.round(Number(body.score));
  if (!Number.isFinite(score) || score < 0) score = 0;
  if (score > 5000) score = 5000;

  const mode = body.mode === 'motorbikes' ? 'motorbikes' : 'cars';

  try {
    // 1. Fetch current record from JSONBin
    const getRes = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { 'X-Master-Key': apiKey }
    });

    let currentList = [];
    if (getRes.ok) {
      const payload = await getRes.json();
      const raw = Array.isArray(payload.record) ? payload.record : [];
      currentList = raw.map(parseEntry).filter(Boolean);
    }

    // 2. Add new entry and sort descending
    currentList.push({ name, score, mode });
    currentList.sort((a, b) => b.score - a.score);

    // Keep top 50 scores
    const topEntries = currentList.slice(0, 50);

    // 3. Save directly to JSONBin
    const toSave = topEntries.map((e) => [e.name, e.score, e.mode || 'cars']);
    const putRes = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': apiKey,
        'X-Bin-Versioning': 'false'
      },
      body: JSON.stringify(toSave)
    });

    if (!putRes.ok) {
      return Response.json(
        { error: 'Failed to update remote JSONBin leaderboard', status: putRes.status },
        { status: 502, headers: { 'cache-control': 'no-store' } }
      );
    }

    const rank = topEntries.findIndex((e) => e.name === name && e.score === score) + 1;

    const leaderboard = topEntries.map((entry, index) => ({
      rank: index + 1,
      name: entry.name,
      score: entry.score,
      mode: entry.mode || 'cars'
    }));

    return Response.json(
      { success: true, rank, leaderboard },
      { status: 200, headers: { 'cache-control': 'no-store' } }
    );
  } catch (err) {
    return Response.json(
      { error: 'Failed to process leaderboard update in JSONBin', details: err.message },
      { status: 502, headers: { 'cache-control': 'no-store' } }
    );
  }
}
