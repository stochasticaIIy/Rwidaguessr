/**
 * Moroccan automotive helper utilities for vehicle cylinder and horsepower detection.
 */

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

export function generateEnrichedSummary(item = {}) {
  const isBike = (item.kind || '').toLowerCase().includes('moto') || (item.kind || '').toLowerCase().includes('bike');
  const title = (item.title && (item.title.en || item.title.ar)) || (isBike ? 'دراجة نارية' : 'سيارة');
  
  const fMap = {};
  if (Array.isArray(item.features)) {
    item.features.forEach(f => {
      const k = ((f.label && (f.label.en || f.label.raw || f.label)) || '').toLowerCase();
      fMap[k] = (f.value && (f.value.en || f.value.ar || f.value.raw || f.value)) || '';
    });
  }
  const year = fMap['year'] || (item.quickFacts && item.quickFacts[0] && (item.quickFacts[0].en || item.quickFacts[0])) || '';
  const fuel = (fMap['fuel'] || (item.quickFacts && item.quickFacts[2] && (item.quickFacts[2].en || item.quickFacts[2])) || '').toLowerCase();
  const fuelAr = fuel.includes('diesel') || fuel.includes('مازوط') ? 'مازوط' : (fuel.includes('essence') || fuel.includes('petrol') || fuel.includes('بنزين') ? 'ليسانس' : (fuel.includes('hybride') || fuel.includes('hybrid') ? 'هايبريد' : ''));
  const fuelEn = fuel.includes('diesel') ? 'Diesel' : (fuel.includes('essence') || fuel.includes('petrol') ? 'Petrol' : (fuel.includes('hybrid') ? 'Hybrid' : ''));

  if (isBike) {
    const ar = `${title} نقية بزاف ومحافظ عليها مزيان${year ? ' موديل ' + year : ''}، واجدة للطريق بدون أي مصاريف إضافية.`;
    const en = `Very clean ${title}${year ? ' (' + year + ')' : ''}, well maintained and in great condition, ready to ride with no extra costs.`;
    return { ar, en };
  }

  const ar = `${title} نقية بزاف${fuelAr ? ' ' + fuelAr : ''}${year ? ' موديل ' + year : ''}، باقية في حالة ممتازة ومحافظ عليها مزيان، واجدة للطريق.`;
  const en = `Very clean ${title}${fuelEn ? ' (' + fuelEn + ')' : ''}${year ? ' ' + year : ''}, well maintained and in great condition, ready to drive.`;
  return { ar, en };
}

