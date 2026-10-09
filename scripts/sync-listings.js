#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');

function resolveSourceFile(baseName) {
  const impFile = path.resolve(dataDir, `${baseName}.imported.json`);
  const demoFile = path.resolve(dataDir, `${baseName}.demo.json`);
  const impExists = fs.existsSync(impFile);
  const demoExists = fs.existsSync(demoFile);

  if (!impExists && !demoExists) return null;
  if (impExists && !demoExists) return impFile;
  if (!impExists && demoExists) return demoFile;

  const impMtime = fs.statSync(impFile).mtimeMs;
  const demoMtime = fs.statSync(demoFile).mtimeMs;
  return demoMtime > impMtime ? demoFile : impFile;
}

try {
  const saleSource = resolveSourceFile('listings');
  if (!saleSource) {
    console.error('[Sync] No sale listings source file found (checked listings.imported.json and listings.demo.json)');
    process.exit(1);
  }

  const content = fs.readFileSync(saleSource, 'utf-8');
  const listings = JSON.parse(content);
  if (!Array.isArray(listings) || listings.length === 0) {
    console.error(`[Sync] Invalid or empty listings array in ${saleSource}`);
    process.exit(1);
  }

  // 1. Export as data.js for Cloudflare Workers / Functions runtime
  const dataJsContent = `// Automatically exported verified listings for server and edge runtimes\nexport const DEFAULT_LISTINGS = ${JSON.stringify(listings, null, 2)};\n`;
  fs.writeFileSync(path.join(dataDir, 'listings.data.js'), dataJsContent, 'utf-8');

  // 2. Export as demo.js for browser script fallback
  const demoJsContent = `/*\n * Real verified Moroccan vehicle listings with 100% working high-resolution photos.\n * Used for instant client-side rendering and static/fallback operation.\n */\nwindow.DEMO_LISTINGS = ${JSON.stringify(listings, null, 2)};\n`;
  fs.writeFileSync(path.join(dataDir, 'listings.demo.js'), demoJsContent, 'utf-8');

  // 3. Keep demo.json and imported.json in sync
  fs.writeFileSync(path.join(dataDir, 'listings.demo.json'), JSON.stringify(listings, null, 2), 'utf-8');
  fs.writeFileSync(path.join(dataDir, 'listings.imported.json'), JSON.stringify(listings, null, 2), 'utf-8');

  console.log(`[Sync] Successfully synchronized ${listings.length} sale listings from ${path.basename(saleSource)} to all runtimes!`);

  // 4. Also synchronize rental listings if rentals source exists
  const rentalSource = resolveSourceFile('rentals');
  if (rentalSource) {
    const rentalContent = fs.readFileSync(rentalSource, 'utf-8');
    const rentals = JSON.parse(rentalContent);
    if (Array.isArray(rentals) && rentals.length > 0) {
      const rentalDataJs = `// Automatically exported verified Moroccan rental listings for server and edge runtimes\nexport const DEFAULT_RENTAL_LISTINGS = ${JSON.stringify(rentals, null, 2)};\n`;
      fs.writeFileSync(path.join(dataDir, 'rentals.data.js'), rentalDataJs, 'utf-8');

      const rentalDemoJs = `/*\n * Real verified Moroccan rental vehicle listings (daily rates in MAD/day).\n * Used for instant client-side rendering and static/fallback operation.\n */\nwindow.DEMO_RENTAL_LISTINGS = ${JSON.stringify(rentals, null, 2)};\n`;
      fs.writeFileSync(path.join(dataDir, 'rentals.demo.js'), rentalDemoJs, 'utf-8');

      fs.writeFileSync(path.join(dataDir, 'rentals.demo.json'), JSON.stringify(rentals, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dataDir, 'rentals.imported.json'), JSON.stringify(rentals, null, 2), 'utf-8');
      console.log(`[Sync] Successfully synchronized ${rentals.length} rental listings from ${path.basename(rentalSource)} to all runtimes!`);
    }
  }
} catch (err) {
  console.error('[Sync] Error synchronizing listings:', err);
  process.exit(1);
}
