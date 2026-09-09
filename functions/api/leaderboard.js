const DEFAULT_BIN_ID = '6aa05769ac6210605ab4d5b9';
const DEFAULT_API_KEY = '$2a$10$3xI2W00BsiGhjbq2yCC4jeq6sj7TqNA3I1lGa2AAfthmUjM5M.r7q';

function parseEntry(item) {
  if (Array.isArray(item)) {
    const name = String(item[0] || '').trim();
    const score = Math.round(Number(item[1]) || 0);
    const mode = item[2] ? String(item[2]) : undefined;
    if (name && score >= 0) return { name, score, mode };
  } else if (item && typeof item === 'object') {
    const name = String(item.name || '').trim();
    const score = Math.round(Number(item.score) || 0);
    const mode = item.mode ? String(item.mode) : undefined;
    if (name && score >= 0) return { name, score, mode };
  }
  return null;
}

function sanitizeName(raw) {
  return String(raw || '')
    .replace(/<[^>]*>?/gm, '')
    .replace(/[^\p{L}\p{N}\s\-_.@#]/gu, '')
    .trim()
    .slice(0, 30);
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
        { error: 'Failed to fetch leaderboard from JSONbin', status: response.status },
        { status: 502, headers: { 'cache-control': 'no-store' } }
      );
    }

    const payload = await response.json();
    const rawList = Array.isArray(payload.record) ? payload.record : [];
    const entries = rawList
      .map(parseEntry)
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

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
      { error: 'Internal server error while querying leaderboard', details: err.message },
      { status: 500, headers: { 'cache-control': 'no-store' } }
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
  if (!name || name.length < 1) {
    return Response.json({ error: 'A valid player name is required (1-30 chars).' }, { status: 400 });
  }

  const score = Math.round(Number(body.score));
  if (!Number.isFinite(score) || score < 0 || score > 5000) {
    return Response.json({ error: 'Invalid score (must be between 0 and 5,000).' }, { status: 400 });
  }

  const mode = body.mode === 'motorbikes' ? 'motorbikes' : 'cars';

  try {
    // 1. Fetch current records
    const getRes = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { 'X-Master-Key': apiKey }
    });

    let currentList = [];
    if (getRes.ok) {
      const payload = await getRes.json();
      if (Array.isArray(payload.record)) {
        currentList = payload.record.map(parseEntry).filter(Boolean);
      }
    }

    // 2. Add new record and sort
    const newEntry = { name, score, mode };
    currentList.push(newEntry);
    currentList.sort((a, b) => b.score - a.score);

    // Keep top 100 entries to prevent unbounded JSON size
    const topEntries = currentList.slice(0, 100);

    // Save as array of [name, score, mode] to match structure and preserve mode
    const toSave = topEntries.map((e) => [e.name, e.score, e.mode || 'cars']);

    // 3. Put to JSONbin
    const putRes = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': apiKey
      },
      body: JSON.stringify(toSave)
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return Response.json(
        { error: 'Failed to update JSONbin', details: errText },
        { status: 502, headers: { 'cache-control': 'no-store' } }
      );
    }

    // Find rank of newly added score
    const rank = topEntries.findIndex((e) => e.name === name && e.score === score) + 1;

    const leaderboard = topEntries.map((entry, index) => ({
      rank: index + 1,
      name: entry.name,
      score: entry.score,
      mode: entry.mode || 'cars'
    }));

    return Response.json(
      { success: true, rank, leaderboard },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch (err) {
    return Response.json(
      { error: 'Internal server error while saving score', details: err.message },
      { status: 500, headers: { 'cache-control': 'no-store' } }
    );
  }
}
