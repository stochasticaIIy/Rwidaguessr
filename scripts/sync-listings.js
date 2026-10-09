#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');

function resolveSourceFile(baseName) {
  const impFile = path.resolve(dataDir, `${baseName}.imported.json`);
  const demoFile = path.resolve(dataDir, `${baseName}.demo.json`);
  const dataFile = path.resolve(dataDir, `${baseName}.data.js`);
  const impExists = fs.existsSync(impFile);
  const demoExists = fs.existsSync(demoFile);
  const dataExists = fs.existsSync(dataFile);

  if (!impExists && !demoExists) return dataExists ? dataFile : null;
  if (impExists && !demoExists) return impFile;
  if (!impExists && demoExists) return demoFile;

  const impMtime = fs.statSync(impFile).mtimeMs;
  const demoMtime = fs.statSync(demoFile).mtimeMs;
  return demoMtime > impMtime ? demoFile : impFile;
}

async function loadListingsFromSource(sourcePath, exportKey) {
  if (sourcePath.endsWith('.js')) {
    const mod = await import(`file://${sourcePath}`);
    return mod[exportKey] || [];
  }
  const content = fs.readFileSync(sourcePath, 'utf-8');
  return JSON.parse(content);
}

try {
  const saleSource = resolveSourceFile('listings');
  if (!saleSource) {
    console.error('[Sync] No sale listings source file found (checked listings.imported.json, listings.demo.json, listings.data.js)');
    process.exit(1);
  }

  const listings = await loadListingsFromSource(saleSource, 'DEFAULT_LISTINGS');
  if (!Array.isArray(listings) || listings.length === 0) {
    console.error(`[Sync] Invalid or empty listings array in ${saleSource}`);
    process.exit(1);
  }

  // 1. Export as data.js for server and edge runtimes
  const dataJsContent = `// Automatically exported verified listings for server and edge runtimes\nexport const DEFAULT_LISTINGS = ${JSON.stringify(listings, null, 2)};\n`;
  fs.writeFileSync(path.join(dataDir, 'listings.data.js'), dataJsContent, 'utf-8');

  console.log(`[Sync] Successfully synchronized ${listings.length} sale listings from ${path.basename(saleSource)}!`);

  // 2. Also synchronize rental listings if rentals source exists
  const rentalSource = resolveSourceFile('rentals');
  if (rentalSource) {
    const rentals = await loadListingsFromSource(rentalSource, 'DEFAULT_RENTAL_LISTINGS');
    if (Array.isArray(rentals) && rentals.length > 0) {
      const rentalDataJs = `// Automatically exported verified Moroccan rental listings for server and edge runtimes\nexport const DEFAULT_RENTAL_LISTINGS = ${JSON.stringify(rentals, null, 2)};\n`;
      fs.writeFileSync(path.join(dataDir, 'rentals.data.js'), rentalDataJs, 'utf-8');
      console.log(`[Sync] Successfully synchronized ${rentals.length} rental listings from ${path.basename(rentalSource)}!`);
    }
  }
} catch (err) {
  console.error('[Sync] Error synchronizing listings:', err);
  process.exit(1);
}
