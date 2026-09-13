#!/usr/bin/env node

import fs from 'fs';
import * as cheerio from 'cheerio';
import { generateEnrichedSummary } from './darija.js';

const PRICE_REGEX = /(?:💰|prix|ثمن|tarif|vendu|cout|coût)?\s*[:=]?\s*\d{1,3}(?:[\s.,]\d{3})*\s*(?:dh|mad|dhs|درهم|د\.م|مليون|سنتيم)\b|(?:prix|ثمن)\s*[:=]?\s*[\d\s.,*]+(?:\b|dh|درهم)|(?:prix\s*fixe|prix\s*n[ée]gociable|prix\s*[àa]\s*d[ée]battre|bon\s*prix|ثمن\s*مناسب|قابل\s*للتفاوض|الثمن\s*التالي)|(?:الضريبة|ضريبة)\s*[:=]?\s*\d+\s*(?:dh|درهم)?/gi;

function extractRawDescriptionFromHtml(html) {
  const $ = cheerio.load(html);
  let desc = '';

  // 1. Look for section headings like "Spécifications rapides", "Description", "Texte de l'annonce"
  $('h3, h4, h5, .card-title, .title, .sub-title').each((_, el) => {
    if (desc) return;
    const h = $(el).text().trim().toLowerCase();
    if (
      h.includes('spécification') ||
      h.includes('specification') ||
      h.includes('description') ||
      h.includes('texte de l') ||
      h.includes('texte') ||
      h.includes('remarque') ||
      h.includes('détail de l') ||
      h.includes('detail de l')
    ) {
      let nextEl = $(el).next();
      let t = nextEl.text().trim();
      if (!t || t.length < 5) {
        t = $(el).parent().find('p, .mb-5, .text-muted, .card-body').not($(el)).text().trim();
      }
      if (t && t.length > 5 && !t.toLowerCase().includes('options') && !t.toLowerCase().includes('caractéristique')) {
        desc = t;
      }
    }
  });

  // 2. Class selectors
  if (!desc) {
    desc = $('.detail-description, .description, .text_detail, .detail-text, .bloc_description, .ad-description, #description').text().trim();
  }

  return desc;
}

export function cleanSellerText(raw) {
  if (!raw) return { cleaned: '', hadPrice: false };
  let text = raw
    .replace(/\r\n/g, '\n')
    // Remove phone numbers
    .replace(/(?:\+?212|00212|0)\s*[5-7](?:[\s.-]*\d{2}){4}/g, '')
    .replace(/\b0[5-7]\d{8}\b/g, '')
    .replace(/\b\d{10}\b/g, '')
    // Remove email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
    // Remove calls to action
    .replace(/(?:contactez[- ]moi|appelez[- ]moi|appelez|disponible sur whatsapp|contact par whatsapp|gsm|numéro)[\s\w:.]*/gi, '')
    // Remove Moteur.ma SEO boilerplate
    .replace(/^découvrez\s+l['’]annonce\s+.*?(?=[\u0600-\u06FF]|$)/i, '')
    .replace(/\b\d{4}[A-Za-z]+_phrase\b\.?/gi, '')
    .replace(/\bcarburant\s*:\s*[\w\s-]+\.?/gi, '')
    .replace(/\bréférence\s*\d+\s*sur\s*moteur\.ma\.?/gi, '')
    .replace(/\bsur\s*moteur\.ma\.?/gi, '');

  const hadPrice = PRICE_REGEX.test(text);
  const cleaned = text.replace(PRICE_REGEX, '').replace(/\s+/g, ' ').trim();

  return { cleaned, hadPrice };
}

async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    clearTimeout(timeout);
    return res;
  } catch (e) {
    clearTimeout(timeout);
    return null;
  }
}

async function processItem(item) {
  if (!item.sourceUrl) return false;
  try {
    const res = await fetchWithTimeout(item.sourceUrl, 6000);
    if (!res || !res.ok) return false;
    const html = await res.text();
    const raw = extractRawDescriptionFromHtml(html);
    const { cleaned, hadPrice } = cleanSellerText(raw);

    const isWithinRange = cleaned.length >= 40 && cleaned.length <= 200;
    if (isWithinRange && !hadPrice) {
      item.summary = {
        original: cleaned,
        ar: cleaned,
        en: cleaned,
        usedDarija: false
      };
      return true; // used seller text
    } else {
      // Fall back to Darija summary
      const fallback = generateEnrichedSummary(item);
      item.summary = {
        original: fallback.ar,
        ar: fallback.ar,
        en: fallback.en,
        usedDarija: true
      };
      return false; // used fallback
    }
  } catch (e) {
    return false;
  }
}

async function main() {
  const file = 'data/listings.imported.json';
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  console.log(`Starting scan of ${data.length} listings to extract original seller descriptions...`);

  const CONCURRENCY = 20;
  let sellerCount = 0;
  let fallbackCount = 0;
  let processed = 0;

  for (let i = 0; i < data.length; i += CONCURRENCY) {
    const batch = data.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(item => processItem(item)));
    
    results.forEach(usedSeller => {
      if (usedSeller) sellerCount++;
      else fallbackCount++;
      processed++;
    });

    if (processed % 100 === 0 || processed === data.length) {
      console.log(`Progress: ${processed}/${data.length} - Seller text: ${sellerCount}, Fallback Darija: ${fallbackCount}`);
      // Save incremental checkpoint
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    }
  }

  // Final write
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Finished processing ${data.length} listings.`);
  console.log(`Results: ${sellerCount} listings use real seller text (within 40-200 range, no price/contact).`);
  console.log(`Results: ${fallbackCount} listings use synthesized Darija summaries.`);
}

main();
