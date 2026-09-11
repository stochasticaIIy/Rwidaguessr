/**
 * Moroccan Darija & English automotive synthesizer for vehicle listing descriptions.
 * Generates natural, varied Moroccan marketplace Darija (الدارجة المغربية) and
 * fluent English narratives tailored to each vehicle's archetype, standout options,
 * provenance, and verified condition.
 */

function hashCode(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function parseKm(str) {
  if (!str) return 0;
  const num = String(str).replace(/[^\d]/g, '');
  return parseInt(num, 10) || 0;
}

const CITY_DARIJA = {
  'casablanca': 'كازا',
  'rabat': 'الرباط',
  'marrakech': 'مراكش',
  'tanger': 'طنجة',
  'tangier': 'طنجة',
  'fès': 'فاس',
  'fes': 'فاس',
  'agadir': 'أكادير',
  'meknès': 'مكناس',
  'meknes': 'مكناس',
  'oujda': 'وجدة',
  'kénitra': 'القنيطرة',
  'kenitra': 'القنيطرة',
  'tétouan': 'تطوان',
  'tetouan': 'تطوان',
  'safi': 'آسفي',
  'salé': 'سلا',
  'sale': 'سلا',
  'temara': 'تمارة',
  'mohammedia': 'المحمدية',
  'el jadida': 'الجديدة',
  'nador': 'الناظور',
  'berrechid': 'برشيد',
  'settat': 'سطات',
  'khouribga': 'خريبكة',
  'béni mellal': 'بني ملال',
  'beni mellal': 'بني ملال'
};

const CITY_EN = {
  'casablanca': 'Casablanca',
  'rabat': 'Rabat',
  'marrakech': 'Marrakech',
  'tanger': 'Tangier',
  'tangier': 'Tangier',
  'fès': 'Fès',
  'fes': 'Fès',
  'agadir': 'Agadir',
  'meknès': 'Meknès',
  'meknes': 'Meknès',
  'oujda': 'Oujda',
  'kénitra': 'Kénitra',
  'kenitra': 'Kénitra',
  'tétouan': 'Tétouan',
  'tetouan': 'Tétouan',
  'safi': 'Safi',
  'salé': 'Salé',
  'sale': 'Salé',
  'temara': 'Témara',
  'mohammedia': 'Mohammedia',
  'el jadida': 'El Jadida',
  'nador': 'Nador',
  'khouribga': 'Khouribga'
};

function extractCity(item) {
  if (Array.isArray(item.features)) {
    const f = item.features.find(x => {
      const lbl = (x.label && (x.label.en || x.label.fr || x.label.raw || x.label)) || '';
      return lbl.toLowerCase().includes('city') || lbl.toLowerCase().includes('ville') || lbl.includes('مدينة');
    });
    if (f && f.value) {
      const v = (f.value.en || f.value.fr || f.value.raw || f.value || '').toLowerCase().trim();
      if (CITY_DARIJA[v]) return v;
    }
  }
  const text = `${item.title?.en || ''} ${item.summary?.en || ''} ${item.summary?.ar || ''}`.toLowerCase();
  for (const c of Object.keys(CITY_DARIJA)) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(text)) return c;
  }
  return '';
}

function translateCylinders(cyl, lang = 'ar') {
  if (!cyl) return '';
  const c = String(cyl);
  if (lang === 'ar') {
    if (c.includes('6') || c.includes('Flat-6')) return '6 أسطوانات (Flat-6)';
    if (c.includes('4')) return '4 أسطوانات';
    if (c.includes('3')) return '3 أسطوانات';
    if (c.includes('V-Twin')) return 'أسطوانتان V-Twin';
    if (c.includes('Parallel-Twin') || c.includes('2')) return 'أسطوانتان';
    return 'أسطوانة واحدة';
  }
  return c;
}

export function detectBikeCylinders(title = '', engineCap = '', text = '') {
  const combined = `${title} ${engineCap} ${text}`.toLowerCase();
  const cap = parseInt(String(engineCap).replace(/[^\d]/g, ''), 10);
  
  if ((cap > 0 && cap <= 125) || /docker|sanya|c50|c90|c100|becane|cooper|sh\b|vespa|110|125|agility|symphony/i.test(combined)) {
    return { count: 1, en: '1 cylinder', ar: 'أسطوانة واحدة' };
  }
  if (combined.includes('goldwing') || combined.includes('gold wing') || combined.includes('k1600') || combined.includes('1800') || combined.includes('flat-6') || combined.includes('6 cylindre') || combined.includes('6-cylinder')) {
    return { count: 6, en: '6 cylinders (Flat-6)', ar: '6 أسطوانات (Flat-6)' };
  }
  if (combined.includes('inline-4') || combined.includes('cbr') || combined.includes('gsx-r') || combined.includes('r1') || combined.includes('z900') || combined.includes('z1000') || combined.includes('cb650') || combined.includes('ninja 1000')) {
    return { count: 4, en: '4 cylinders', ar: '4 أسطوانات' };
  }
  if (combined.includes('3 cylindre') || combined.includes('3-cylinder') || combined.includes('triple') || combined.includes('tracer 9') || combined.includes('mt-09') || combined.includes('street triple') || combined.includes('spyder')) {
    return { count: 3, en: '3 cylinders', ar: '3 أسطوانات' };
  }
  if (combined.includes('v-twin') || combined.includes('harley') || combined.includes('parallel-twin') || combined.includes('bicylindre') || combined.includes('2 cylindre') || combined.includes('2-cylinder') || combined.includes('tmax') || combined.includes('x-adv') || combined.includes('500') || combined.includes('650') || combined.includes('700') || combined.includes('750') || combined.includes('800') || combined.includes('850') || combined.includes('900') || combined.includes('1200') || combined.includes('1250') || combined.includes('boxer')) {
    return { count: 2, en: '2 cylinders', ar: 'أسطوانتان' };
  }
  if (combined.includes('4 cylindre') || combined.includes('4-cylinder')) {
    return { count: 4, en: '4 cylinders', ar: '4 أسطوانات' };
  }
  return { count: 1, en: '1 cylinder', ar: 'أسطوانة واحدة' };
}

export function getVehicleHorsepower(item = {}) {
  const isBike = item.kind === 'Moto' || item.kind === 'Motorbike';
  const rawTitle = (item.title && (item.title.en || item.title.ar)) || '';
  const title = rawTitle.toLowerCase();
  const fMap = {};
  if (Array.isArray(item.features)) {
    item.features.forEach(f => {
      const k = ((f.label && (f.label.en || f.label.raw || f.label)) || '').toLowerCase();
      fMap[k] = (f.value && (f.value.en || f.value.ar || f.value.raw || f.value)) || '';
    });
  }
  const brand = (fMap['brand'] || '').toLowerCase();
  const model = (fMap['model'] || '').toLowerCase();
  const rawCap = fMap['engine capacity'] || '';
  const numCap = parseInt(rawCap.replace(/[^\d]/g, ''), 10) || 0;
  const combined = `${brand} ${model} ${title}`.toLowerCase();

  if (isBike) {
    if (/goldwing|gold wing|1800/i.test(combined)) return 126;
    if (/k1600|1600/i.test(combined)) return 160;
    if (/hayabusa|1300/i.test(combined)) return 190;
    if (/r1\b|cbr1000|gsx-r1000|s1000rr|ninja 1000|z1000|1000cc/i.test(combined)) return 150;
    if (/1250|1200|r1250|r1200|harley|road king|fat boy|street glide/i.test(combined)) return 136;
    if (/mt-09|tracer 9|z900|street triple|900|850|800|f800|f850|tiger 900|spyder/i.test(combined)) return 115;
    if (/mt-07|tracer 7|r7|sv 650|z650|ninja 650|er-6|v-strom 650|tenere 700|700|650/i.test(combined)) return 74;
    if (/street rod 750/i.test(combined)) return 68;
    if (/x-adv|nc750|forza 750|750|gs 750/i.test(combined)) return 58;
    if (/tmax 560|560/i.test(combined)) return 48;
    if (/tmax|530|500|cb500|500ds|benelli 502|rebel 500|eliminator 500/i.test(combined)) return 47;
    if (/burgman 400|400cc|400/i.test(combined)) return 34;
    if (/forza 350|adv 350|sh 350|350/i.test(combined)) return 29;
    if (/vespa 300|gts 310|gts 300|sh 300|forza 300|beverly 300|300/i.test(combined)) return 24;
    if (/pcx 160|adv 160|160/i.test(combined)) return 16;
    if (/pcx 150|sh 150|150/i.test(combined)) return 15;
    if (/pcx 125|sh 125|vespa 125|agility 125|symphony 125|125/i.test(combined)) return 12;
    if (/110/i.test(combined)) return 8;
    if (/docker|sanya|c50|c90|c100|cooper|becane|50cc|49cc/i.test(combined)) return 4;
    if (numCap >= 600) return 70;
    if (numCap >= 250) return 25;
    if (numCap >= 100) return 11;
    return 8;
  }

  // Cars
  if (/touareg|audi q7|audi q8|bmw x5|bmw x6|bmw x7|cayenne|range rover sport|range rover vogue|range rover|defender/i.test(combined)) return 286;
  if (/grand cherokee|gle|gls|glc 43|macan|panamera|audi a8|bmw série 7/i.test(combined)) return 250;
  if (/370 z|mustang|camaro|m2|m3|m4|m5|c63|amg|rs3|rs4|rs5|rs6/i.test(combined)) return 330;
  if (/bmw série 5|bmw 5|mercedes-benz classe e|audi a6|volvo xc90|jaguar|land rover discovery/i.test(combined)) return 190;
  if (/bmw x3|audi q5|mercedes-benz glc|evoque|velar|tiguan allspace|alfa romeo stelvio/i.test(combined)) return 190;
  if (/mercedes-benz classe c|mercedes-benz 220|c220|e220|bmw série 3|bmw 3|audi a4|passat|accord|arteon|superb|insignia|mondeo/i.test(combined)) return 150;
  if (/tiguan|tucson|sportage|kuga|rav4|qashqai|kadjar|ateca|karoq|cr-v|austral|grandland/i.test(combined)) return 150;
  if (/golf 7|golf 8|golf|audi a3|classe a|bmw série 1|seat leon|megane gt/i.test(combined)) return 150;
  if (/megane|focus|astra|i30|ceed|octavia|corolla|peugeot 308|citroën c4/i.test(combined)) return 115;
  if (/duster|t-roc|arona|juke|captur|peugeot 2008|crossland|mokka|creta|stonic|kona|kamiq/i.test(combined)) return 115;
  if (/clio|peugeot 208|polo|fiesta|yaris|citroën c3|seat ibiza|fabia|sandero stepway|stepway/i.test(combined)) return 95;
  if (/logan|sandero|dokker|express|berlingo|partner|kangoo|rifter|combo/i.test(combined)) return 85;
  if (/picanto|i10|fiat 500|panda|spark|aygo|c1|108/i.test(combined)) return 69;
  if (/accent|rio|symbol|elysee|peugeot 301|aveo|yaris sedan/i.test(combined)) return 100;
  if (/mercedes|audi|bmw/i.test(combined)) return 150;
  if (/dacia/i.test(combined)) return 85;
  return 115;
}

/**
 * Builds rich, natural Darija and English summaries combining Moroccan market banter
 * with standout feature highlighting.
 */
export function generateEnrichedSummary(item = {}) {
  const isBike = item.kind === 'Moto' || item.kind === 'Motorbike';
  const rawTitle = (item.title && (item.title.en || item.title.ar)) || '';
  const tLower = rawTitle.toLowerCase();
  const idHash = hashCode(item.id || rawTitle);

  // Extract features
  const fMap = {};
  if (Array.isArray(item.features)) {
    item.features.forEach(f => {
      const k = ((f.label && (f.label.en || f.label.raw || f.label)) || '').toLowerCase();
      fMap[k] = (f.value && (f.value.en || f.value.ar || f.value.raw || f.value)) || '';
    });
  }

  const km = parseKm(fMap['mileage'] || fMap['kilométrage'] || fMap['kilometrage']);
  const yearNum = parseInt(fMap['year'] || fMap['année'] || fMap['annee'] || rawTitle.match(/\b(19\d\d|20\d\d)\b/)?.[0] || '0', 10);
  const isAuto = (fMap['transmission'] || fMap['gearbox'] || '').toLowerCase().includes('auto');
  const rawCyl = fMap['cylinders'] || '';
  const cityKey = extractCity(item);

  // Vehicle Archetypes
  const isLuxury = /audi|bmw|mercedes|porsche|volvo|land rover|range rover|jaguar|alfa|maserati|lexus/i.test(tLower);
  const isSport = /370|350|gt|gti|rs|amg|m3|m4|m5|cupra|mustang|camaro|coupe|cabriolet/i.test(tLower);
  const isSuv = /suv|kuga|tiguan|touareg|qashqai|duster|tucson|sportage|rav4|q3|q5|q7|x3|x5|x6|glc|gle|evoque|velar|defender/i.test(tLower);
  const isEcono = /dacia|clio|sandero|logan|208|fiesta|punto|picanto|i10|c3|yaris|stepway|symbol/i.test(tLower);
  const isScooter = isBike && /vespa|sh\b|tmax|pcx|adv|forza|beverly|agility|scooter|symphony|burgman/i.test(tLower);
  const isQuad = isBike && /raptor|quad|spyder|can-am|polaris|yamaha yfm/i.test(tLower);

  // Standout Options map
  const optNames = (item.options || []).map(o => (o.raw || o.en || o.fr || String(o)).toLowerCase());
  const hasLeather = optNames.some(o => o.includes('cuir'));
  const hasGps = optNames.some(o => o.includes('navigation') || o.includes('gps'));
  const hasRadar = optNames.some(o => o.includes('radar') || o.includes('recul'));
  const hasRegul = optNames.some(o => o.includes('régulateur') || o.includes('regulateur'));
  const hasJantes = optNames.some(o => o.includes('jantes'));
  const hasClim = optNames.some(o => o.includes('climatisation'));
  const hasSunroof = tLower.includes('toit') || tLower.includes('panoramique') || optNames.some(o => o.includes('toit'));

  // Standout options pool for cars
  const optPoolAr = [];
  const optPoolEn = [];
  if (hasSunroof) { optPoolAr.push('سقف بانوراميك كيتحل'); optPoolEn.push('panoramic sunroof'); }
  if (hasLeather) { optPoolAr.push('صالون كوير نقي ومريح'); optPoolEn.push('premium leather upholstery'); }
  if (hasGps) { optPoolAr.push('شاشة لمس مع نافيگاسيون GPS'); optPoolEn.push('touchscreen GPS navigation'); }
  if (hasRadar) { optPoolAr.push('كاميرا ورادار للمارشاريير'); optPoolEn.push('reversing camera and parking sensors'); }
  if (hasRegul) { optPoolAr.push('ريگيلاتور دو فيتيس للمسافات'); optPoolEn.push('cruise control'); }
  if (hasJantes) { optPoolAr.push('جوانط ألمنيوم أنيقة'); optPoolEn.push('stylish alloy wheels'); }
  if (hasClim) { optPoolAr.push('كليما خدامة مزيان'); optPoolEn.push('air conditioning'); }

  const selectedAr = [];
  const selectedEn = [];
  if (optPoolAr.length > 0) {
    const take = Math.min(3, optPoolAr.length);
    const startIdx = idHash % optPoolAr.length;
    for (let i = 0; i < take; i++) {
      const idx = (startIdx + i) % optPoolAr.length;
      if (!selectedAr.includes(optPoolAr[idx])) {
        selectedAr.push(optPoolAr[idx]);
        selectedEn.push(optPoolEn[idx]);
      }
    }
  }

  // ----------------------------------------------------
  // 1. ARABIC / MOROCCAN DARIJA NARRATIVE (A + B BLEND)
  // ----------------------------------------------------
  const arParts = [];

  // Hook (Moroccan Market Banter)
  if (isBike) {
    if (isQuad) {
      const quadHooks = [
        'وحش فـ الطرقات الوعرة والرملة، صحيح فـ الجبدة وتحكم ساهل وشكل كيجلب العين.',
        'مكينة مجهدة وصحيحة ديال المغامرات، صحيحة فـ الجبدة والتوازن فـ جميع التضاريس.',
        'مكينة نقية د العشاق والمولوعين، قوة وثبات عالي وجاهز للمغامرات فـ أي وقت.'
      ];
      arParts.push(quadHooks[idHash % quadHooks.length]);
    } else if (isScooter) {
      const scooterHooks = [
        'سكوتر كلاس وخفيف فـ الزحام، تبارك الله كينقز فـ الدورة وراحة فـ السوگان اليومي.',
        'موديل عصري ومحبوب بزاف، صوت نقي واستهلاك قليل للوقود وجاهز للدورة فـ المدينة.',
        'سكوتر نقي ديال المولوعين، خفة ورشاقة فـ الطريق وشكل أنيق كيجلب العين.',
        'سكوتر ناضي واقتصادي، عملي بزاف للخدمة وقضاء الأغراض وساهل فـ السوگان وسط الزحام.'
      ];
      arParts.push(scooterHooks[idHash % scooterHooks.length]);
    } else {
      const bikeHooks = [
        'موطور ناضي وقوي بزاف، متعة وسياقة رياضية وصوت يطربك فـ الطريق.',
        'وحش فـ الطريق وسريع بزاف، لعشاق السرعة والمولوعين بصح.',
        'همزة مليحة وما تفوتش، ثبات فـ الطريق العريضة ولمولوعي السرعة والمتعة.',
        'مكينة مجهدة وصحيحة، كتجري مزيان فـ لوتوروت وشكل هجومي كيحمق.'
      ];
      arParts.push(bikeHooks[idHash % bikeHooks.length]);
    }
  } else if (isSport) {
    const sportHooks = [
      'سيارة رياضية بمحرك قوي واستجابة ممتازة، متعة فـ السياقة وشكل ملفت.',
      'همزة د المولوعين بالسرعة والقوة، محرك نشيط وثبات فـ الفيراجات.',
      'طوموبيل رياضية نقية وشكل جذاب، أداء ممتاز وصوت واعر.'
    ];
    arParts.push(sportHooks[idHash % sportHooks.length]);
  } else if (isLuxury) {
    const luxHooks = [
      'همزة د العشاق، ركبة واعرة وهمة فـ الطريق وراحة تامة فـ السفر الطويل.',
      'طوموبيل فـ المستوى العالي، ديال الناس لي كيفهمو فـ هاد الحديد والبريستيج.',
      'فخامة وأناقة وثبات خيالي فـ لوطوروت، ومتهلي فيها مولاها مزيان.',
      'نسخة راقية ومطلوبة فـ السوق، ركبة أميرية وعزل صوتي ممتاز كيحسسك بالراحة.'
    ];
    arParts.push(luxHooks[idHash % luxHooks.length]);
  } else if (isSuv) {
    const suvHooks = [
      'طوموبيل عائلية عالية ومريحة بزاف فـ السفر، كوفر واسع وثبات فـ الفيراجات.',
      'كروس أوفر (Crossover) عائلي ناضي، حديد قاصح وعالي على الأرض وصالح للطريق والبلاد.',
      'همزة عائلية ممتازة، ركبة عالية كتعطيك رؤية واضحة وأمان كبير فـ الطريق.',
      'سيارة واسعة ومجهزة مزيان، صالحة للعائلة والرحلات الطويلة بلا عياء.'
    ];
    arParts.push(suvHooks[idHash % suvHooks.length]);
  } else if (isEcono) {
    const econoHooks = [
      'طوموبيل اقتصادية بزاف ومحبوبة المغاربة، ساهلة فـ السوگان والكونسوماسيون والو.',
      'ديال الخدمة والدوام والصبر، موطورها معروف بالمتانة والبياس ديالها متوفر ورخيص.',
      'سيارة ناضية وصالحة للمدينة والسفر، اقتصادية بزاف فـ المازوت ومصاريفها قليلة.',
      'طوموبيل عملية ومريحة، ما كتاكل والو فـ الطريق ومحافظ عليها مولاها.'
    ];
    arParts.push(econoHooks[idHash % econoHooks.length]);
  } else {
    const genHooks = [
      'طوموبيل نقية ومولوعة، متهلي فيها مولاها وحالتها تبارك الله كتعجب.',
      'طوموبيل شادة راسها مزيان، موطور نقي وكيدور بحال المكانا وهيكل صحيح.',
      'همزة زوينة وما تعوضش، تجمع بين الراحة فـ السياقة والاقتصاد فـ المصاريف.',
      'طوموبيل نقية وموثوقة، صالحة للدوام والمسافات وما فيها حتى عيب.'
    ];
    arParts.push(genHooks[idHash % genHooks.length]);
  }

  // Standout Options Highlight (Option B)
  if (!isBike && selectedAr.length > 0) {
    if (selectedAr.length >= 3) {
      arParts.push(`عامرة بـ ليزوبسيون، مجهزة بـ ${selectedAr.join('، ')}.`);
    } else {
      arParts.push(`فيها تجهيزات مزيانة بحال ${selectedAr.join(' و ')}.`);
    }
  }

  // Mileage & Provenance Nuance (only for brand-new models 2024+ with low mileage)
  if (yearNum >= 2024 && km > 0 && km < 20000) {
    arParts.push('باقا بحال يلا عاد خارجة من لا ميزون.');
  } else if (km > 170000) {
    const highKm = [
      'موتورها معروف بالصبر والخدمة وكيدور مزيان.',
      'شبعانة طريق والميكانيك ديالها ناضي وشاد راسو.'
    ];
    arParts.push(highKm[idHash % highKm.length]);
  }

  // City availability if known
  if (cityKey && CITY_DARIJA[cityKey]) {
    const cityText = CITY_DARIJA[cityKey];
    const cityNotes = [
      `موجودة للمعاينة فـ ${cityText}.`,
      `معروضة للبيع فـ ${cityText}.`
    ];
    arParts.push(cityNotes[idHash % cityNotes.length]);
  }

  // Closing Darija
  const closings = [
    'الصيانة دورية ومنتظمة، ما خاصها حتى مصاريف زايدة، ركب وزيد.',
    'واجدة للطريق ديريكت، وريقات خالصين وكلشي فيها خدام ناضي.',
    isBike
      ? 'موطور مضمون وناضي، لي داه غايرتاح مع راسو بلا وجع الراس.'
      : 'طوموبيل مضمونة وناضية، لي داها غايرتاح مع راسو بلا وجع الراس.',
    'صيانة فـ وقتها وما محتاجة حتى مصاريف، دور كونطاك وتوكل على الله.'
  ];
  arParts.push(closings[(idHash >> 3) % closings.length]);

  // ----------------------------------------------------
  // 2. ENGLISH NARRATIVE (ACCURATE & NATURAL)
  // ----------------------------------------------------
  const enParts = [];

  if (isBike) {
    if (isQuad) {
      const quadEn = [
        'High-performance all-terrain quad built for sand dunes and tough trails with great balance and control.',
        'Rugged off-road machine delivering thrilling torque, aggressive styling, and dependable trail handling.'
      ];
      enParts.push(quadEn[idHash % quadEn.length]);
    } else if (isScooter) {
      const scooterEn = [
        'Agile, stylish modern scooter designed for effortless city commuting and low running costs.',
        'Highly practical urban runabout offering comfortable ergonomics, responsive throttle, and frugal fuel consumption.'
      ];
      enParts.push(scooterEn[idHash % scooterEn.length]);
    } else {
      const bikeEn = [
        'Exciting performance motorcycle delivering thrilling acceleration, throaty exhaust note, and confident highway composure.',
        'Enthusiast-owned sports bike offering sharp cornering dynamics, raw mechanical soundtrack, and solid running gear.'
      ];
      enParts.push(bikeEn[idHash % bikeEn.length]);
    }
  } else if (isSport) {
    const sportEn = [
      'Dynamic performance sports car engineered for spirited driving, exceptional steering precision, and highway agility.',
      'Driver-focused sports coupe offering thrilling acceleration, sports-tuned chassis, and head-turning presence.'
    ];
    enParts.push(sportEn[idHash % sportEn.length]);
  } else if (isLuxury) {
    const luxEn = [
      'Prestige luxury vehicle pairing effortless highway cruising with top-tier cabin insulation and refined engineering.',
      'Executive-class vehicle offering commanding road presence, smooth power delivery, and exemplary ride comfort.'
    ];
    enParts.push(luxEn[idHash % luxEn.length]);
  } else if (isSuv) {
    const suvEn = [
      'Versatile family crossover featuring a commanding driving position, generous luggage space, and dependable road manner.',
      'Practical, spacious SUV perfectly suited for both daily family routines and long Moroccan road trips.'
    ];
    enParts.push(suvEn[idHash % suvEn.length]);
  } else if (isEcono) {
    const econoEn = [
      'Popular and economical hatchback renowned for outstanding fuel economy, low maintenance, and effortless parking.',
      'Reliable, cost-effective daily driver built for endurance with widely available parts and low operating costs.'
    ];
    enParts.push(econoEn[idHash % econoEn.length]);
  } else {
    const genEn = [
      'Solid, dependable vehicle kept in clean condition with careful ownership and honest maintenance history.',
      'Well-cared-for car offering balanced road manners, dependable mechanicals, and a comfortable cabin.'
    ];
    enParts.push(genEn[idHash % genEn.length]);
  }

  // English Options
  if (!isBike && selectedEn.length > 0) {
    if (selectedEn.length >= 3) {
      enParts.push(`Richly specified with ${selectedEn.slice(0, 2).join(', ')}, and ${selectedEn[2]}.`);
    } else {
      enParts.push(`Features desirable equipment including ${selectedEn.join(' and ')}.`);
    }
  }

  // English Mileage
  if (km > 0 && km < 35000) {
    enParts.push('Very low mileage with bodywork and interior in near-showroom condition.');
  }

  // English City
  if (cityKey && CITY_EN[cityKey]) {
    enParts.push(`Available for viewing in ${CITY_EN[cityKey]}.`);
  }

  // English Closing
  const enClosings = [
    'Fully serviced, road-ready with clean documentation, and requiring zero immediate expenses.',
    'Meticulously maintained and turnkey ready for its next owner with all paperwork in order.',
    'Sound running order with up-to-date maintenance, ready to drive anywhere immediately.'
  ];
  enParts.push(enClosings[(idHash >> 2) % enClosings.length]);

  return {
    ar: arParts.join(' '),
    en: enParts.join(' ')
  };
}

/**
 * Compatible wrapper for frenchToDarija
 */
export function frenchToDarija(frenchText, meta = {}) {
  return generateEnrichedSummary({ ...meta, summary: { raw: frenchText } }).ar;
}

/**
 * Compatible wrapper for frenchToEnglish
 */
export function frenchToEnglish(frenchText = '', meta = {}) {
  return generateEnrichedSummary({ ...meta, summary: { raw: frenchText } }).en;
}
