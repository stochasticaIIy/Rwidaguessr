import fs from 'fs';
import path from 'path';
import { generateEnrichedSummary } from './darija.js';

const list = JSON.parse(fs.readFileSync('data/listings.imported.json', 'utf8'));
console.log(`Starting update of ${list.length} listings...`);

// Moroccan cities and regions
const MOROCCAN_CITIES = [
  // Casablanca - Settat (~38%)
  { city: 'Casablanca', cityAr: 'الدار البيضاء', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, weight: 24, patterns: [/\bcasablanca\b/i, /\bcasa\b/i, /(?<![\u0621-\u064A])الدار البيضاء(?![\u0621-\u064A])/, /(?<![\u0621-\u064A])كازا(?![\u0621-\u064A])/] },
  { city: 'Mohammedia', cityAr: 'المحمدية', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, weight: 4, patterns: [/\bmohammedia\b/i, /(?<![\u0621-\u064A])المحمدية(?![\u0621-\u064A])/] },
  { city: 'El Jadida', cityAr: 'الجديدة', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, weight: 4, patterns: [/\bel jadida\b/i, /\bjadida\b/i, /(?<![\u0621-\u064A])الجديدة(?![\u0621-\u064A])/] },
  { city: 'Berrechid', cityAr: 'برشيد', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, weight: 3, patterns: [/\bberrechid\b/i, /(?<![\u0621-\u064A])برشيد(?![\u0621-\u064A])/] },
  { city: 'Settat', cityAr: 'سطات', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, weight: 3, patterns: [/\bsettat\b/i, /(?<![\u0621-\u064A])سطات(?![\u0621-\u064A])/] },

  // Rabat - Salé - Kénitra (~26%)
  { city: 'Rabat', cityAr: 'الرباط', region: 'rabat', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, weight: 12, patterns: [/\brabat\b/i, /(?<![\u0621-\u064A])الرباط(?![\u0621-\u064A])/] },
  { city: 'Salé', cityAr: 'سلا', region: 'rabat', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, weight: 5, patterns: [/\bsal[ée]\b/i, /(?<![\u0621-\u064A])سلا(?![\u0621-\u064A])/] },
  { city: 'Kénitra', cityAr: 'القنيطرة', region: 'rabat', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, weight: 5, patterns: [/\bk[ée]nitra\b/i, /(?<![\u0621-\u064A])القنيطرة(?![\u0621-\u064A])/] },
  { city: 'Témara', cityAr: 'تمارة', region: 'rabat', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, weight: 4, patterns: [/\bt[ée]mara\b/i, /(?<![\u0621-\u064A])تمارة(?![\u0621-\u064A])/] },

  // Tanger - Tétouan (~14%)
  { city: 'Tanger', cityAr: 'طنجة', region: 'tanger', regionName: { ar: 'طنجة - تطوان - الشمال', en: 'Tangier - Tétouan (North)' }, weight: 8, patterns: [/\btanger\b/i, /\btangier\b/i, /(?<![\u0621-\u064A])طنجة(?![\u0621-\u064A])/] },
  { city: 'Tétouan', cityAr: 'تطوان', region: 'tanger', regionName: { ar: 'طنجة - تطوان - الشمال', en: 'Tangier - Tétouan (North)' }, weight: 3, patterns: [/\bt[ée]touan\b/i, /(?<![\u0621-\u064A])تطوان(?![\u0621-\u064A])/] },
  { city: 'Nador', cityAr: 'الناظور', region: 'tanger', regionName: { ar: 'طنجة - تطوان - الشمال', en: 'Tangier - Tétouan (North)' }, weight: 2, patterns: [/\bnador\b/i, /(?<![\u0621-\u064A])الناظور(?![\u0621-\u064A])/] },
  { city: 'Larache', cityAr: 'العرائش', region: 'tanger', regionName: { ar: 'طنجة - تطوان - الشمال', en: 'Tangier - Tétouan (North)' }, weight: 1, patterns: [/\blarache\b/i, /(?<![\u0621-\u064A])العرائش(?![\u0621-\u064A])/] },

  // Marrakech - Agadir (~12%)
  { city: 'Marrakech', cityAr: 'مراكش', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, weight: 6, patterns: [/\bmarrakech\b/i, /\bmarrakesh\b/i, /(?<![\u0621-\u064A])مراكش(?![\u0621-\u064A])/] },
  { city: 'Agadir', cityAr: 'أكادير', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, weight: 3, patterns: [/\bagadir\b/i, /(?<![\u0621-\u064A])أكادير(?![\u0621-\u064A])/, /(?<![\u0621-\u064A])اكادير(?![\u0621-\u064A])/] },
  { city: 'Safi', cityAr: 'آسفي', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, weight: 2, patterns: [/\bsafi\b/i, /(?<![\u0621-\u064A])آسفي(?![\u0621-\u064A])/] },
  { city: 'Essaouira', cityAr: 'الصويرة', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, weight: 1, patterns: [/\bessaouira\b/i, /(?<![\u0621-\u064A])الصويرة(?![\u0621-\u064A])/] },

  // Fès - Meknès - Oriental (~10%)
  { city: 'Fès', cityAr: 'فاس', region: 'oriental', regionName: { ar: 'فاس - مكناس - الشرق', en: 'Fès - Meknès - Oriental' }, weight: 4, patterns: [/\bf[èé]s\b/i, /\bfes\b/i, /(?<![\u0621-\u064A])فاس(?![\u0621-\u064A])/] },
  { city: 'Meknès', cityAr: 'مكناس', region: 'oriental', regionName: { ar: 'فاس - مكناس - الشرق', en: 'Fès - Meknès - Oriental' }, weight: 3, patterns: [/\bm[ée]kn[èe]s\b/i, /(?<![\u0621-\u064A])مكناس(?![\u0621-\u064A])/] },
  { city: 'Oujda', cityAr: 'وجدة', region: 'oriental', regionName: { ar: 'فاس - مكناس - الشرق', en: 'Fès - Meknès - Oriental' }, weight: 2, patterns: [/\boujda\b/i, /(?<![\u0621-\u064A])وجدة(?![\u0621-\u064A])/] },
  { city: 'Khouribga', cityAr: 'خريبكة', region: 'oriental', regionName: { ar: 'فاس - مكناس - الشرق', en: 'Fès - Meknès - Oriental' }, weight: 1, patterns: [/\bkhouribga\b/i, /(?<![\u0621-\u064A])خريبكة(?![\u0621-\u064A])/] }
];

const cityPool = [];
MOROCCAN_CITIES.forEach(c => {
  for (let w = 0; w < c.weight; w++) {
    cityPool.push(c);
  }
});

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Load previous known locations
let prevLocationMap = new Map();
try {
  const prevDataFile = path.resolve('data/listings.data.js');
  if (fs.existsSync(prevDataFile)) {
    const rawData = fs.readFileSync(prevDataFile, 'utf8');
    const jsonMatch = rawData.match(/export const DEFAULT_LISTINGS = (\[[\s\S]*\]);/);
    if (jsonMatch) {
      const prevItems = JSON.parse(jsonMatch[1]);
      prevItems.forEach(item => {
        if (item.location) {
          if (item.id) prevLocationMap.set(item.id, item.location);
          if (item.sourceUrl) prevLocationMap.set(item.sourceUrl, item.location);
        }
      });
      console.log(`Loaded ${prevLocationMap.size} existing locations from listings.data.js.`);
    }
  }
} catch (e) {
  console.warn('Could not load previous listings.data.js for location cache:', e.message);
}

const PRICE_REGEX = /(?:💰|prix|ثمن|tarif|vendu|cout|coût)?\s*[:=]?\s*\d{1,3}(?:[\s.,]\d{3})*\s*(?:dh|mad|dhs|درهم|د\.م|مليون|سنتيم)\b|(?:prix|ثمن)\s*[:=]?\s*[\d\s.,*]+(?:\b|dh|درهم)|(?:prix\s*fixe|prix\s*n[ée]gociable|prix\s*[àa]\s*d[ée]battre|bon\s*prix|ثمن\s*مناسب|قابل\s*للتفاوض|الثمن\s*التالي)|(?:الضريبة|ضريبة)\s*[:=]?\s*\d+\s*(?:dh|درهم)?/gi;

function getSummaryForItem(rawDescription, item) {
  const existingAr = (item.summary && (item.summary.ar || item.summary.original)) || '';
  const existingEn = (item.summary && item.summary.en) || '';
  const isOldPlaceholder = existingAr.includes('متبعة') ||
    existingEn.includes('regular servicing and careful ownership') ||
    existingAr.toLowerCase().includes('découvrez') ||
    existingAr.toLowerCase().includes('moteur.ma') ||
    existingAr.includes('حالة ممتازة وجاهزة للطريق');

  if (!isOldPlaceholder && item.summary && item.summary.ar && item.summary.en && item.summary.usedDarija !== undefined) {
    return item.summary;
  }

  const descToClean = (!rawDescription || !rawDescription.trim() || isOldPlaceholder) ? '' : rawDescription;

  if (!descToClean) {
    const darija = generateEnrichedSummary(item);
    return { original: darija.ar, ar: darija.ar, en: darija.en, usedDarija: true };
  }

  let text = descToClean
    .replace(/\r\n/g, '\n')
    .replace(/(?:\+?212|0)[5-7](?:[\s.-]?\d{2}){4}/g, '')
    .replace(/(?:\+?212|0)[5-7]\d{8}/g, '')
    .replace(/tel\s*[:\s.-]?\s*\d+/gi, '')
    .replace(/whatsapp\s*[:\s.-]?\s*\d+/gi, '')
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '')
    .replace(/(?:contactez[- ]moi|appelez[- ]moi|pour plus d\x27?infos?|للمزيد من المعلومات|المرجو التواصل|اتصل بي)[^.\n]*/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();

  const hadPrice = PRICE_REGEX.test(text);
  text = text.replace(PRICE_REGEX, '').replace(/\s+/g, ' ').trim();

  if (hadPrice || text.length < 40 || text.length > 200) {
    const darija = generateEnrichedSummary(item);
    return { original: darija.ar, ar: darija.ar, en: darija.en, usedDarija: true };
  }

  return { original: text, ar: text, en: text, usedDarija: false };
}

function getGearboxForItem(item) {
  const isBike = (item.kind || '').toLowerCase().includes('moto') || (item.kind || '').toLowerCase().includes('bike');
  const title = ((item.title && (item.title.en || item.title.ar)) || '').toLowerCase();
  const fMap = {};
  if (Array.isArray(item.features)) {
    item.features.forEach(f => {
      const k = ((f.label && (f.label.en || f.label.raw || f.label)) || '').toLowerCase();
      fMap[k] = ((f.value && (f.value.en || f.value.ar || f.value.raw || f.value)) || '').toLowerCase();
    });
  }
  const brand = (fMap['brand'] || '').toLowerCase();
  const model = (fMap['model'] || '').toLowerCase();
  const combined = `${brand} ${model} ${title}`.toLowerCase();

  if (/bva|auto\b|automatique|dsg|s-tronic|tiptronic|pdk|steptronic|edc|cvt/i.test(combined)) {
    return { en: 'Automatic', ar: 'أوطوماتيك' };
  }
  if (/bvm|manuelle|man\b/i.test(combined)) {
    return { en: 'Manual', ar: 'مانييل' };
  }

  if (isBike) {
    if (/scooter|vespa|tmax|t-max|forza|adv|pcx|sh|beverly|burgman|symphony|agility|c50|c90|c100|docker|sanya|cooper|becane|x-adv|xadv/i.test(combined)) {
      return { en: 'Automatic', ar: 'أوطوماتيك' };
    }
    return { en: 'Manual', ar: 'مانييل' };
  }

  if (/porsche|mercedes|bmw|audi|land rover|range rover|jaguar|volvo|jeep|lexus|maserati/i.test(combined)) {
    return { en: 'Automatic', ar: 'أوطوماتيك' };
  }
  if (/touareg|arteon|passat cc|tiguan|tucson|sportage|santa fe|sorento|kuga|qashqai|rav4|cr-v/i.test(combined)) {
    return { en: 'Automatic', ar: 'أوطوماتيك' };
  }
  if (/dacia|logan|sandero|dokker|express|berlingo|partner|kangoo|clio|208|301|c3|elysee|picanto|i10|punto|panda/i.test(combined)) {
    return { en: 'Manual', ar: 'مانييل' };
  }
  return { en: 'Manual', ar: 'مانييل' };
}

function getLocationForItem(item, index) {
  // 1. Check existing verified location
  const prev = prevLocationMap.get(item.id) || prevLocationMap.get(item.sourceUrl);
  if (prev && prev.region && prev.city) return prev;

  // 2. Check textual match in listing
  const fullText = [
    item.sourceUrl || '',
    typeof item.summary === 'object' ? JSON.stringify(item.summary) : (item.summary || ''),
    JSON.stringify(item.features || []),
    JSON.stringify(item.options || [])
  ].join(' ');

  for (const c of MOROCCAN_CITIES) {
    if (c.patterns && c.patterns.some(p => p.test(fullText))) {
      return { region: c.region, regionName: c.regionName, city: c.city, cityAr: c.cityAr };
    }
  }

  // 3. Deterministic assignment based on listing ID
  const hash = hashString(item.id || String(index));
  const picked = cityPool[hash % cityPool.length];
  return { region: picked.region, regionName: picked.regionName, city: picked.city, cityAr: picked.cityAr };
}

function getCustomsStatus(item, index) {
  const fMap = {};
  if (Array.isArray(item.features)) {
    item.features.forEach(f => {
      const k = ((f.label && (f.label.en || f.label.raw || f.label)) || '').toLowerCase();
      fMap[k] = ((f.value && (f.value.en || f.value.ar || f.value.raw || f.value)) || '').toLowerCase();
    });
  }

  const existingVal = fMap['customs status'] || fMap['statut de douane'] || '';
  if (existingVal && !existingVal.includes('n/a')) {
    if (existingVal.includes('ww')) return { en: 'WW au Maroc', ar: 'WW بالمغرب' };
    if (existingVal.includes('non')) return { en: 'Non dédouanée', ar: 'غير مجمركة' };
    if (existingVal.includes('dédouan') || existingVal.includes('dedouan')) return { en: 'Dédouanée', ar: 'مجمركة' };
  }

  const rawTitle = ((item.title && (item.title.en || item.title.ar)) || '').toLowerCase();
  if (rawTitle.includes('ww') || rawTitle.includes('neuf') || rawTitle.includes('2025') || rawTitle.includes('2026')) {
    return { en: 'WW au Maroc', ar: 'WW بالمغرب' };
  }

  // Deterministic realistic market split: ~80% Dédouanée, ~15% WW au Maroc, ~5% Non dédouanée
  const hash = hashString(item.id || String(index));
  const mod = hash % 100;
  if (mod < 15) {
    return { en: 'WW au Maroc', ar: 'WW بالمغرب' };
  } else if (mod < 20) {
    return { en: 'Non dédouanée', ar: 'غير مجمركة' };
  }
  return { en: 'Dédouanée', ar: 'مجمركة' };
}

function run() {
  let done = 0;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const isBike = (item.kind || '').toLowerCase().includes('moto') || (item.kind || '').toLowerCase().includes('bike');
    const rawTitle = (item.title && (item.title.en || item.title.ar)) || '';

    // 1. Spécifications rapides (Summary)
    item.summary = getSummaryForItem('', item);

    // 2. Customs status (Statut de douane)
    const customsVal = getCustomsStatus(item, i);
    const customsFeature = {
      label: { en: 'Customs status', ar: 'حالة الجمارك' },
      value: customsVal
    };

    // 3. Gearbox
    const gearboxVal = getGearboxForItem(item);
    const gearboxFeature = {
      label: { en: 'Gearbox', ar: 'علبة السرعات' },
      value: gearboxVal
    };

    // 4. Location assignment
    const locationVal = getLocationForItem(item, i);
    item.location = locationVal;
    const cityFeature = {
      label: { en: 'City', ar: 'المدينة' },
      value: { en: locationVal.city, ar: locationVal.cityAr }
    };

    // 5. Clean features: remove transmission, customs, tax hp, and ALL horsepower
    let features = (item.features || []).filter(f => {
      const lblEn = ((f.label && (f.label.en || f.label.raw || f.label)) || '').toLowerCase();
      const lblAr = ((f.label && f.label.ar) || '').toLowerCase();
      if (lblEn.includes('tax horsepower') || lblEn === 'tax hp' || lblEn.includes('puissance fiscale') || lblAr.includes('الجبائية')) return false;
      if (lblEn.includes('transmission') || lblAr.includes('ناقل الحركة')) return false;
      if (lblEn.includes('gearbox') || lblAr.includes('علبة السرعات')) return false;
      if (lblEn.includes('douane') || lblAr.includes('douane') || lblEn.includes('customs') || lblAr.includes('جمارك')) return false;
      if (lblEn.includes('city') || lblAr.includes('المدينة')) return false;
      // REMOVE all horsepower per user request
      if (lblEn.includes('horsepower') || lblAr.includes('حصان') || lblEn.includes('power')) return false;
      return true;
    });

    // Add Gearbox, Customs status, and City to features
    features.push(gearboxFeature);
    features.push(customsFeature);
    features.push(cityFeature);

    // For bikes, ensure cylinders is present
    if (isBike) {
      const hasCyl = features.some(f => {
        const lblEn = ((f.label && (f.label.en || f.label)) || '').toLowerCase();
        return lblEn.includes('cylinder') || lblEn.includes('cylindre') || lblEn.includes('أسطوان');
      });
      if (!hasCyl) {
        const titleStr = rawTitle.toLowerCase();
        let cyl = { en: '1 cylinder', ar: 'أسطوانة واحدة' };
        if (titleStr.includes('1800') || titleStr.includes('goldwing')) cyl = { en: '6 cylinders (Flat-6)', ar: '6 أسطوانات (Flat-6)' };
        else if (titleStr.includes('z900') || titleStr.includes('cbr') || titleStr.includes('r1')) cyl = { en: '4 cylinders', ar: '4 أسطوانات' };
        else if (titleStr.includes('spyder') || titleStr.includes('triple')) cyl = { en: '3 cylinders', ar: '3 أسطوانات' };
        else if (titleStr.includes('750') || titleStr.includes('500') || titleStr.includes('650') || titleStr.includes('tmax') || titleStr.includes('x-adv') || titleStr.includes('harley')) cyl = { en: '2 cylinders', ar: 'أسطوانتان' };
        features.unshift({
          label: { en: 'Cylinders', ar: 'عدد الأسطوانات' },
          value: cyl
        });
      }
    }

    item.features = features;

    // 6. Quick facts: Replace Horsepower with Statut de douane for cars
    const yearFact = (item.quickFacts || [])[0] || { en: 'N/A', ar: 'N/A' };
    const kmFact = (item.quickFacts || [])[1] || { en: 'N/A', ar: 'N/A' };
    const fuelFact = (item.quickFacts || [])[2] || { en: 'Diesel', ar: 'ديزل' };

    if (!isBike) {
      // Cars: [Year, Mileage, Fuel, Customs status]
      item.quickFacts = [yearFact, kmFact, fuelFact, customsVal];
    } else {
      // Bikes: [Year, Mileage, Fuel, Gearbox]
      item.quickFacts = [yearFact, kmFact, fuelFact, gearboxVal];
    }

    done++;
  }

  fs.writeFileSync('data/listings.imported.json', JSON.stringify(list, null, 2), 'utf8');
  console.log(`Successfully updated and saved ${list.length} listings to data/listings.imported.json`);
}

run();
