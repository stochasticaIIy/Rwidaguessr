#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const sourceFile = path.resolve(process.cwd(), 'data/listings.imported.json');
const dataDir = path.resolve(process.cwd(), 'data');

if (!fs.existsSync(sourceFile)) {
  console.error('[Sync] Source file data/listings.imported.json not found!');
  process.exit(1);
}

try {
  const content = fs.readFileSync(sourceFile, 'utf-8');
  const listings = JSON.parse(content);
  if (!Array.isArray(listings) || listings.length === 0) {
    console.error('[Sync] Invalid or empty listings array in data/listings.imported.json');
    process.exit(1);
  }

  // 1. Export as data.js for Cloudflare Workers / Functions runtime
  const dataJsContent = `// Automatically exported verified listings for server and edge runtimes\nexport const DEFAULT_LISTINGS = ${JSON.stringify(listings, null, 2)};\n`;
  fs.writeFileSync(path.join(dataDir, 'listings.data.js'), dataJsContent, 'utf-8');

  // 2. Export as demo.js for browser script fallback
  const demoJsContent = `/*\n * Real verified Moroccan vehicle listings with 100% working high-resolution photos.\n * Used for instant client-side rendering and static/fallback operation.\n */\nwindow.DEMO_LISTINGS = ${JSON.stringify(listings, null, 2)};\n`;
  fs.writeFileSync(path.join(dataDir, 'listings.demo.js'), demoJsContent, 'utf-8');

  // 3. Export as demo.json for parity
  fs.writeFileSync(path.join(dataDir, 'listings.demo.json'), JSON.stringify(listings, null, 2), 'utf-8');

  console.log(`[Sync] Successfully synchronized ${listings.length} sale listings from listings.imported.json to listings.data.js, listings.demo.js, and listings.demo.json!`);

  // 4. Also synchronize rental listings if data/rentals.imported.json exists
  const rentalSourceFile = path.resolve(process.cwd(), 'data/rentals.imported.json');
  if (fs.existsSync(rentalSourceFile)) {
    const rentalContent = fs.readFileSync(rentalSourceFile, 'utf-8');
    const rentals = JSON.parse(rentalContent);
    if (Array.isArray(rentals) && rentals.length > 0) {
      const rentalDataJs = `// Automatically exported verified Moroccan rental listings for server and edge runtimes\nexport const DEFAULT_RENTAL_LISTINGS = ${JSON.stringify(rentals, null, 2)};\n`;
      fs.writeFileSync(path.join(dataDir, 'rentals.data.js'), rentalDataJs, 'utf-8');

      const rentalDemoJs = `/*\n * Real verified Moroccan rental vehicle listings (daily rates in MAD/day).\n * Used for instant client-side rendering and static/fallback operation.\n */\nwindow.DEMO_RENTAL_LISTINGS = ${JSON.stringify(rentals, null, 2)};\n`;
      fs.writeFileSync(path.join(dataDir, 'rentals.demo.js'), rentalDemoJs, 'utf-8');

      fs.writeFileSync(path.join(dataDir, 'rentals.demo.json'), JSON.stringify(rentals, null, 2), 'utf-8');
      console.log(`[Sync] Successfully synchronized ${rentals.length} rental listings from rentals.imported.json to rentals.data.js, rentals.demo.js, and rentals.demo.json!`);
    }
  }
} catch (err) {
  console.error('[Sync] Error synchronizing listings:', err);
  process.exit(1);
}
