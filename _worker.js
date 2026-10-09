/**
 * Unified Cloudflare Worker & Pages Functions Entry Point
 * 
 * Routes /api/game and /api/guess to the secure game engine.
 * For all other requests, serves static assets via env.ASSETS.
 */

import { onRequestGet as handleGame } from './functions/api/game.js';
import { onRequestPost as handleGuess } from './functions/api/guess.js';
import { onRequestGet as handleLeaderboardGet, onRequestPost as handleLeaderboardPost } from './functions/api/leaderboard.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API Routes
    if (url.pathname === '/api/image' && request.method === 'GET') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
        return new Response('Invalid image URL', { status: 400 });
      }
      try {
        const parsed = new URL(targetUrl);
        const allowedHosts = ['www.moteur.ma', 'moteur.ma', 'content.avito.ma', 'static.oneclickdrive.com'];
        if (!allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
          return new Response('Host not allowed', { status: 403 });
        }
        const upstream = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          }
        });
        if (!upstream.ok) return new Response('Upstream error', { status: upstream.status });
        const headers = new Headers(upstream.headers);
        headers.set('Cache-Control', 'public, max-age=604800, s-maxage=604800, immutable');
        headers.set('Access-Control-Allow-Origin', '*');
        return new Response(upstream.body, { status: 200, headers });
      } catch (e) {
        return new Response('Proxy error: ' + e.message, { status: 502 });
      }
    }

    if (url.pathname === '/api/game' && request.method === 'GET') {
      return handleGame({ request, env });
    }

    if (url.pathname === '/api/guess' && request.method === 'POST') {
      return handleGuess({ request, env });
    }

    if (url.pathname === '/api/leaderboard') {
      if (request.method === 'GET') return handleLeaderboardGet({ request, env });
      if (request.method === 'POST') return handleLeaderboardPost({ request, env });
    }

    // Anti-Cheat: Strictly prevent cheaters from having access to raw listings and price datasets
    const p = decodeURIComponent(url.pathname).toLowerCase();
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
      return new Response('Not Found', { status: 404 });
    }

    // Static Assets Fallback (Cloudflare Workers Static Assets or Cloudflare Pages)
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    // Direct fetch fallback if running under specific worker environments
    return fetch(request);
  }
};
