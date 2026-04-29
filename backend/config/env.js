import { z } from 'zod';

/**
 * env.js — Zod schema that validates all env vars at startup.
 */
const envSchema = z.object({
  NODE_ENV:             z.enum(['development', 'test', 'production']).default('development'),
  PORT:                 z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL:         z.string().min(1, 'DATABASE_URL is required'),
  ALLOWED_ORIGINS:      z.string().default('http://localhost:5173'),
  NONCE_SECRET:         z.string().min(16).default('development_secret_do_not_use_in_prod'),
  MARKETPLACE_ADDRESS:  z.string().optional(),
  NFT_ADDRESS:          z.string().optional(),
  RPC_URL:              z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map(i => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error('[ENV] ❌ Invalid environment variables:\n' + issues);
  process.exit(1);
}

export const env = parsed.data;
export default env;
