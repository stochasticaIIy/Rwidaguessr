#!/usr/bin/env node
/**
 * One-shot migration for the shared rentals dataset.
 *
 * Fixes:
 *   #3 — wrong cylinder counts on 13 motorbike listings
 *   #5 — OneClickDrive catalog images leaking between ad IDs
 *   #10 — duplicate listings that share photos
 *
 * Reads data/rentals.imported.json (or data/rentals.data.js as fallback),
 * applies the three fixes, and rewrites all four artifacts in place:
 *   data/rentals.imported.json
 *   data/rentals.data.js
 *   data/rentals.demo.js
 *   data/rentals.demo.json
 *
 * Idempotent: safe to run more than once. A second run reports zero changes.
 */

import fs from 'fs';
import path from 'path';

const RENTAL_JSON      = 'data/rentals.imported.json';
const RENTAL_DATA_JS   = 'data/rentals.data.js';
const RENTAL_DEMO_JS   = 'data/rentals.demo.js';
const RENTAL_DEMO_JSON = 'data/rentals.demo.json';

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

function loadRentals() {
  if (fs.existsSync(RENTAL_JSON)) {
    const raw = fs.readFileSync(RENTAL_JSON, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  }
  if (fs.existsSync(RENTAL_DATA_JS)) {
    const src = fs.readFileSync(RENTAL_DATA_JS, 'utf8');
    const m = src.match(/export const DEFAULT_RENTAL_LISTINGS\s*=\s*(\[[\s\S]*?\]);/);
    if (m) return JSON.parse(m[1]);
  }
  throw new Error('No rentals dataset found (looked for rentals.imported.json and rentals.data.js)');
}

// ---------------------------------------------------------------------------
// Fix #3 — cylinder counts
// ---------------------------------------------------------------------------

const BIKE_CYLS = [
  // BMW R-series boxer twins
  [/\bR[\s-]*1200[\s-]*GS\b/i,           2],
  [/\bR[\s-]*1250[\s-]*GS\b/i,           2],
  [/\bR[\s-]*1300[\s-]*GS\b/i,           2],
  [/\bGS[\s-]*1200[\s-]*Adventure\b/i,   2],
  // BMW F-series parallel twins
  [/\bF[\s-]*750[\s-]*GS\b/i,            2],
  [/\bF[\s-]*800[\s-]*GS\b/i,            2],
  [/\bF[\s-]*850[\s-]*GS\b/i,            2],
  [/\bF[\s-]*900[\s-]*GS\b/i,            2],
  [/\bF800GS\b/i,                        2],
  [/\bGS[\s-]*800\b/i,                   2],
  [/\bGS[\s-]*900\b/i,                   2],
  // Honda
  [/Africa[\s-]*Twin/i,                  2],
  [/\bCRF[\s-]*1100\b/i,                 2],
  [/\bNC[\s-]*750\b/i,                   2],
  [/\bX-?ADV[\s-]*750\b/i,               2],
  [/\bCRF[\s-]*250\b/i,                  1],
  [/\bADV[\s-]*150\b/i,                  1],
  [/\bADV[\s-]*350\b/i,                  1],
  [/\bSH[\s-]*Mode\b/i,                  1],
  // KTM
  [/\b1290[\s-]*Super[\s-]*Adventure\b/i, 2],
  [/\b1390[\s-]*Adventure\b/i,           2],
  [/\b890[\s-]*Adventure\b/i,            2],
  [/\b390[\s-]*Adventure\b/i,            1],
  // Suzuki
  [/\bV[\s-]*Strom[\s-]*1050\b/i,        2],
  [/\bV[\s-]*Strom[\s-]*800\b/i,         2],
  [/\bV[\s-]*Strom[\s-]*650\b/i,         2],
  [/\bV[\s-]*STROM[\s-]*250\b/i,         1],
  [/\bDR[\s-]*650\b/i,                   1],
  [/\bDRZ?[\s-]*400\b/i,                 1],
  [/\bDR[\s-]*200\b/i,                   1],
  // Yamaha
  [/T[eé]n[eé]r[eé][\s-]*700/i,          2],
  [/\bXT[\s-]*250\b/i,                   1],
  [/\bNMAX\b/i,                          1],
  [/\bXMAX\b/i,                          1],
  [/\bNeos\b/i,                          1],
  // Others
  [/Himalayan/i,                          1],
  [/\b450MT\b|\bMT450\b/i,               1],
  [/\b450[\s-]*Rally\b/i,                1],
  [/\b525[\s-]*GS\b/i,                   1],
  [/\b250[\s-]*GP\b/i,                   1],
  [/\b368[\s-]*G\b/i,                    1],
  [/\b(?:Vespa|Piaggio|SYM|Kymco|MBK|B[eé]cane|Gabelli|Docker|Sanya|FRAPPUCCINO|Jet[\s-]*X|Fiddle|Orbit)\b/i, 1],
];

function correctCylinders(rental) {
  if (rental.kind !== 'Moto') return false;
  const hay = `${rental.title?.en || ''} ${rental.title?.ar || ''}`;
  let target = null;
  for (const [re, cyl] of BIKE_CYLS) {
    if (re.test(hay)) { target = cyl; break; }
  }
  if (target == null) return false;

  const want = target === 2
    ? { en: '2 cylinders', ar: 'أسطوانتان' }
    : { en: '1 cylinder',  ar: 'أسطوانة واحدة' };

  let changed = false;
  for (const f of rental.features || []) {
    const isCyl = f.label?.en === 'Cylinders' || f.label?.ar === 'عدد الأسطوانات';
    if (!isCyl) continue;
    if (f.value?.en !== want.en || f.value?.ar !== want.ar) {
      f.value = { ...want };
      changed = true;
    }
  }
  return changed;
}

// ---------------------------------------------------------------------------
// Fix #5 — OneClickDrive catalog image leakage
// ---------------------------------------------------------------------------

function fixOcdImageLeak(rental) {
  if (!rental.id?.startsWith('ocd-')) return false;
  const lid = rental.id.slice(4);
  if (!/^\d+$/.test(lid)) return false;

  const original = rental.images || [];
  if (original.length === 0) return false;

  const lidRe = new RegExp(`_${lid}(?:_|-)`);
  const filtered = original.filter((u) => lidRe.test(String(u).split('?')[0]));

  if (filtered.length === original.length) return false;

  if (filtered.length === 0) {
    // Strict filter dropped everything — keep only the very first image so we
    // never carry a foreign gallery into this listing.
    rental.images = [original[0]];
  } else {
    rental.images = filtered;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Fix #10 — dedupe listings sharing photos
// ---------------------------------------------------------------------------

function dedupeByImages(rentals) {
  const n = rentals.length;
  if (n === 0) return rentals;

  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  const norm  = rentals.map((r) => (r.images || []).map((u) => String(u).split('?')[0].toLowerCase()));
  const first = norm.map((a) => a[0] || null);

  const idxByImage = new Map();
  for (let i = 0; i < n; i++) {
    for (const u of norm[i]) {
      if (!idxByImage.has(u)) idxByImage.set(u, []);
      idxByImage.get(u).push(i);
    }
  }

  for (const list of idxByImage.values()) {
    if (list.length < 2) continue;
    for (let a = 0; a < list.length; a++) {
      for (let b = a + 1; b < list.length; b++) {
        const i = list[a], j = list[b];
        if (first[i] && first[i] === first[j]) { union(i, j); continue; }
        const setI = new Set(norm[i]);
        let shared = 0;
        for (const u of norm[j]) if (setI.has(u)) shared++;
        if (shared >= 2) union(i, j);
      }
    }
  }

  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(rentals[i]);
  }

  const out = [];
  let dropped = 0;
  for (const group of groups.values()) {
    if (group.length === 1) { out.push(group[0]); continue; }
    group.sort((a, b) => {
      const d = (b.images?.length || 0)   - (a.images?.length || 0);   if (d) return d;
      const e = (b.features?.length || 0) - (a.features?.length || 0); if (e) return e;
      return (b.options?.length || 0)     - (a.options?.length || 0);
    });
    console.log(`    keep ${group[0].id}  |  drop ${group.slice(1).map((x) => x.id).join(', ')}`);
    dropped += group.length - 1;
    out.push(group[0]);
  }

  if (dropped) console.log(`    removed ${dropped} duplicate listing(s)`);
  return out;
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

function writeAll(rentals) {
  fs.mkdirSync('data', { recursive: true });
  const json = JSON.stringify(rentals, null, 2);

  fs.writeFileSync(RENTAL_JSON,      json, 'utf8');
  fs.writeFileSync(RENTAL_DATA_JS,
    `// Automatically exported verified Moroccan rental listings for server and edge runtimes\n` +
    `export const DEFAULT_RENTAL_LISTINGS = ${json};\n`,
    'utf8');
  fs.writeFileSync(RENTAL_DEMO_JS,
    `/*\n` +
    ` * Real verified Moroccan rental vehicle listings (daily rates in MAD/day).\n` +
    ` * Used for instant client-side rendering and static/fallback operation.\n` +
    ` */\n` +
    `window.DEMO_RENTAL_LISTINGS = ${json};\n`,
    'utf8');
  fs.writeFileSync(RENTAL_DEMO_JSON, json, 'utf8');

  console.log('\nWrote:');
  console.log(`  ${RENTAL_JSON}`);
  console.log(`  ${RENTAL_DATA_JS}`);
  console.log(`  ${RENTAL_DEMO_JS}`);
  console.log(`  ${RENTAL_DEMO_JSON}`);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function run() {
  const rentals = loadRentals();
  console.log(`Loaded ${rentals.length} rentals from disk.\n`);

  // ---- Fix #3 ----
  console.log('Fix #3 — cylinder corrections');
  let cylFix = 0;
  for (const r of rentals) {
    if (correctCylinders(r)) {
      cylFix++;
      const val = (r.features || []).find((f) => f.label?.en === 'Cylinders')?.value?.en;
      console.log(`  ${r.id.padEnd(34)} ${r.title?.en} → ${val}`);
    }
  }
  if (cylFix === 0) console.log('  (none)');

  // ---- Fix #5 ----
  console.log('\nFix #5 — OneClickDrive image de-leak');
  let imgFix = 0;
  for (const r of rentals) {
    const before = (r.images || []).length;
    if (fixOcdImageLeak(r)) {
      imgFix++;
      console.log(`  ${r.id.padEnd(34)} ${before} → ${r.images.length} images`);
    }
  }
  if (imgFix === 0) console.log('  (none)');

  // ---- Fix #10 ----
  console.log('\nFix #10 — dedupe by shared photos');
  const before10 = rentals.length;
  const deduped = dedupeByImages(rentals);
  if (deduped.length === before10) console.log('  (none)');

  // ---- Write ----
  writeAll(deduped);

  console.log('\nSummary:');
  console.log(`  cylinder corrections:  ${cylFix}`);
  console.log(`  image-leak corrections: ${imgFix}`);
  console.log(`  duplicates removed:     ${before10 - deduped.length}`);
  console.log(`  total: ${before10} → ${deduped.length}`);
}

run();