// ─── This file MUST be imported first, before any other code ──
// ES modules hoist all imports to the top, so we need this separate file

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

console.log('[ENV LOADER] Loading from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('[ENV LOADER] ❌ Failed to load .env:', result.error);
} else {
  console.log('[ENV LOADER] ✓ Loaded successfully');
  console.log('[ENV LOADER] DATABASE_URL:', process.env.DATABASE_URL ? 'present' : 'missing');
}

export default result;
