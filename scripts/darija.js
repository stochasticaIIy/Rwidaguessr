/**
 * Moroccan Darija translator and synthesizer for vehicle listing descriptions.
 * Translates French automotive listing text into natural Moroccan Darija (الدارجة المغربية).
 */

const DARIJA_PHRASE_MAP = [
  // Condition & accident status
  { pattern: /\b(?:jamais\s+accident[ée]e?|non\s+accident[ée]e?|sans\s+accident|pas\s+d['’]accident)\b/gi, darija: 'عمرها دارت كسيدة' },
  { pattern: /\b(?:peinture\s+d['’]origine|peinture\s+originale)\b/gi, darija: 'صباغة لاميزون الأصلية' },
  { pattern: /\b(?:en\s+tr[èe]s\s+bon\s+[ée]tat|tr[èe]s\s+bon\s+[ée]tat|excellent\s+[ée]tat|[ée]tat\s+irr[ée]prochable|[ée]tat\s+neuf)\b/gi, darija: 'حالة ممتازة ونقية بزاف' },
  { pattern: /\b(?:bon\s+[ée]tat|propre|tr[èe]s\s+propre)\b/gi, darija: 'نقية وبحالة مزيانة' },
  
  // Ownership & maintenance
  { pattern: /\b(?:premi[èe]re\s+main|1[èe]re\s+main|1ere\s+main)\b/gi, darija: 'بروميار مان' },
  { pattern: /\b(?:deuxi[èe]me\s+main|2[èe]me\s+main|2eme\s+main)\b/gi, darija: 'دوزيام مان' },
  { pattern: /\b(?:carnet\s+d['’]entretien(?:\s+[àa]\s+jour)?|entretien\s+(?:maison|[àa]\s+la\s+maison))\b/gi, darija: 'صيانة دورية ومنتظمة' },
  { pattern: /\b(?:aucun\s+frais\s+[àa]\s+pr[ée]voir|rien\s+[àa]\s+pr[ée]voir)\b/gi, darija: 'ما كاين حتى مصاريف، ركب وسير' },
  { pattern: /\b(?:vidange\s+(?:faite|r[ée]cente|effectu[ée]e)|entretien\s+r[ée]cent)\b/gi, darija: 'لافيدونج عاد تدارت جديدة' },
  { pattern: /\b(?:faible\s+kilom[ée]trage|peu\s+roul[ée]e?)\b/gi, darija: 'ضاربة كيلومتراج قليل' },
  
  // Options & Equipment
  { pattern: /\b(?:toutes?\s+(?:les\s+)?options?|full\s+options?|toute\s+option)\b/gi, darija: 'عامرة بجميع ليزوبسيون « toutes options »' },
  { pattern: /\b(?:faible\s+consommation|[ée]conomique\s+en\s+carburant|tr[èe]s\s+[ée]conomique)\b/gi, darija: 'اقتصادية بزاف فالكونسوماسيون' },
  { pattern: /\b(?:pneus?\s+neufs?|pneus?\s+r[ée]cents?)\b/gi, darija: 'بنوات جداد' },
  { pattern: /\b(?:salon\s+cuir|si[èe]ges?\s+cuir)\b/gi, darija: 'صالون د الجلد نقي' },
  { pattern: /\b(?:salon\s+tr[èe]s\s+propre|int[ée]rieur\s+tr[èe]s\s+propre|int[ée]rieur\s+comme\s+neuf)\b/gi, darija: 'صالون نقي بزاف بحال جديد' },
  { pattern: /\b(?:toit\s+panoramique|toit\s+ouvrant)\b/gi, darija: 'طوا بانوراميك « toit panoramique »' },
  { pattern: /\b(?:climatisation\s+marche|clim\s+marche|climatisation\s+auto)\b/gi, darija: 'كليما خدامة مزيان' },
  { pattern: /\b(?:bo[îi]te\s+automatique|bva)\b/gi, darija: 'بواط أوطوماتيك' },
  { pattern: /\b(?:bo[îi]te\s+manuelle)\b/gi, darija: 'بواط مانييل' },
  
  // Registration & paperwork
  { pattern: /\b(?:d[ée]douan[ée]e?(?:\s+en\s+\d{4})?)\b/gi, darija: 'ديوانة ووريقاتها ناضيين' },
  { pattern: /\b(?:vignette\s+pay[ée]e|vignette\s+\d{4}\s+pay[ée]e)\b/gi, darija: 'لافينييت مخلصة' },
  { pattern: /\b(?:visite\s+technique\s+[àa]\s+jour|visite\s+[àa]\s+jour)\b/gi, darija: 'لافيزيت تكنيك باقا صالحة' },

  // Viewing & Negotiation
  { pattern: /\b(?:visible\s+[àa]|disponible\s+[àa])\s+([a-zA-ZÀ-ÿ\s-]+?)(?:\.|\,|$|\n)/gi, darija: 'موجودة للمعاينة فـ $1' },
  { pattern: /\b(?:sur\s+rendez[- ]vous)\b/gi, darija: 'بالرونديفو مسبقًا' },
  { pattern: /\b(?:prix\s+l[ée]g[èe]rement\s+n[ée]gociable|l[ée]g[èe]rement\s+n[ée]gociable)\b/gi, darija: 'الثمن فيه شوية د المفاهمة' },
  { pattern: /\b(?:prix\s+n[ée]gociable|n[ée]gociable)\b/gi, darija: 'الثمن قابل للمفاهمة' },
  { pattern: /\b(?:curieux\s+s['’]abstenir|interm[ée]diaires?\s+s['’]abstenir|smasriya\s+s['’]abstenir)\b/gi, darija: 'السماسرية بلاش، غير مع الشاري المعقول' },
  { pattern: /\b(?:pour\s+plus\s+d['’]infos?|pour\s+plus\s+d['’]informations?)\b/gi, darija: 'للمزيد من المعلومات' },
  { pattern: /\b(?:voiture\s+de\s+femme)\b/gi, darija: 'طوموبيل د سيدة مسوڤاردية' },
  { pattern: /\b(?:pr[êe]te\s+[àa]\s+prendre\s+la\s+route|[àa]\s+ne\s+pas\s+rater)\b/gi, darija: 'واجدة للطريق وما تفرطش فيها' }
];

const CITY_DARIJA = {
  'casablanca': 'كازا',
  'rabat': 'الرباط',
  'marrakech': 'مراكش',
  'tanger': 'طنجة',
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
  'settat': 'سطات'
};

/**
 * Translates a French vehicle description into Moroccan Darija.
 * @param {string} frenchText - Sanitized French text.
 * @param {object} meta - Vehicle metadata { kind, title, year, mileage, fuel, transmission, city }
 * @returns {string} Description in Moroccan Darija.
 */
export function frenchToDarija(frenchText, meta = {}) {
  const isMoto = meta.kind === 'Moto' || meta.kind === 'Motorbike';
  const vehicleWord = isMoto ? 'موطور' : 'طوموبيل';
  
  if (!frenchText || frenchText.trim().length === 0) {
    return generateDefaultDarija(meta);
  }

  // Check if text already contains Arabic characters
  if (/[\u0600-\u06FF]/.test(frenchText)) {
    return frenchText.trim();
  }

  // Extract matched Darija bullet points from French description
  const matchedPoints = [];
  for (const { pattern, darija } of DARIJA_PHRASE_MAP) {
    if (pattern.test(frenchText)) {
      // Handle dynamic capture groups if any
      const replaced = frenchText.match(pattern);
      if (replaced) {
        let textResult = darija;
        if (darija.includes('$1')) {
          const match = pattern.exec(frenchText);
          if (match && match[1]) {
            const rawCity = match[1].trim().toLowerCase();
            const darijaCity = CITY_DARIJA[rawCity] || match[1].trim();
            textResult = textResult.replace('$1', darijaCity);
          }
        }
        if (!matchedPoints.includes(textResult)) {
          matchedPoints.push(textResult);
        }
      }
    }
  }

  // Build fluent Darija summary
  const parts = [];

  // Opening
  if (meta.year || meta.fuel || meta.transmission) {
    const specs = [];
    if (meta.year) specs.push(`موديل \u2066${meta.year}\u2069`);
    if (meta.mileage) specs.push(`ضاربة \u2066${meta.mileage}\u2069`);
    if (meta.fuel) {
      const f = meta.fuel.toLowerCase();
      if (f.includes('diesel')) specs.push('مازوت');
      else if (f.includes('essence')) specs.push('ليصانص');
      else if (f.includes('hybride')) specs.push('هايبريد');
      else if (f.includes('électrique')) specs.push('إلكتريك');
    }
    if (meta.transmission) {
      const t = meta.transmission.toLowerCase();
      if (t.includes('auto')) specs.push('أوطوماتيك');
      else if (t.includes('manuel')) specs.push('مانييل');
    }
    parts.push(`${vehicleWord} ${specs.join('، ')}.`);
  } else {
    parts.push(`${vehicleWord} نقية وبحالة مزيانة.`);
  }

  // Add extracted highlights
  if (matchedPoints.length > 0) {
    parts.push(matchedPoints.join('، ') + '.');
  } else {
    parts.push('حالة ممتازة وجاهزة للطريق، الصيانة دورية ومنتظمة وما خاصها حتى مصاريف زايدة.');
  }

  // City availability if known
  if (meta.city) {
    const rawCity = meta.city.trim().toLowerCase();
    const city = CITY_DARIJA[rawCity] || meta.city;
    if (!parts.some(p => p.includes(city))) {
      parts.push(`موجودة فـ ${city}.`);
    }
  }

  return parts.join(' ');
}

function generateDefaultDarija(meta = {}) {
  const isMoto = meta.kind === 'Moto' || meta.kind === 'Motorbike';
  const vehicleWord = isMoto ? 'موطور' : 'طوموبيل';
  const parts = [`${vehicleWord} نقية وبحالة ممتازة.`];
  if (meta.year) parts.push(`موديل ${meta.year}`);
  if (meta.mileage) parts.push(`ضاربة ${meta.mileage}`);
  parts.push('جاهزة للطريق والصيانة دورية ومنتظمة وما خاصها حتى مصاريف.');
  if (meta.city) {
    const rawCity = meta.city.trim().toLowerCase();
    const city = CITY_DARIJA[rawCity] || meta.city;
    parts.push(`موجودة فـ ${city}.`);
  }
  return parts.join(' ');
}

export function detectBikeCylinders(title = '', engineCap = '', text = '') {
  const combined = `${title} ${engineCap} ${text}`.toLowerCase();
  if (combined.includes('goldwing') || combined.includes('gold wing') || combined.includes('k1600') || combined.includes('1800') || combined.includes('flat-6') || combined.includes('6 cylindre') || combined.includes('6-cylinder')) {
    return { count: 6, en: '6 cylinders (Flat-6)', ar: '6 أسطوانات (Flat-6)' };
  }
  if (combined.includes('4 cylindre') || combined.includes('4-cylinder') || combined.includes('inline-4') || combined.includes('cbr') || combined.includes('gsx-r') || combined.includes('r1') || combined.includes('z900') || combined.includes('z1000') || combined.includes('cb650') || combined.includes('ninja 1000')) {
    return { count: 4, en: '4 cylinders', ar: '4 أسطوانات' };
  }
  if (combined.includes('3 cylindre') || combined.includes('3-cylinder') || combined.includes('triple') || combined.includes('tracer 9') || combined.includes('mt-09') || combined.includes('street triple') || combined.includes('spyder')) {
    return { count: 3, en: '3 cylinders', ar: '3 أسطوانات' };
  }
  if (combined.includes('v-twin') || combined.includes('harley') || combined.includes('parallel-twin') || combined.includes('bicylindre') || combined.includes('2 cylindre') || combined.includes('2-cylinder') || combined.includes('tmax') || combined.includes('x-adv') || combined.includes('500') || combined.includes('650') || combined.includes('700') || combined.includes('750') || combined.includes('800') || combined.includes('850') || combined.includes('900') || combined.includes('1200') || combined.includes('1250') || combined.includes('boxer')) {
    return { count: 2, en: '2 cylinders', ar: 'أسطوانتان' };
  }
  return { count: 1, en: '1 cylinder', ar: 'أسطوانة واحدة' };
}

export function frenchToEnglish(frenchText = '', meta = {}) {
  const isMoto = meta.kind === 'Moto' || meta.kind === 'Motorbike';
  const name = meta.title || (isMoto ? 'Motorcycle' : 'Vehicle');
  const details = [];
  if (meta.year) details.push(meta.year);
  if (meta.mileage && !details.some(d => d.includes(meta.mileage))) details.push(`with ${meta.mileage}`);
  if (meta.fuel && meta.fuel !== 'N/A') details.push(meta.fuel);
  if (meta.transmission && meta.transmission !== 'N/A') details.push(`${meta.transmission.toLowerCase()} transmission`);

  let summary = details.length ? `${details.join(', ')}. ` : '';
  summary += `${name} in very good condition with regular servicing and careful ownership.`;
  if (meta.city) {
    summary += ` Road-ready and available for viewing in ${meta.city}.`;
  } else {
    summary += ' Road-ready and in solid running order.';
  }
  return summary;
}

