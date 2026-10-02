import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  extractCanonicalBrandModel,
  computeVehicleStateMultiplier,
  computeMarketValuation,
  onRequestPost as handleGuess
} from '../functions/api/guess.js';
import { onRequestGet as handleGame } from '../functions/api/game.js';
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
  assert.match(indexHtml, /data-i18n="regionLabel">المنطقة أو المدينة \(اختياري\)<\/label>/);
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
  assert.ok(DEFAULT_RENTAL_LISTINGS.length >= 1000, `Expected >= 1000 rental listings, got ${DEFAULT_RENTAL_LISTINGS.length}`);

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
    checkListing(item, 'sale');
  }

  // Validate entire rental dataset
  for (const item of DEFAULT_RENTAL_LISTINGS) {
    checkListing(item, 'rental');
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
    ...DEFAULT_LISTINGS.filter(l => l.kind === 'Moto' || l.kind === 'Motorbike'),
    ...DEFAULT_RENTAL_LISTINGS.filter(l => l.kind === 'Moto' || l.kind === 'Motorbike')
  ];

  assert.ok(allBikes.length >= 300, `Expected at least 300 motorbike listings across datasets, found ${allBikes.length}`);

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

