import fs from 'fs';
import * as cheerio from 'cheerio';
import { localizeTerm } from './dictionary.js';

const list = JSON.parse(fs.readFileSync('data/listings.imported.json', 'utf8'));
console.log(`Starting update of ${list.length} listings...`);

function cleanAndSummarizeSpecRapides(rawDescription, rawTitle) {
  if (!rawDescription || !rawDescription.trim()) {
    return `${rawTitle} en bon état général, disponible pour visite.`;
  }
  let text = rawDescription
    .replace(/\r\n/g, '\n')
    // Remove prices like 140,000 DH or 140 000 درهم or Prix : 150000
    .replace(/(?:💰|prix|ثمن|tarif)?\s*[:=]?\s*\d{1,3}(?:[\s.,]\d{3})*\s*(?:dh|mad|dhs|درهم|مليون|سنتيم)\b/gi, '')
    .replace(/(?:prix|ثمن)\s*[:=]?\s*[\d\s.,]+(?:\b|dh|درهم)/gi, '')
    .replace(/(?:prix\s*fixe|prix\s*n[ée]gociable|prix\s*[àa]\s*d[ée]battre|ثمن\s*مناسب|قابل\s*للتفاوض)/gi, '')
    // Remove phone numbers and emails
    .replace(/(?:\+?212|0)[5-7](?:[\s.-]?\d{2}){4}/g, '')
    .replace(/(?:\+?212|0)[5-7]\d{8}/g, '')
    .replace(/tel\s*[:\s.-]?\s*\d+/gi, '')
    .replace(/whatsapp\s*[:\s.-]?\s*\d+/gi, '')
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '')
    // Remove contact phrases
    .replace(/(?:contactez[- ]moi|appelez[- ]moi|pour plus d\x27?infos?|للمزيد من المعلومات|المرجو التواصل|اتصل بي)[^.\n]*/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();

  // If section is very long (> 220 chars), summarize it cleanly in its original language
  if (text.length > 220) {
    const rawLines = text.split(/\n|(?<=[.!?])\s+/).map(l => l.trim()).filter(Boolean);
    const informativeLines = rawLines.filter(l => {
      const lower = l.toLowerCase();
      if (/^[-•*]?\s*(marque|modèle|modele|carburant|boite|boîte|puissance|année|annee|kilométrage|kilometrage)/i.test(lower)) return false;
      if (lower.includes('المسافة') || lower.includes('الوقود') || lower.includes('علبة السرعات') || lower.includes('سنة الصنع')) return false;
      return true;
    });

    if (informativeLines.length > 0) {
      text = informativeLines.slice(0, 3).join('. ');
      if (!text.endsWith('.')) text += '.';
    } else {
      text = rawLines.slice(0, 2).join('. ') + '.';
    }
    if (text.length > 240) {
      text = text.slice(0, 230).replace(/[,;:\s]+[^\s.]*$/, '') + '…';
    }
  }

  return text || `${rawTitle} en bon état général, disponible pour visite.`;
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

async function fetchDetails(item) {
  try {
    const res = await fetch(item.sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000)
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    let specRapides = '';
    $('h3, h4').each((_, el) => {
      if ($(el).text().trim().includes('Spécifications rapides')) {
        specRapides = $(el).next().text().trim();
      }
    });
    if (!specRapides) {
      specRapides = $('.detail-description, .description, .text_detail, .detail-text').first().text().trim();
    }

    let douaneText = '';
    $('table td, table th').each((_, el) => {
      const t = $(el).text().trim().toLowerCase();
      if (t.includes('douane') || t.includes('origine')) {
        const val = $(el).next().text().trim();
        if (val && val !== 'N/A') douaneText = val;
      }
    });

    return { specRapides, douaneText };
  } catch (err) {
    return { specRapides: '', douaneText: '' };
  }
}

async function run() {
  const concurrency = 25;
  let done = 0;

  for (let i = 0; i < list.length; i += concurrency) {
    const batch = list.slice(i, i + concurrency);
    const details = await Promise.all(batch.map(item => fetchDetails(item)));

    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const { specRapides, douaneText } = details[j];
      const isBike = (item.kind || '').toLowerCase().includes('moto') || (item.kind || '').toLowerCase().includes('bike');
      const rawTitle = (item.title && (item.title.en || item.title.ar)) || '';

      // 1. Spécifications rapides (original language, sanitized & summarized if long)
      const cleanSummary = cleanAndSummarizeSpecRapides(specRapides, rawTitle);
      item.summary = {
        en: cleanSummary,
        ar: cleanSummary,
        original: cleanSummary
      };

      // 2. Customs status (Statut de douane)
      let customsVal = { en: 'Dédouanée', ar: 'مجمركة' };
      const dLower = douaneText.toLowerCase();
      if (dLower.includes('ww')) {
        customsVal = { en: 'WW au Maroc', ar: 'WW بالمغرب' };
      } else if (dLower.includes('non')) {
        customsVal = { en: 'Non dédouanée', ar: 'غير مجمركة' };
      }
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

      // 4. Clean features: remove transmission, customs, tax hp, and ALL horsepower
      let features = (item.features || []).filter(f => {
        const lblEn = ((f.label && (f.label.en || f.label.raw || f.label)) || '').toLowerCase();
        const lblAr = ((f.label && f.label.ar) || '').toLowerCase();
        if (lblEn.includes('tax horsepower') || lblEn === 'tax hp' || lblEn.includes('puissance fiscale') || lblAr.includes('الجبائية')) return false;
        if (lblEn.includes('transmission') || lblAr.includes('ناقل الحركة')) return false;
        if (lblEn.includes('gearbox') || lblAr.includes('علبة السرعات')) return false;
        if (lblEn.includes('douane') || lblAr.includes('douane') || lblEn.includes('customs') || lblAr.includes('جمارك')) return false;
        // REMOVE all horsepower per user request
        if (lblEn.includes('horsepower') || lblAr.includes('حصان') || lblEn.includes('power')) return false;
        return true;
      });

      // Add Gearbox and Customs status to features
      features.push(gearboxFeature);
      features.push(customsFeature);

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

      // 5. Quick facts: Replace Horsepower with Statut de douane for cars
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
    }

    done += batch.length;
    if (done % 100 === 0 || done === list.length) {
      console.log(`Processed ${done} / ${list.length} listings...`);
    }
  }

  fs.writeFileSync('data/listings.imported.json', JSON.stringify(list, null, 2), 'utf8');
  console.log(`Successfully updated and saved ${list.length} listings to data/listings.imported.json`);
}

run();
