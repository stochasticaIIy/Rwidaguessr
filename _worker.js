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

    // Static Assets Fallback (Cloudflare Workers Static Assets or Cloudflare Pages)
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    // Direct fetch fallback if running under specific worker environments
    return fetch(request);
  }
};
