import express from 'express';
import path from 'path';
import { onRequestGet } from './functions/api/game.js';
import { onRequestPost } from './functions/api/guess.js';
import { onRequestGet as handleLeaderboardGet, onRequestPost as handleLeaderboardPost } from './functions/api/leaderboard.js';
import { getEffectiveEnv } from './api/_env.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory image cache to accelerate repeat delivery and bypass adblocker URL filters
const imageCache = new Map();
const MAX_IMAGE_CACHE_ENTRIES = 500;

app.get('/api/image', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== 'string' || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).send('Invalid image URL');
  }

  try {
    const parsed = new URL(targetUrl);
    const allowedHosts = ['www.moteur.ma', 'moteur.ma', 'content.avito.ma', 'static.oneclickdrive.com'];
    if (!allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
      return res.status(403).send('Host not allowed');
    }

    if (imageCache.has(targetUrl)) {
      const cached = imageCache.get(targetUrl);
      res.set('Content-Type', cached.contentType);
      res.set('Cache-Control', 'public, max-age=604800, s-maxage=604800, immutable');
      res.set('Access-Control-Allow-Origin', '*');
      return res.send(cached.buffer);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const upstream = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return res.status(upstream.status).send('Upstream image error');
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (imageCache.size >= MAX_IMAGE_CACHE_ENTRIES) {
      const firstKey = imageCache.keys().next().value;
      imageCache.delete(firstKey);
    }
    imageCache.set(targetUrl, { contentType, buffer });

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=604800, s-maxage=604800, immutable');
    res.set('Access-Control-Allow-Origin', '*');
    return res.send(buffer);
  } catch (err) {
    return res.status(502).send('Error proxying image: ' + err.message);
  }
});

// API routes
app.get('/api/game', async (req, res, next) => {
  try {
    const fullUrl = `http://${req.headers.host || 'localhost'}${req.originalUrl}`;
    const request = new Request(fullUrl, { method: 'GET' });
    const response = await onRequestGet({ request, env: getEffectiveEnv() });
    const status = response.status;
    const data = await response.json();
    if (response.headers.get('cache-control')) {
      res.set('cache-control', response.headers.get('cache-control'));
    }
    res.status(status).json(data);
  } catch (err) {
    next(err);
  }
});

app.post('/api/guess', async (req, res, next) => {
  try {
    const fullUrl = `http://${req.headers.host || 'localhost'}${req.originalUrl}`;
    const request = new Request(fullUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const response = await onRequestPost({ request, env: getEffectiveEnv() });
    const status = response.status;
    const data = await response.json();
    if (response.headers.get('cache-control')) {
      res.set('cache-control', response.headers.get('cache-control'));
    }
    res.status(status).json(data);
  } catch (err) {
    next(err);
  }
});

app.get('/api/leaderboard', async (req, res, next) => {
  try {
    const fullUrl = `http://${req.headers.host || 'localhost'}${req.originalUrl}`;
    const request = new Request(fullUrl, { method: 'GET' });
    const response = await handleLeaderboardGet({ request, env: getEffectiveEnv() });
    const status = response.status;
    const data = await response.json();
    if (response.headers.get('cache-control')) {
      res.set('cache-control', response.headers.get('cache-control'));
    }
    res.status(status).json(data);
  } catch (err) {
    next(err);
  }
});

app.post('/api/leaderboard', async (req, res) => {
  try {
    const fullUrl = `http://${req.headers.host || 'localhost'}${req.originalUrl}`;
    const request = new Request(fullUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const response = await handleLeaderboardPost({ request, env: getEffectiveEnv() });
    const status = response.status;
    const data = await response.json();
    if (response.headers.get('cache-control')) {
      res.set('cache-control', response.headers.get('cache-control'));
    }
    return res.status(status).json(data);
  } catch (err) {
    console.error('[Leaderboard POST Error]', err);
    return res.status(500).json({ error: 'Server error processing leaderboard', details: err.message });
  }
});

// Anti-Cheat: Strictly prevent cheaters from having access to raw listings and price datasets
app.use((req, res, next) => {
  const p = decodeURIComponent(req.path).toLowerCase();
  if (
    p.startsWith('/data') ||
    p.includes('listing') ||
    p.includes('rental') ||
    p.startsWith('/functions') ||
    p.startsWith('/scripts') ||
    p.startsWith('/tests') ||
    p.startsWith('/api/_env') ||
    p === '/package.json' ||
    p === '/package-lock.json' ||
    p === '/server.js' ||
    p === '/_worker.js' ||
    p.startsWith('/.env')
  ) {
    return res.status(404).send('Not Found');
  }
  next();
});

// Serve static assets
app.use(express.static(process.cwd()));

// Fallback to index.html for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RwidaGuessr server running on http://0.0.0.0:${PORT}`);
});
