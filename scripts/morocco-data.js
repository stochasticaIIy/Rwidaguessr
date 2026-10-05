// scripts/morocco-data.js
/**
 * Shared Morocco-specific data and helpers used by every importer.
 * Centralized so city/region names never drift between scripts.
 *
 * Also home to extractListingImages() — the og:image-anchored listing
 * image extractor used by every parser to guarantee that returned photos
 * belong to the listing being parsed, not to promos / related-listing
 * carousels / site chrome elsewhere on the same page.
 */

export function cleanText(str) {
  if (!str) return '';
  return String(str).replace(/\s+/g, ' ').trim();
}

export function hashString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function safeDecodeUri(str) {
  if (!str) return '';
  const replaced = String(str).replace(/\+/g, ' ');
  try {
    return decodeURIComponent(replaced);
  } catch (_) {
    return replaced;
  }
}

export const MOROCCAN_CITIES = [
  // Casablanca - Settat
  { key: 'casablanca', city: 'Casablanca', cityAr: 'الدار البيضاء', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, patterns: [/casablanca/i, /\bcasa\b/i, /mohammed\s*v/i, /الدار البيضاء/, /كازا/] },
  { key: 'mohammedia', city: 'Mohammedia', cityAr: 'المحمدية', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, patterns: [/mohammedia/i, /المحمدية/] },
  { key: 'el-jadida', city: 'El Jadida', cityAr: 'الجديدة', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, patterns: [/el[\s-]jadida/i, /الجديدة/] },
  { key: 'berrechid', city: 'Berrechid', cityAr: 'برشيد', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, patterns: [/berrechid/i, /برشيد/] },
  { key: 'settat', city: 'Settat', cityAr: 'سطات', region: 'casablanca', regionName: { ar: 'الدار البيضاء - سطات', en: 'Casablanca - Settat' }, patterns: [/settat/i, /سطات/] },

  // Rabat - Salé - Kénitra
  { key: 'rabat', city: 'Rabat', cityAr: 'الرباط', region: 'rabat', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, patterns: [/\brabat\b/i, /الرباط/] },
  { key: 'sale', city: 'Salé', cityAr: 'سلا', region: 'rabat', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, patterns: [/\bsal[eé]\b/i, /سلا/] },
  { key: 'kenitra', city: 'Kénitra', cityAr: 'القنيطرة', region: 'rabat', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, patterns: [/k[eé]nitra/i, /القنيطرة/] },
  { key: 'temara', city: 'Témara', cityAr: 'تمارة', region: 'rabat', regionName: { ar: 'الرباط - سلا - القنيطرة', en: 'Rabat - Salé - Kénitra' }, patterns: [/t[eé]mara/i, /تمارة/] },

  // Tanger - Tétouan - Al Hoceïma (North)
  { key: 'tanger', city: 'Tanger', cityAr: 'طنجة', region: 'tanger', regionName: { ar: 'طنجة - تطوان - الشمال', en: 'Tangier - Tétouan (North)' }, patterns: [/tanger/i, /tangier/i, /ibn\s*battouta/i, /طنجة/] },
  { key: 'tetouan', city: 'Tétouan', cityAr: 'تطوان', region: 'tanger', regionName: { ar: 'طنجة - تطوان - الشمال', en: 'Tangier - Tétouan (North)' }, patterns: [/t[eé]touan/i, /martil/i, /تطوان/] },
  { key: 'nador', city: 'Nador', cityAr: 'الناظور', region: 'tanger', regionName: { ar: 'طنجة - تطوان - الشمال', en: 'Tangier - Tétouan (North)' }, patterns: [/nador/i, /الناظور/] },

  // Marrakech - Safi & Souss - Massa (South)
  { key: 'marrakech', city: 'Marrakech', cityAr: 'مراكش', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, patterns: [/marrakech/i, /marrakesh/i, /menara/i, /gueliz/i, /مراكش/] },
  { key: 'agadir', city: 'Agadir', cityAr: 'أكادير', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, patterns: [/agadir/i, /al\s*massira/i, /أكادير/, /اكادير/] },
  { key: 'essaouira', city: 'Essaouira', cityAr: 'الصويرة', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, patterns: [/essaouira/i, /الصويرة/] },
  { key: 'safi', city: 'Safi', cityAr: 'آسفي', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, patterns: [/\bsafi\b/i, /آسفي/] },
  { key: 'laayoune', city: 'Laâyoune', cityAr: 'العيون', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, patterns: [/la[aâ]youne/i, /\bel\s*aai?un\b/i, /العيون/] },
  { key: 'dakhla', city: 'Dakhla', cityAr: 'الداخلة', region: 'marrakech', regionName: { ar: 'مراكش - أكادير - الجنوب', en: 'Marrakech - Agadir (South)' }, patterns: [/dakhla/i, /الداخلة/] },

  // Fès - Meknès - Oriental
  { key: 'fes', city: 'Fès', cityAr: 'فاس', region: 'oriental', regionName: { ar: 'فاس - مكناس - الشرق', en: 'Fès - Meknès - Oriental' }, patterns: [/\bf[eè]s\b/i, /\bfez\b/i, /sa[ïi]ss/i, /فاس/] },
  { key: 'meknes', city: 'Meknès', cityAr: 'مكناس', region: 'oriental', regionName: { ar: 'فاس - مكناس - الشرق', en: 'Fès - Meknès - Oriental' }, patterns: [/m[eé]kn[eè]s/i, /مكناس/] },
  { key: 'oujda', city: 'Oujda', cityAr: 'وجدة', region: 'oriental', regionName: { ar: 'فاس - مكناس - الشرق', en: 'Fès - Meknès - Oriental' }, patterns: [/oujda/i, /angads/i, /وجدة/] }
];

export function resolveLocationFromText(primaryText = '', secondaryText = '', fallbackIndex = 0) {
  for (const c of MOROCCAN_CITIES) {
    if (c.patterns.some((p) => p.test(primaryText))) {
      return { region: c.region, regionName: c.regionName, city: c.city, cityAr: c.cityAr };
    }
  }
  if (secondaryText) {
    for (const c of MOROCCAN_CITIES) {
      if (c.patterns.some((p) => p.test(secondaryText))) {
        return { region: c.region, regionName: c.regionName, city: c.city, cityAr: c.cityAr };
      }
    }
  }
  const picked = MOROCCAN_CITIES[fallbackIndex % MOROCCAN_CITIES.length];
  return { region: picked.region, regionName: picked.regionName, city: picked.city, cityAr: picked.cityAr };
}

export const KNOWN_BRANDS = [
  'Mercedes-Benz', 'Land Rover', 'Range Rover', 'Alfa Romeo', 'Aston Martin',
  'Volkswagen', 'Renault', 'Peugeot', 'Citroën', 'Citroen', 'Dacia', 'Hyundai',
  'Kia', 'Toyota', 'Ford', 'Opel', 'Fiat', 'Audi', 'BMW', 'Porsche', 'Jeep',
  'Nissan', 'Seat', 'Cupra', 'Skoda', 'Volvo', 'Mini', 'Suzuki', 'Honda',
  'Mitsubishi', 'Mazda', 'Chevrolet', 'MG', 'BYD', 'Tesla', 'Changan', 'Geely',
  'Haval', 'Chery', 'DFSK', 'Jaguar', 'Maserati', 'Bentley', 'Ferrari', 'Lamborghini',
  'Yamaha', 'Kawasaki', 'Ducati', 'KTM', 'Harley-Davidson', 'Triumph', 'Aprilla',
  'Vespa', 'Piaggio', 'Kymco', 'SYM', 'CFMOTO', 'CF Moto', 'Royal Enfield',
  'Benelli', 'MBK', 'Bécane', 'Becane', 'Docker', 'Sanya', 'Vinto', 'Gabelli', 'TVS', 'Austin'
];

export function splitBrandAndModel(rawTitle = '') {
  const decoded = safeDecodeUri(rawTitle);
  const cleaned = cleanText(decoded)
    .replace(/^(?:Location|Louer|Rent|Rental)\s+(?:voiture|moto|scooter)?\s*/i, '')
    .replace(/\b(?:19\d\d|20\d\d)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const b of KNOWN_BRANDS) {
    const regex = new RegExp(`^${b.replace(/[-]/g, '[\\s-]')}\\b\\s*(.*)$`, 'i');
    const m = cleaned.match(regex);
    if (m) {
      const brandName = b === 'Citroen' ? 'Citroën' : b === 'CF Moto' ? 'CFMOTO' : b === 'Becane' ? 'Bécane' : b;
      const modelName = cleanText(m[1]) || brandName;
      return { brand: brandName, model: modelName, fullTitle: `${brandName} ${modelName}`.trim() };
    }
  }

  const parts = cleaned.split(' ');
  const brand = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Véhicule';
  const model = parts.slice(1).join(' ') || 'Standard';
  return { brand, model, fullTitle: cleaned || 'Véhicule' };
}

// =============================================================================
// Pattern A: og:image-anchored listing image extraction.
//
// Strategy:
//   1. Read the page's og:image / twitter:image / link[rel=image_src].
//   2. Walk up from the <img> whose src matches it, stopping at the narrowest
//      ancestor that either carries a gallery-hint class or already holds
//      multiple images. That ancestor is the listing gallery.
//   3. Pull only <img> from that ancestor.
//
// Fallbacks (used only if og:image is missing or doesn't match any <img>):
//   4. Per-site gallery selectors.
//   5. og:image alone — never a page-wide sweep.
// =============================================================================

const GALLERY_HINT_RE = /gallery|slider|carousel|swiper|photo|image|viewer|lightbox|album|thumbnail/i;
const NON_LISTING_RE = /logo|icon|sprite|placeholder|spacer|pixel|loading|default-?(?:image|photo)|share|social/i;

function _normalizeUrl(raw, origin) {
  if (!raw) return '';
  let s = String(raw).trim().replace(/&amp;/g, '&');
  if (!s || s.startsWith('data:')) return '';
  if (s.startsWith('//')) return 'https:' + s;
  if (s.startsWith('/') && origin) return origin + s;
  return s;
}

function _applyUpscale(url, upscaleRules) {
  let u = url;
  for (const rule of upscaleRules || []) {
    if (typeof rule === 'function') u = rule(u);
    else if (rule && rule.from != null && rule.to != null) u = u.replace(rule.from, rule.to);
  }
  return u;
}

function _urlKey(url) {
  return String(url).split('?')[0].replace(/\/+$/, '');
}

function _findGalleryRoot($, startEl) {
  let p = $(startEl).parent();
  let firstMulti = null;
  while (p.length) {
    const el = p[0];
    if (!el || el.tagName === 'body' || el.tagName === 'html') break;
    const cls = (el.attribs && (el.attribs.class || '')) || '';
    const id = (el.attribs && (el.attribs.id || '')) || '';

    if (p.find('img').length >= 2 && !firstMulti) firstMulti = p;

    if (GALLERY_HINT_RE.test(cls) || GALLERY_HINT_RE.test(id)) {
      if (p.find('img').length >= 1) return p;
    }
    p = p.parent();
  }
  return firstMulti || $();
}

function _readImgUrl($el, upscaleRules, origin) {
  const srcset = $el.attr('srcset') || $el.attr('data-srcset') || '';
  if (srcset) {
    const best = srcset
      .split(',')
      .map((s) => s.trim().split(/\s+/))
      .filter((p) => p[0])
      .sort((a, b) => (parseInt(b[1] || '0', 10) || 0) - (parseInt(a[1] || '0', 10) || 0))[0];
    if (best && best[0]) return _applyUpscale(_normalizeUrl(best[0], origin), upscaleRules);
  }
  const raw =
    $el.attr('src') ||
    $el.attr('data-src') ||
    $el.attr('data-lazy') ||
    $el.attr('data-defer-src') ||
    $el.attr('data-original') ||
    '';
  return _applyUpscale(_normalizeUrl(raw, origin), upscaleRules);
}

export function extractListingImages($, opts = {}) {
  const {
    cdnPattern = null,
    gallerySelectors = [],
    origin = '',
    maxCount = 10,
    upscale = []
  } = opts;

  const ogRaw =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[property="og:image:secure_url"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('link[rel="image_src"]').attr('href') ||
    '';
  const ogUrl = ogRaw ? _applyUpscale(_normalizeUrl(ogRaw, origin), upscale) : '';
  const ogKey = ogUrl ? _urlKey(ogUrl) : '';

  let gallery = null;
  if (ogKey) {
    $('img').each((_, el) => {
      const $el = $(el);
      const candidates = [
        $el.attr('src'), $el.attr('data-src'), $el.attr('data-lazy'),
        $el.attr('data-defer-src'), $el.attr('data-original'),
        ...(($el.attr('srcset') || $el.attr('data-srcset') || '')
            .split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean))
      ].filter(Boolean);
      for (const c of candidates) {
        const n = _applyUpscale(_normalizeUrl(c, origin), upscale);
        if (n && _urlKey(n) === ogKey) {
          const root = _findGalleryRoot($, el);
          if (root && root.length) { gallery = root; return false; }
        }
      }
    });
  }

  if ((!gallery || !gallery.length) && gallerySelectors.length) {
    for (const sel of gallerySelectors) {
      const cand = $(sel).first();
      if (cand.length && cand.find('img').length > 0) { gallery = cand; break; }
    }
  }

  if (!gallery || !gallery.length) {
    return ogUrl ? [ogUrl] : [];
  }

  const out = [];
  const seen = new Set();
  const push = (url) => {
    if (!url || seen.has(_urlKey(url))) return;
    if (NON_LISTING_RE.test(url)) return;
    if (cdnPattern && !cdnPattern.test(url)) return;
    if (/\.svg($|\?)/i.test(url)) return;
    seen.add(_urlKey(url));
    out.push(url);
  };

  gallery.find('img').each((_, el) => {
    const url = _readImgUrl($(el), upscale, origin);
    push(url);
  });

  if (ogUrl && !seen.has(ogKey)) {
    out.unshift(ogUrl);
  } else if (ogUrl) {
    const idx = out.findIndex((u) => _urlKey(u) === ogKey);
    if (idx > 0) { out.splice(idx, 1); out.unshift(ogUrl); }
  }

  return out.slice(0, maxCount);
}