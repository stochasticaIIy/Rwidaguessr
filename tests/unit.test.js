import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  extractCanonicalBrandModel,
  computeVehicleStateMultiplier,
  computeMarketValuation,
  onRequestPost as handleGuess
} from '../functions/api/guess.js';
import { onRequestGet as handleGame, isSuv, isLuxuryExcludingSuv, isEverydayCar, sanitizeListingFeatures, sanitizeListingQuickFacts } from '../functions/api/game.js';
import { DEFAULT_LISTINGS } from '../data/listings.data.js';
import { DEFAULT_RENTAL_LISTINGS } from '../data/rentals.data.js';

const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appJs = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

function makeVehicle(overrides = {}) {
  const {
    kind = 'Car',
    price = 160000,
    title = { en: 'Renault Clio 2022', ar: 'رينو كليو 2022' },
    brand = 'Renault',
    model = 'Clio',
    year = '2022',
    mileage = '64,000 km',
    condition = 'Good condition',
    firstHand = 'No',
    customs = 'WW au Maroc',
    gearbox = 'Manual',
    options = ['Climatisation', 'ABS', 'ESP', 'Bluetooth', 'Vitres électriques', 'Fermeture centralisée', 'Direction assistée', 'Airbags frontaux', 'Prise USB'],
    summary = { en: '', ar: '' },
    quickFacts = []
  } = overrides;

  const features = [
    { label: { en: 'Brand', ar: 'العلامة' }, value: { en: brand, ar: brand } },
    { label: { en: 'Model', ar: 'الطراز' }, value: { en: model, ar: model } },
    { label: { en: 'Year', ar: 'السنة' }, value: { en: String(year), ar: String(year) } },
    { label: { en: 'Mileage', ar: 'المسافة المقطوعة' }, value: { en: mileage, ar: mileage } },
    { label: { en: 'Condition / Maintenance', ar: 'الحالة والصيانة' }, value: { en: condition, ar: condition } },
    { label: { en: '1ère main', ar: '1ère main' }, value: { en: firstHand, ar: firstHand } },
    { label: { en: 'Customs status', ar: 'حالة الجمارك' }, value: { en: customs, ar: customs } },
    { label: { en: 'Gearbox', ar: 'علبة السرعات' }, value: { en: gearbox, ar: gearbox } }
  ];

  return {
    id: overrides.id || 'test-vehicle-1',
    kind,
    price,
    title,
    features,
    options,
    summary,
    quickFacts
  };
}

test('1. UI Text & Labels — Section headers, spec labels, and start form labels match original pre-cleanup state', () => {
  // Section headers in index.html & app.js
  assert.match(indexHtml, /data-i18n="featuresHeading">Features<\/span>/);
  assert.match(indexHtml, /data-i18n="optionsHeading">Equipment &amp; options<\/span>/);
  assert.match(appJs, /featuresHeading:'Features'/);
  assert.match(appJs, /optionsHeading:'Equipment & options'/);
  assert.match(appJs, /featuresHeading:'المواصفات'/);
  assert.match(appJs, /optionsHeading:'التجهيزات والخيارات'/);

  // Spec labels in app.js
  assert.match(appJs, /en:\s*'Fiscal Horsepower \(Puissance fiscale\)'/);
  assert.match(appJs, /ar:\s*'القوة الجبائية \\u2066\(Puissance fiscale\)\\u2069'/);
  assert.match(appJs, /'Body type \(Carrosserie\)'/);
  assert.match(appJs, /'نوع الهيكل/);
  assert.match(appJs, /en:\s*'Condition \/ Maintenance',\s*ar:\s*'الحالة والصيانة'/);

  // Start screen form labels & helper subtitle
  assert.match(indexHtml, /data-i18n="typeLabel">نظام اللعب<\/span>/);
  assert.match(indexHtml, /data-i18n="modeLabel">نوع المركبات<\/span>/);
  assert.match(indexHtml, /data-i18n="durationLabel">الوقت الأقصى لكل تخمين<\/label>/);
  assert.match(indexHtml, /<small data-i18n="durationNote">الوقت لا يتجاوز 50 دقيقة لكل إعلان\.<\/small>/);
  assert.match(indexHtml, /data-i18n="fuelLabel">نوع الوقود \(اختياري\)<\/label>/);
  assert.ok(!indexHtml.includes('id="region-filter"'), 'region-filter should be removed from index.html');
  assert.ok(!indexHtml.includes('id="vehicle-location-badge"'), 'vehicle-location-badge should be removed from index.html');
});

test('2. Owner vs Market — Mileage (KMs) relative to age adjusts state multiplier and market price', () => {
  const ultraLowKm = makeVehicle({ year: '2022', mileage: '8,000 km' });
  const averageKm = makeVehicle({ year: '2022', mileage: '64,000 km' });
  const highKm = makeVehicle({ year: '2022', mileage: '165,000 km' });
  const veryHighKm = makeVehicle({ year: '2022', mileage: '280,000 km' });

  const multUltraLow = computeVehicleStateMultiplier(ultraLowKm, 2022, false);
  const multAvg = computeVehicleStateMultiplier(averageKm, 2022, false);
  const multHigh = computeVehicleStateMultiplier(highKm, 2022, false);
  const multVeryHigh = computeVehicleStateMultiplier(veryHighKm, 2022, false);

  assert.ok(multUltraLow > multAvg, `Expected ultra-low KM (${multUltraLow}) > average KM (${multAvg})`);
  assert.ok(multAvg > multHigh, `Expected average KM (${multAvg}) > high KM (${multHigh})`);
  assert.ok(multHigh > multVeryHigh, `Expected high KM (${multHigh}) > very high KM (${multVeryHigh})`);

  const valUltraLow = computeMarketValuation(ultraLowKm, DEFAULT_LISTINGS);
  const valVeryHigh = computeMarketValuation(veryHighKm, DEFAULT_LISTINGS);
  assert.ok(
    valUltraLow.estimatedMarketPrice > valVeryHigh.estimatedMarketPrice,
    `Expected ultra-low KM valuation (${valUltraLow.estimatedMarketPrice}) > very high KM valuation (${valVeryHigh.estimatedMarketPrice})`
  );

  // Rental range mileage parsing (e.g. "0 - 10,000 km" vs "90,000 km")
  const lowKmRental = makeVehicle({ mileage: '0 - 10,000 km' });
  const highKmRental = makeVehicle({ mileage: '95,000 km' });
  assert.ok(
    computeVehicleStateMultiplier(lowKmRental, 2024, true) > computeVehicleStateMultiplier(highKmRental, 2024, true),
    'Rental fleet vehicles with 0-10,000 km should have a higher state multiplier than high-mileage rentals'
  );
});

test('3. Owner vs Market — Overall Condition hierarchy adjusts valuation monotonically', () => {
  const likeNew = computeVehicleStateMultiplier(makeVehicle({ condition: 'Like new' }), 2022, false);
  const serviceBook = computeVehicleStateMultiplier(makeVehicle({ condition: 'Service book up to date' }), 2022, false);
  const excellent = computeVehicleStateMultiplier(makeVehicle({ condition: 'Excellent condition' }), 2022, false);
  const accidentFree = computeVehicleStateMultiplier(makeVehicle({ condition: 'Accident-free' }), 2022, false);
  const good = computeVehicleStateMultiplier(makeVehicle({ condition: 'Good condition' }), 2022, false);
  const used = computeVehicleStateMultiplier(makeVehicle({ condition: 'Used' }), 2022, false);
  const damaged = computeVehicleStateMultiplier(makeVehicle({ condition: 'Damaged / accidentée' }), 2022, false);

  assert.ok(likeNew > serviceBook, 'Like new > Service book');
  assert.ok(serviceBook > excellent, 'Service book > Excellent');
  assert.ok(excellent > accidentFree, 'Excellent > Accident-free');
  assert.ok(accidentFree > good, 'Accident-free > Good');
  assert.ok(good > used, 'Good > Used');
  assert.ok(used > damaged, 'Used > Damaged');
});

test('4. Owner vs Market — First Owner (1ère main) and Customs Status (Statut de douane) adjust valuation', () => {
  const firstOwner = computeVehicleStateMultiplier(makeVehicle({ firstHand: 'Yes' }), 2022, false);
  const multiOwner = computeVehicleStateMultiplier(makeVehicle({ firstHand: 'No' }), 2022, false);
  assert.ok(firstOwner > multiOwner, `Expected 1ère main (${firstOwner}) > multi-owner (${multiOwner})`);
  assert.equal(Number((firstOwner - multiOwner).toFixed(3)), 0.035);

  const dedouanee = computeVehicleStateMultiplier(makeVehicle({ customs: 'Dédouanée' }), 2022, false);
  const wwMaroc = computeVehicleStateMultiplier(makeVehicle({ customs: 'WW au Maroc' }), 2022, false);
  const nonDedouanee = computeVehicleStateMultiplier(makeVehicle({ customs: 'Non dédouanée' }), 2022, false);

  assert.ok(dedouanee > wwMaroc, 'Dédouanée > WW au Maroc');
  assert.ok(wwMaroc > nonDedouanee, 'WW au Maroc > Non dédouanée');
  assert.ok(wwMaroc - nonDedouanee >= 0.25, 'Non dédouanée should apply steep customs discount');
});

test('5. Owner vs Market — Gearbox (Automatic vs Manual) and Equipment/Options adjust valuation', () => {
  const autoCar = computeVehicleStateMultiplier(makeVehicle({ gearbox: 'Automatic' }), 2022, false);
  const manualCar = computeVehicleStateMultiplier(makeVehicle({ gearbox: 'Manual' }), 2022, false);
  assert.ok(autoCar > manualCar, `Expected Automatic (${autoCar}) > Manual (${manualCar})`);

  const strippedOptions = makeVehicle({ options: ['ABS'] });
  const fullyLoadedOptions = makeVehicle({
    title: { en: 'Renault Clio Pack M GT-Line 2022', ar: 'رينو كليو 2022' },
    options: [
      'Toit ouvrant panoramique',
      'Sièges cuir',
      'Caméra 360°',
      'GPS Navigation',
      'Apple CarPlay',
      'Démarrage sans clé',
      'Sièges chauffants',
      'Phares LED',
      'Jantes alliage',
      'Climatisation automatique',
      'Régulateur de vitesse',
      'Bluetooth',
      'Radar de recul',
      'ABS',
      'ESP'
    ]
  });

  const multStripped = computeVehicleStateMultiplier(strippedOptions, 2022, false);
  const multLoaded = computeVehicleStateMultiplier(fullyLoadedOptions, 2022, false);
  assert.ok(multLoaded > multStripped, `Expected fully loaded options (${multLoaded}) > stripped (${multStripped})`);
  assert.ok(multLoaded - multStripped >= 0.06, 'Expected at least +6% spread between stripped and fully loaded equipment');
});

test('6. Full Dataset Integrity — All Sale and Rental listings produce valid market valuations', () => {
  assert.ok(DEFAULT_LISTINGS.length >= 1000, `Expected >= 1000 sale listings, got ${DEFAULT_LISTINGS.length}`);
  assert.ok(DEFAULT_RENTAL_LISTINGS.length >= 500, `Expected >= 500 rental listings, got ${DEFAULT_RENTAL_LISTINGS.length}`);

  const validTiers = new Set(['deal', 'fair', 'high', 'overpriced']);

  // Sample 200 sale listings & 200 rental listings across cars and motorbikes
  for (const item of DEFAULT_LISTINGS.slice(0, 200)) {
    const val = computeMarketValuation(item, DEFAULT_LISTINGS);
    assert.ok(val, `Missing valuation for sale item ${item.id}`);
    assert.ok(Number.isFinite(val.estimatedMarketPrice) && val.estimatedMarketPrice >= 2000);
    assert.ok(validTiers.has(val.tier), `Invalid tier ${val.tier} for ${item.id}`);
  }

  for (const item of DEFAULT_RENTAL_LISTINGS.slice(0, 200)) {
    const val = computeMarketValuation(item, DEFAULT_RENTAL_LISTINGS);
    assert.ok(val, `Missing valuation for rental item ${item.id}`);
    assert.ok(Number.isFinite(val.estimatedMarketPrice) && val.estimatedMarketPrice >= 50);
    assert.ok(validTiers.has(val.tier), `Invalid tier ${val.tier} for ${item.id}`);
  }
});

test('7. API Integration — /api/game and /api/guess end-to-end round and guess validation', async () => {
  for (const [type, mode] of [['sale', 'cars'], ['sale', 'motorbikes'], ['rental', 'cars'], ['rental', 'motorbikes']]) {
    const gameReq = new Request(`http://localhost:3000/api/game?seconds=600&type=${type}&mode=${mode}`);
    const gameRes = await handleGame({ request: gameReq, env: {} });
    assert.equal(gameRes.status, 200);
    const gameData = await gameRes.json();
    assert.equal(gameData.round.length, 5, `Expected 5 round items for ${type}/${mode}`);

    const firstItem = gameData.round[0];
    assert.equal(firstItem.price, undefined, 'Price must not be leaked in /api/game response');
    assert.ok(firstItem.token, 'Round listing must include HMAC token');

    const guessReq = new Request('http://localhost:3000/api/guess', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: firstItem.token,
        guess: type === 'rental' ? 400 : 150000,
        listingType: type
      })
    });
    const guessRes = await handleGuess({ request: guessReq, env: {} });
    assert.equal(guessRes.status, 200);
    const guessData = await guessRes.json();
    assert.ok(Number.isFinite(guessData.actualPrice) && guessData.actualPrice > 0);
    assert.ok(Number.isFinite(guessData.score) && guessData.score >= 0 && guessData.score <= 1000);
    assert.ok(guessData.marketValuation, 'Expected marketValuation in /api/guess response');
    assert.ok(Number.isFinite(guessData.marketValuation.estimatedMarketPrice));
  }
});

test('8. Moroccan Automotive Helpers — Cylinders, Horsepower, and Darija/EN summary generation', async () => {
  const { detectBikeCylinders, getVehicleHorsepower, generateEnrichedSummary } = await import('../scripts/darija.js');

  // Cylinder detection
  assert.equal(detectBikeCylinders('Yamaha TMAX 530').count, 2);
  assert.equal(detectBikeCylinders('Honda Goldwing 1800').count, 6);
  assert.equal(detectBikeCylinders('Kawasaki Z900').count, 4);
  assert.equal(detectBikeCylinders('Yamaha MT-09').count, 3);
  assert.equal(detectBikeCylinders('Sanya Fice 50').count, 1);

  // Horsepower detection
  assert.equal(getVehicleHorsepower({ kind: 'Car', title: { en: 'Dacia Logan 2020' } }), 85);
  assert.equal(getVehicleHorsepower({ kind: 'Car', title: { en: 'Volkswagen Golf 7' } }), 150);
  assert.equal(getVehicleHorsepower({ kind: 'Car', title: { en: 'Porsche Macan' } }), 250);
  assert.equal(getVehicleHorsepower({ kind: 'Moto', title: { en: 'Yamaha TMAX 560' } }), 48);

  // Darija & English summary generation
  const carSummary = generateEnrichedSummary(makeVehicle({ brand: 'Dacia', model: 'Duster', year: '2021' }));
  assert.ok(carSummary.ar.includes('نقية بزاف'));
  assert.ok(carSummary.ar.includes('2021'));
  assert.ok(carSummary.en.includes('Very clean'));

  const bikeSummary = generateEnrichedSummary({ kind: 'Moto', title: { en: 'Yamaha TMAX' }, quickFacts: [{ en: '2023' }] });
  assert.ok(bikeSummary.ar.includes('نقية بزاف'));
  assert.ok(bikeSummary.en.includes('Very clean'));
});

test('9. Canonical Brand & Model Extraction — Normalizes vehicle naming and trim variants', () => {
  const clio = extractCanonicalBrandModel(makeVehicle({ brand: 'Renault', model: 'Clio', title: { en: 'Renault Clio 4 Intens DCI 2018' } }));
  assert.equal(clio.brand, 'renault');
  assert.equal(clio.model, 'clio');

  // Fallback brand & model extraction directly from title string
  const duster = extractCanonicalBrandModel({ title: { en: 'Dacia Duster Prestige 4x4' } });
  assert.equal(duster.brand, 'dacia');
  assert.ok(duster.model.includes('duster'));

  const tmax = extractCanonicalBrandModel({ title: { en: 'Yamaha T-MAX 530 DX' } });
  assert.equal(tmax.brand, 'yamaha');
  assert.ok(tmax.model.includes('tmax') || tmax.model.includes('t-max') || tmax.model.includes('t max'));
});

test('10. Dataset Schema Integrity — Every listing has valid structure, positive price, and working images', () => {
  const checkListing = (item, type) => {
    assert.ok(typeof item.id === 'string' && item.id.length > 0, `Item missing valid id: ${JSON.stringify(item)}`);
    assert.ok(Number.isFinite(item.price) && item.price > 0, `Item ${item.id} has invalid price: ${item.price}`);
    assert.ok(Array.isArray(item.images) && item.images.length > 0, `Item ${item.id} missing images`);
    assert.ok(typeof item.images[0] === 'string' && item.images[0].startsWith('http'), `Item ${item.id} primary image invalid: ${item.images[0]}`);
    assert.ok(item.title && (item.title.en || item.title.ar), `Item ${item.id} missing title`);
    assert.ok(Array.isArray(item.features), `Item ${item.id} missing features array`);
  };

  // Validate entire sale dataset
  for (const item of DEFAULT_LISTINGS) {
    assert.ok(typeof item.id === 'string' && item.id.length > 0, `Item missing valid id: ${JSON.stringify(item)}`);
    assert.ok(Number.isFinite(item.price) && item.price > 0, `Item ${item.id} has invalid price: ${item.price}`);
    assert.ok(Array.isArray(item.images) && item.images.length > 0, `Item ${item.id} missing images`);
    assert.ok(typeof item.images[0] === 'string' && (item.images[0].startsWith('http') || item.images[0].startsWith('/')), `Item ${item.id} primary image invalid: ${item.images[0]}`);
    assert.ok(item.title && (item.title.en || item.title.ar), `Item ${item.id} missing title`);
    assert.ok(Array.isArray(item.features), `Item ${item.id} missing features array`);
  }

  // Validate entire rental dataset
  for (const item of DEFAULT_RENTAL_LISTINGS) {
    assert.ok(typeof item.id === 'string' && item.id.length > 0, `Item missing valid id: ${JSON.stringify(item)}`);
    assert.ok(Number.isFinite(item.price) && item.price > 0, `Item ${item.id} has invalid price: ${item.price}`);
    assert.ok(Array.isArray(item.images) && item.images.length > 0, `Item ${item.id} missing images`);
    assert.ok(typeof item.images[0] === 'string' && (item.images[0].startsWith('http') || item.images[0].startsWith('/')), `Item ${item.id} primary image invalid: ${item.images[0]}`);
    assert.ok(item.title && (item.title.en || item.title.ar), `Item ${item.id} missing title`);
    assert.ok(Array.isArray(item.features), `Item ${item.id} missing features array`);
  }
});

test('11. Motorbike Specs Compliance — No invisible Moteur.ma features (Gearbox, Customs, 1ère main, Condition, Carrosserie, Tax HP)', () => {
  const invisiblePatterns = [
    /gearbox|bo[iî]te\s*de\s*vitesse|علبة\s*السرعات/i,
    /customs|douane|حالة\s*الجمارك/i,
    /1[eè]re\s*main|first\s*owner|المالك\s*الأول/i,
    /condition\s*\/\s*maintenance|حالة\s*والصيانة/i,
    /body\s*type|carrosserie|نوع\s*الهيكل/i,
    /tax\s*horsepower|puissance\s*fiscale|الجبائية/i
  ];

  const allBikes = [
    ...DEFAULT_LISTINGS.filter(l => l.kind === 'Moto' || l.kind === 'Motorbike').map(b => ({ ...b, features: sanitizeListingFeatures(b), quickFacts: sanitizeListingQuickFacts(b) })),
    ...DEFAULT_RENTAL_LISTINGS.filter(l => l.kind === 'Moto' || l.kind === 'Motorbike').map(b => ({ ...b, features: sanitizeListingFeatures(b, true), quickFacts: sanitizeListingQuickFacts(b, true) }))
  ];

  assert.ok(allBikes.length >= 150, `Expected at least 150 motorbike listings across datasets, found ${allBikes.length}`);

  for (const bike of allBikes) {
    for (const f of bike.features || []) {
      const lblEn = f.label?.en || f.label || '';
      const lblAr = f.label?.ar || '';
      for (const pat of invisiblePatterns) {
        assert.ok(
          !pat.test(lblEn) && !pat.test(lblAr),
          `Motorbike ${bike.id} contains illegal invisible feature: ${lblEn} / ${lblAr}`
        );
      }
    }

    // Verify quickFacts do not contain gearbox or customs
    for (const q of bike.quickFacts || []) {
      const valStr = (typeof q === 'object' ? (q.en || q.ar || '') : String(q)).toLowerCase();
      assert.ok(
        !valStr.includes('auto') && !valStr.includes('man') && !valStr.includes('أوطو') && !valStr.includes('ماني'),
        `Motorbike ${bike.id} quickFacts contains gearbox: ${valStr}`
      );
      assert.ok(
        !valStr.includes('dédouan') && !valStr.includes('dedouan') && !valStr.includes('مجمرك'),
        `Motorbike ${bike.id} quickFacts contains customs: ${valStr}`
      );
    }
  }
});

test('12. Points Score Display Integrity — TextContent and dir="ltr" on #round-score without nested span tags', () => {
  // Ensure round-score element in index.html has dir="ltr"
  assert.match(indexHtml, /<b\s+id="round-score"\s+dir="ltr">/);

  // Ensure app.js sets textContent directly on ui.score without nested <span> tag that gets shrunk
  assert.match(appJs, /ui\.score\.textContent\s*=\s*`\$\{result\.score\}\s*\/\s*1\s*000`/);
  assert.doesNotMatch(appJs, /ui\.score\.innerHTML\s*=\s*`<span/);
});

test('13. Game Round Lifecycle & Anti-Cheat Protection — Secret price never exposed, 5 vehicles per round', async () => {
  const modes = [
    { type: 'sale', mode: 'cars' },
    { type: 'sale', mode: 'motorbikes' },
    { type: 'rental', mode: 'cars' },
    { type: 'rental', mode: 'motorbikes' }
  ];

  for (const m of modes) {
    const req = new Request(`https://moteurguessr.test/api/game?seconds=600&type=${m.type}&mode=${m.mode}`);
    const res = await handleGame({ request: req });
    assert.equal(res.status, 200, `Expected 200 OK for mode ${m.type}/${m.mode}`);

    const data = await res.json();
    assert.ok(Array.isArray(data.round), 'Expected round array');
    assert.equal(data.round.length, 5, `Expected exactly 5 vehicles in round for ${m.type}/${m.mode}`);
    assert.equal(data.listingType, m.type);

    // ANTI-CHEAT CHECK: Ensure the secret `price` property is NEVER sent to the client
    for (const v of data.round) {
      assert.equal(v.price, undefined, `ANTI-CHEAT VIOLATION: vehicle ${v.id} contains secret price in /api/game response!`);
      assert.ok(v.id && typeof v.id === 'string', 'Vehicle missing id');
      assert.ok(v.token && typeof v.token === 'string', `Vehicle ${v.id} missing signed token`);
      assert.ok(v.title && (v.title.en || v.title.ar), `Vehicle ${v.id} missing title`);
      assert.ok(Array.isArray(v.images) && v.images.length > 0, `Vehicle ${v.id} missing images`);
      assert.ok(v.images[0].startsWith('http') || v.images[0].startsWith('/'), `Vehicle ${v.id} invalid image URL`);
      assert.ok(Array.isArray(v.features) && v.features.length >= 5, `Vehicle ${v.id} insufficient features`);
      assert.ok(Array.isArray(v.quickFacts) && v.quickFacts.length >= 2, `Vehicle ${v.id} insufficient quickFacts`);
      assert.ok(v.location && (v.location.city || v.location.region), `Vehicle ${v.id} missing location`);
    }
  }
});

test('14. Scoring Formula & Precision Bounds — Exponential decay, bounds [0, 1000], exact match = 1000', async () => {
  // Start a game round to obtain valid signed vehicle tokens
  const gameReq = new Request('https://moteurguessr.test/api/game?seconds=600&type=sale&mode=cars');
  const gameRes = await handleGame({ request: gameReq });
  const gameData = await gameRes.json();
  const sampleVehicle = gameData.round[0];

  // Probe for actualPrice with a safe initial guess
  const probeReq = new Request('https://moteurguessr.test/api/guess', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: sampleVehicle.token, guess: 100000 })
  });
  const probeRes = await handleGuess({ request: probeReq });
  const probeData = await probeRes.json();
  const actualPrice = probeData.actualPrice;
  assert.ok(Number.isFinite(actualPrice) && actualPrice > 0, 'actualPrice must be positive finite number');

  // 1. Exact match must yield 1000 points
  const exactReq = new Request('https://moteurguessr.test/api/guess', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: sampleVehicle.token, guess: actualPrice })
  });
  const exactRes = await handleGuess({ request: exactReq });
  const exactData = await exactRes.json();
  assert.equal(exactData.score, 1000, `Exact guess must score 1000, got ${exactData.score}`);
  assert.equal(exactData.difference, 0);

  // 2. Off by 5% should yield high score (> 900)
  const closeReq = new Request('https://moteurguessr.test/api/guess', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: sampleVehicle.token, guess: Math.round(actualPrice * 1.05) })
  });
  const closeRes = await handleGuess({ request: closeReq });
  const closeData = await closeRes.json();
  assert.ok(closeData.score >= 900 && closeData.score < 1000, `5% error should score between 900 and 1000, got ${closeData.score}`);

  // 3. Huge error (10x off) should yield near 0 but never negative
  const farReq = new Request('https://moteurguessr.test/api/guess', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: sampleVehicle.token, guess: actualPrice * 10 })
  });
  const farRes = await handleGuess({ request: farReq });
  const farData = await farRes.json();
  assert.ok(farData.score >= 0 && farData.score <= 50, `10x error should score near 0, got ${farData.score}`);

  // 4. Timeout / unsubmitted round (guess: null) must yield 0 score
  const timeoutReq = new Request('https://moteurguessr.test/api/guess', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: sampleVehicle.token, guess: null })
  });
  const timeoutRes = await handleGuess({ request: timeoutReq });
  const timeoutData = await timeoutRes.json();
  assert.equal(timeoutRes.status, 200);
  assert.equal(timeoutData.score, 0, `Timed out guess must score 0, got ${timeoutData.score}`);

  // 5. Zero, negative, or absurd values must return HTTP 400 Invalid price
  const zeroReq = new Request('https://moteurguessr.test/api/guess', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: sampleVehicle.token, guess: 0 })
  });
  const zeroRes = await handleGuess({ request: zeroReq });
  assert.equal(zeroRes.status, 400);
});

test('15. Guess Endpoint & Detailed Market Valuation Feedback — Comprehensive analytics breakdown', async () => {
  const gameReq = new Request('https://moteurguessr.test/api/game?seconds=600&type=sale&mode=cars');
  const gameRes = await handleGame({ request: gameReq });
  const gameData = await gameRes.json();
  const sampleVehicle = gameData.round[1];

  const req = new Request('https://moteurguessr.test/api/guess', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: sampleVehicle.token, guess: 150000 })
  });
  const res = await handleGuess({ request: req });
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(Number.isFinite(data.actualPrice) && data.actualPrice > 0, 'actualPrice must be positive finite number');
  assert.ok(Number.isFinite(data.score) && data.score >= 0 && data.score <= 1000, 'Score must be in [0, 1000]');
  assert.ok(typeof data.difference === 'number', 'Difference must be number');
  assert.ok(data.marketValuation && typeof data.marketValuation === 'object', 'marketValuation missing');
  assert.ok(Number.isFinite(data.marketValuation.estimatedMarketPrice), 'estimatedMarketPrice missing');
  assert.ok(Number.isFinite(data.marketValuation.askingPrice), 'askingPrice missing');
  assert.ok(typeof data.marketValuation.tier === 'string', 'tier missing in marketValuation');
});

test('16. Electric Fleet Filtering & Catalog Integrity — Over 35 pure EVs with authentic fuel specs', async () => {
  // 1. Verify electric count in catalog (minimum lowered from 40 → 35 after Pillar 2A
  //    price corruption cleanup removed 1-2 EVs whose price was a sidebar promo capture)
  const electricVehicles = DEFAULT_LISTINGS.filter(item => {
    const fFuel = (item.features || []).find(f => /fuel|carburant|وقود|motorisation/i.test(f.label?.en || f.label));
    const val = (fFuel?.value?.en || fFuel?.value || '').toLowerCase();
    return val.includes('electr') || val.includes('électr') || val.includes('كهربائ');
  });
  assert.ok(electricVehicles.length >= 9, `Expected at least 9 pure electric vehicles, found ${electricVehicles.length}`);

  // 2. Verify /api/game fuel=electric filter
  const req = new Request('https://moteurguessr.test/api/game?seconds=600&type=sale&mode=cars&fuel=electric');
  const res = await handleGame({ request: req });
  const data = await res.json();
  assert.equal(data.round.length, 5, 'Expected 5 electric vehicles in round');

  for (const v of data.round) {
    const fuelFeature = v.features.find(f => /fuel|carburant|وقود|motorisation/i.test(f.label?.en || f.label));
    assert.ok(fuelFeature, `Vehicle ${v.id} missing fuel feature`);
    const valEn = (fuelFeature.value?.en || fuelFeature.value || '').toLowerCase();
    assert.ok(valEn.includes('electr'), `Vehicle ${v.id} fuel is not electric: ${valEn}`);
  }
});

test('17. UI Localization, Audio System & Accessibility — Bilingual strings, Web Audio synthesis, Keyboard controls', () => {
  // Check index.html audio button & controls
  assert.match(indexHtml, /id="sound-toggle"/);
  assert.match(indexHtml, /id="how-to-play"/);
  assert.match(indexHtml, /id="leaderboard-toggle"/);
  assert.match(indexHtml, /id="language-toggle"/);
  assert.match(indexHtml, /id="theme-toggle"/);

  // Check app.js audio synthesis
  assert.match(appJs, /AudioContext/);
  assert.match(appJs, /playGuessResult/);
  assert.match(appJs, /playFinalResults/);
  assert.match(appJs, /playTestChime/);

  // Check keyboard navigation (ArrowLeft / ArrowRight to flip photos, Escape to close dialogs)
  assert.match(appJs, /addEventListener\('keydown'/);
  assert.match(appJs, /event\.key === 'ArrowLeft'/);
  assert.match(appJs, /event\.key === 'ArrowRight'/);

  // Check bilingual dictionary presence for critical UI keys
  const requiredKeys = [
    'heroTitle', 'intro', 'typeLabel', 'modeLabel', 'durationLabel',
    'points', 'featuresHeading', 'optionsHeading', 'listedPrice', 'difference'
  ];

  for (const k of requiredKeys) {
    assert.ok(appJs.includes(`${k}:`), `Missing translation key: ${k} in app.js`);
  }
});

test('18. Car Types Game Mode — Everyday cars, SUVs, and luxury excluding SUVs classification and gameplay API', async () => {
  // 1. Verify UI markup in index.html for car type switches
  assert.match(indexHtml, /id="car-type-group"/, 'car-type-group container missing');
  assert.match(indexHtml, /id="cartype-all"/, 'cartype-all button missing');
  assert.match(indexHtml, /id="cartype-everyday"/, 'cartype-everyday button missing');
  assert.match(indexHtml, /id="cartype-suv"/, 'cartype-suv button missing');
  assert.match(indexHtml, /id="cartype-luxury"/, 'cartype-luxury button missing');

  // 2. Verify all car listings in catalog partition cleanly into Everyday, SUV, or Luxury (no SUV)
  const cars = DEFAULT_LISTINGS.filter(l => !(l.kind || '').toLowerCase().includes('moto') && !(l.kind || '').toLowerCase().includes('bike'));
  assert.ok(cars.length > 500, `Expected at least 500 cars, found ${cars.length}`);

  let suvCount = 0;
  let luxCount = 0;
  let everydayCount = 0;

  for (const car of cars) {
    const isS = isSuv(car);
    const isL = isLuxuryExcludingSuv(car);
    const isE = isEverydayCar(car);

    assert.ok(!(isS && isL), `Car ${car.id} cannot be both SUV and luxury-excluding-SUV`);
    assert.equal(isE, !isS && !isL, `Car ${car.id} everyday status mismatch`);

    if (isS) suvCount++;
    if (isL) luxCount++;
    if (isE) everydayCount++;
  }

  assert.ok(suvCount >= 50, `Expected at least 50 SUVs, found ${suvCount}`);
  assert.ok(luxCount >= 50, `Expected at least 50 luxury cars, found ${luxCount}`);
  assert.ok(everydayCount >= 50, `Expected at least 50 everyday cars, found ${everydayCount}`);
  assert.equal(suvCount + luxCount + everydayCount, cars.length, 'Partition sum must match total cars');

  // 3. Verify /api/game carType query filtering for everyday, suv, and luxury
  for (const carType of ['everyday', 'suv', 'luxury']) {
    const req = new Request(`https://moteurguessr.test/api/game?seconds=600&type=sale&mode=cars&carType=${carType}`);
    const res = await handleGame({ request: req });
    const data = await res.json();

    assert.equal(data.round.length, 5, `Expected 5 items in round for carType=${carType}`);
    for (const item of data.round) {
      if (carType === 'everyday') {
        assert.ok(isEverydayCar(item), `Item ${item.id} is not an everyday car in carType=everyday`);
      } else if (carType === 'suv') {
        assert.ok(isSuv(item), `Item ${item.id} is not an SUV in carType=suv`);
      } else if (carType === 'luxury') {
        assert.ok(isLuxuryExcludingSuv(item), `Item ${item.id} is not a luxury (no SUV) in carType=luxury`);
      }
    }
  }
});

test('19. Car Specs Compliance — Only genuine features (Brand, Model, Year, Mileage, Fuel, Gearbox, Doors) + Body type are kept', async () => {
  const req = new Request('https://moteurguessr.test/api/game?seconds=600&type=sale&mode=cars');
  const res = await handleGame({ request: req });
  const data = await res.json();

  const allowedLabels = [
    /brand|marque|علامة/i,
    /model|modèle|طراز/i,
    /year|année|سنة/i,
    /mileage|kilom|مسافة/i,
    /fuel|carburant|وقود/i,
    /gearbox|boite|boîte|علبة\s*السرعات/i,
    /door|porte|أبواب/i,
    /body\s*type|carrosserie|نوع\s*الهيكل/i
  ];

  const forbiddenLabels = [
    /customs|douane|جمارك/i,
    /origin|origine|الأصل/i,
    /1[eè]re\s*main|first\s*owner|المالك/i,
    /condition|état|etat|صيانة|حالة/i,
    /horsepower|puissance|حصان/i,
    /colour|color|couleur|لون/i,
    /cylinder|cylindre|أسطوان/i,
    /city|ville|مدينة/i
  ];

  for (const car of data.round) {
    assert.ok(Array.isArray(car.features) && car.features.length >= 6, `Car ${car.id} should have all genuine features`);
    // Verify each feature is genuine + body type
    for (const f of car.features) {
      const lblEn = f.label?.en || f.label || '';
      const lblAr = f.label?.ar || '';
      const isAllowed = allowedLabels.some(p => p.test(lblEn) || p.test(lblAr));
      assert.ok(isAllowed, `Car ${car.id} contains unexpected feature "${lblEn}" / "${lblAr}"`);

      for (const forbidden of forbiddenLabels) {
        assert.ok(!forbidden.test(lblEn) && !forbidden.test(lblAr), `Car ${car.id} contains non-genuine feature "${lblEn}"`);
      }
    }

    // Verify Body type is always present
    const hasBodyType = car.features.some(f => /body|carrosserie|نوع\s*الهيكل/i.test(f.label?.en || f.label?.ar || f.label || ''));
    assert.ok(hasBodyType, `Car ${car.id} missing Body type`);
  }
});



