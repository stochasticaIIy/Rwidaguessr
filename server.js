import express from 'express';
import path from 'path';
import { onRequestGet } from './functions/api/game.js';
import { onRequestPost } from './functions/api/guess.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// API routes
app.get('/api/game', async (req, res, next) => {
  try {
    const fullUrl = `http://${req.headers.host || 'localhost'}${req.originalUrl}`;
    const request = new Request(fullUrl, { method: 'GET' });
    const response = await onRequestGet({ request, env: process.env });
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
    const response = await onRequestPost({ request, env: process.env });
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

// Serve static assets
app.use(express.static(process.cwd()));

// Fallback to index.html for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RwidaGuessr server running on http://0.0.0.0:${PORT}`);
});
