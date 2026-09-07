import { onRequestPost } from '../functions/api/guess.js';
import { getEffectiveEnv } from './_env.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const fullUrl = `${proto}://${host}${req.url}`;
    const request = new Request(fullUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const response = await onRequestPost({ request, env: getEffectiveEnv() });
    const status = response.status;
    const data = await response.json();
    if (response.headers.get('cache-control')) {
      res.setHeader('Cache-Control', response.headers.get('cache-control'));
    }
    return res.status(status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
