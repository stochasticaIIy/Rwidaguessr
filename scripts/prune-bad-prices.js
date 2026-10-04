#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const KNOWN_SIDEBAR_PROMO_PRICES = new Set([
  232900, 293900, 379000, 220200, 424900, 200000, 319900,
  159900, 259900, 289900, 349900, 359900, 399000, 449000,
  169900, 179900, 189900, 199900, 219900, 249900, 269900,
  499000, 549000, 599000, 649000, 699000, 749000, 799000,
  849000, 899000, 949000, 999000, 1099000, 1199000, 1299000,
  1399000, 1499000, 1599000, 1699000, 1799000, 1899000, 1999000,
  2099000, 2199000, 2299000, 2399000, 2499000, 2599000, 2799000,
  2999000, 3000000, 3200000, 3500000, 3800000, 4000000, 4200000,
  4500000, 5000000, 5500000, 6000000,
  230000, 290000, 380000, 220000, 320000
]);

const IN = process.argv[2] || path.resolve(process.cwd(), 'data/listings.imported.json');
const REPORT_OUT = path.resolve(process.cwd(), 'logs/pruned-prices-report-' + Date.now() + '.json');
fs.mkdirSync(path.dirname(REPORT_OUT), { recursive: true });

if (!fs.existsSync(IN)) {
  console.error('[prune-bad-prices] Missing input file:', IN);
  process.exit(1);
}

const all = JSON.parse(fs.readFileSync(IN, 'utf8'));
console.log(`[prune-bad-prices] Loaded ${all.length} listings from ${IN}`);

function norm(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getBM(l) {
  let b = '', m = '';
  if (Array.isArray(l.features)) {
    for (const f of l.features) {
      const lbl = norm(typeof f.label === 'object' ? (f.label.en || f.label.ar || f.label.raw || f.label) : f.label);
      const val = typeof f.value === 'object' ? (f.value.en || f.value.ar || f.value.raw || f.value) : f.value;
      if (lbl === 'brand' || lbl.includes('marque')) b = norm(val);
      else if (lbl === 'model' || lbl.includes('modele')) m = norm(val);
    }
  }
  if (!b || !m) {
    const t = norm(typeof l.title === 'object' ? (l.title.en || l.title.ar) : l.title);
    const p = t.split(' ').filter(Boolean);
    if (!b && p[0]) b = p[0];
    if (!m && p[1]) m = p.slice(1).join(' ');
  }
  return { b, m };
}

function getFuel(l) {
  if (Array.isArray(l.features)) {
    for (const f of l.features) {
      const lbl = norm(typeof f.label === 'object' ? (f.label.en || f.label.ar || f.label.raw) : f.label);
      const val = norm(typeof f.value === 'object' ? (f.value.en || f.value.ar || f.value.raw) : f.value);
      if (lbl.includes('carburant') || lbl.includes('fuel') || lbl.includes('motorisation') || lbl.includes('moteur')) {
        if (val.includes('electr')) return 'EV';
        if (val.includes('hybrid')) return 'Hybrid';
        if (val.includes('diesel') || val.includes('ديزل')) return 'Diesel';
        if (val.includes('essence') || val.includes('petrol') || val.includes('بنزين')) return 'Petrol';
        if (val.includes('gpl') || val.includes('gnv')) return 'Gas';
        return val || 'U';
      }
    }
  }
  if (Array.isArray(l.quickFacts) && l.quickFacts[2]) {
    const s = norm(typeof l.quickFacts[2] === 'object' ? (l.quickFacts[2].en || l.quickFacts[2].ar) : l.quickFacts[2]);
    if (s.includes('electr')) return 'EV';
    if (s.includes('hybrid')) return 'Hybrid';
    if (s.includes('diesel') || s.includes('ديزل')) return 'Diesel';
    if (s.includes('essence') || s.includes('petrol') || s.includes('بنزين')) return 'Petrol';
    return s || 'U';
  }
  return 'U';
}

function getYear(l) {
  if (Array.isArray(l.quickFacts) && l.quickFacts[0]) {
    const s = (typeof l.quickFacts[0] === 'object' ? (l.quickFacts[0].en || l.quickFacts[0].ar) : l.quickFacts[0]).toString();
    const m = s.match(/(19|20)\d{2}/);
    if (m) return parseInt(m[0], 10);
  }
  return null;
}

const records = all.map(l => {
  const { b, m } = getBM(l);
  const y = getYear(l);
  const f = getFuel(l);
  const dec = y ? Math.floor(y / 5) * 5 : 'u';
  return {
    id: l.id, price: l.price, title: typeof l.title === 'object' ? (l.title.en || l.title.ar) : l.title,
    brand: b, model: m, year: y, fuel: f, dec,
    exactPromo: KNOWN_SIDEBAR_PROMO_PRICES.has(l.price),
    kind: l.kind,
    looseKey: `${b}|${m}|${f}`,
    brandKey: `${b}|${f}`
  };
});

// Count how many distinct models share each price
const priceCrossModelCount = new Map();
const priceToBM = new Map();
for (const r of records) {
  if (r.price == null) continue;
  priceCrossModelCount.set(r.price, (priceCrossModelCount.get(r.price) || 0) + 1);
  if (!priceToBM.has(r.price)) priceToBM.set(r.price, new Set());
  priceToBM.get(r.price).add(`${r.brand}|${r.model}|${r.kind}`);
}

// Peer-cohort medians
function median(arr) {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const byLoose = new Map();
for (const r of records) {
  if (!byLoose.has(r.looseKey)) byLoose.set(r.looseKey, []);
  byLoose.get(r.looseKey).push(r);
}
const byBrand = new Map();
for (const r of records) {
  if (!byBrand.has(r.brandKey)) byBrand.set(r.brandKey, []);
  byBrand.get(r.brandKey).push(r);
}

function getCohortMedian(r) {
  const loose = (byLoose.get(r.looseKey) || []).filter(p => p.id !== r.id && p.price && p.price > 1000);
  if (loose.length >= 5) return { med: median(loose.map(p => p.price)), n: loose.length, tier: 'loose' };
  const brand = (byBrand.get(r.brandKey) || []).filter(p => p.id !== r.id && p.price && p.price > 1000);
  if (brand.length >= 8) return { med: median(brand.map(p => p.price)), n: brand.length, tier: 'brand' };
  return null;
}

const pruned = [];
const reasons = [];
for (const r of records) {
  if (r.price == null || typeof r.price !== 'number') continue;

  // RULE 1: Exact promo price match — 100% confidence removal
  if (r.exactPromo) {
    pruned.push(r.id);
    reasons.push({ id: r.id, title: r.title, rule: 'RULE1_EXACT_PROMO_PRICE',
      price: r.price, note: `Price ${r.price} matches known sidebar promo price set` });
    continue;
  }

  const distinctBM = (priceToBM.get(r.price) || new Set()).size;
  const repeatCount = priceCrossModelCount.get(r.price) || 0;

  // RULE 2: Peer-cohort outlier + cross-model repeat
  //   Extreme cohort outlier (>3x or <0.2x of Brand|Model|Fuel median with ≥5 peers)
  //   AND price appears in ≥3 distinct brand/model combos → definitely sidebar leakage
  const cohort = getCohortMedian(r);
  if (cohort && cohort.med > 0) {
    const ratio = r.price / cohort.med;
    const extremeOutlier = ratio > 3 || ratio < 0.2;
    if (extremeOutlier && distinctBM >= 3) {
      pruned.push(r.id);
      reasons.push({ id: r.id, title: r.title, rule: 'RULE2_COHORT_OUTLIER_PLUS_REPEATED_PRICE',
        price: r.price, cohortMed: cohort.med, ratio: Math.round(ratio * 100) / 100,
        distinctBM, repeatCount, tier: cohort.tier, cohortN: cohort.n,
        note: `Cohort med ${cohort.med.toLocaleString()} MAD (n=${cohort.n}) ratio=${ratio.toFixed(2)} price in ${distinctBM} distinct BM combos` });
      continue;
    }
  }
}

console.log(`\n[prune-bad-prices] Rules applied:`);
console.log(`  RULE1_EXACT_PROMO_PRICE: exact match against ${KNOWN_SIDEBAR_PROMO_PRICES.size} known sidebar promo prices`);
console.log(`  RULE2_COHORT_OUTLIER_PLUS_REPEATED_PRICE: >3x/<0.2x cohort median (n≥5) + price appears in ≥3 distinct Brand|Model combos`);
console.log();

const counts = reasons.reduce((acc, r) => { acc[r.rule] = (acc[r.rule] || 0) + 1; return acc; }, {});
for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v} listings removed`);
console.log(`  -------`);
console.log(`  TOTAL removed: ${pruned.length}/${all.length} (${Math.round(100 * pruned.length / all.length)}%)`);

const before = all.length;
const kept = all.filter(l => !pruned.includes(l.id));
console.log(`  Keeping ${kept.length} listings.`);

const BACKUP = IN + '.bak-prune-' + Date.now();
fs.copyFileSync(IN, BACKUP);
fs.writeFileSync(IN, JSON.stringify(kept, null, 2), 'utf8');
console.log(`\n[prune-bad-prices] Wrote pruned dataset to ${IN}`);
console.log(`  Backup of original file: ${BACKUP}`);

fs.writeFileSync(REPORT_OUT, JSON.stringify({
  removedCount: pruned.length,
  keptCount: kept.length,
  originalCount: all.length,
  rules: {
    RULE1_EXACT_PROMO_PRICE: 'Exact match against known sidebar promo prices set',
    RULE2_COHORT_OUTLIER_PLUS_REPEATED_PRICE: '>3x or <0.2x cohort median + price repeated across ≥3 distinct Brand|Model combos'
  },
  removedList: reasons
}, null, 2), 'utf8');
console.log(`  Detailed pruning report (with per-ID reasons & notes): ${REPORT_OUT}`);

console.log('\n=== Top 30 Removed (sample) ===');
for (let i = 0; i < Math.min(30, reasons.length); i++) {
  const r = reasons[i];
  console.log(`  ${(i+1+').').padEnd(4)} id=${r.id}  price=${String(r.price).padStart(10)} MAD  rule=${r.rule}`);
  console.log(`       Title: ${r.title}`);
  console.log(`       Note : ${r.note}`);
}
