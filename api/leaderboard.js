import { onRequestGet, onRequestPost } from '../functions/api/leaderboard.js';
import { getEffectiveEnv } from './_env.js';

export default async function handler(req, res) {
  const env = getEffectiveEnv();
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const fullUrl = `${proto}://${host}${req.url}`;

  if (req.method === 'GET') {
    try {
      const request = new Request(fullUrl, { method: 'GET', headers: req.headers });
      const response = await onRequestGet({ request, env });
      const status = response.status;
      const data = await response.json();
      return res.status(status).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const request = new Request(fullUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      const response = await onRequestPost({ request, env });
      const status = response.status;
      const data = await response.json();
      return res.status(status).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
