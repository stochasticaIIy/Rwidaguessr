import path from 'path';
import fs from 'fs';

export function getEffectiveEnv() {
  const env = { ...process.env };
  if (!env.LISTINGS_JSON) {
    const candidateFiles = [
      path.join(process.cwd(), 'data', 'listings.production.json'),
      path.join(process.cwd(), 'data', 'listings.imported.json'),
      path.join(process.cwd(), 'data', 'listings.example.json')
    ];
    for (const file of candidateFiles) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length >= 5) {
            env.LISTINGS_JSON = content;
            break;
          }
        } catch (_) {}
      }
    }
  }
  if (!env.GAME_SIGNING_SECRET) {
    env.GAME_SIGNING_SECRET = process.env.GAME_SIGNING_SECRET || 'local-development-secret-key-at-least-32-chars-long';
  }
  return env;
}
