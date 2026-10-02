import fs from 'fs';
import dns from 'dns';

// Force IPv4-only DNS lookup so Cloudflare IPv6 addresses never cause connect timeouts
const origLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = { family: 4 };
  } else if (typeof options === 'number') {
    options = { family: 4 };
  } else {
    options = { ...options, family: 4 };
  }
  return origLookup.call(this, hostname, options, (err, address, family) => {
    if (!err && Array.isArray(address)) {
      const v4 = address.filter((a) => a.family === 4);
      return callback(null, v4.length > 0 ? v4 : address);
    }
    return callback(err, address, family);
  });
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
};

// Returns false ONLY when the server explicitly confirms the listing or image is dead (3xx redirect to index or 404/410)
async function checkExplicitlyDead(item) {
  if (!item || !item.sourceUrl || !Array.isArray(item.images) || item.images.length === 0) return true;
  try {
    const r = await fetch(item.sourceUrl, {
      method: 'HEAD',
      headers: HEADERS,
      redirect: 'manual',
      signal: AbortSignal.timeout(4500)
    });
    if ((r.status >= 300 && r.status < 400) || r.status === 404 || r.status === 410) {
      return true;
    }
  } catch {
    // Transient timeout/network issue: keep listing safe
    return false;
  }

  if (item.images[0].includes('moteur.ma')) {
    try {
      const ri = await fetch(item.images[0], {
        method: 'HEAD',
        headers: HEADERS,
        redirect: 'manual',
        signal: AbortSignal.timeout(4000)
      });
      if (ri.status === 404 || ri.status === 410 || (ri.status >= 300 && ri.status < 400)) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

async function run() {
  const all = JSON.parse(fs.readFileSync('data/listings.imported.json', 'utf8'));
  console.log(`[Refresh] Checking ${all.length} listings (preserving 362 already-verified & freshly crawled listings)...`);

  // First 362 were already verified 200 OK + newly crawled from Moteur.ma
  const kept = all.slice(0, 362);
  const toVerify = all.slice(362);

  let idx = 0;
  let prunedCars = 0;
  let prunedMotos = 0;

  async function worker() {
    while (idx < toVerify.length) {
      const item = toVerify[idx++];
      const isDead = await checkExplicitlyDead(item);
      if (isDead) {
        if (item.kind === 'Car') prunedCars++;
        else prunedMotos++;
      } else {
        kept.push(item);
      }
    }
  }

  await Promise.all(Array.from({ length: 16 }, () => worker()));

  // Deduplicate by id
  const deduped = [];
  const seen = new Set();
  for (const item of kept) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      deduped.push(item);
    }
  }

  fs.writeFileSync('data/listings.imported.json', JSON.stringify(deduped, null, 2), 'utf8');
  if (fs.existsSync('data/listings.backup.json')) fs.unlinkSync('data/listings.backup.json');
  if (fs.existsSync('data/listings.backup1622.json')) fs.unlinkSync('data/listings.backup1622.json');

  const finalCars = deduped.filter((x) => x.kind === 'Car').length;
  const finalMotos = deduped.filter((x) => x.kind !== 'Car').length;
  console.log(`[Refresh] Pruned ${prunedCars + prunedMotos} confirmed dead listings (${prunedCars} Cars, ${prunedMotos} Motos).`);
  console.log(`[Refresh] Final active dataset: ${deduped.length} listings (${finalCars} Cars, ${finalMotos} Motos).`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
