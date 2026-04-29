import { z } from 'zod';
import { NFT_CATEGORIES } from '../config/constants.js';

// ─────────────────────────────────────────────────────────────
//  Zod Validation middleware
//
//  The original backend had ZERO input validation. Controllers
//  passed req.body directly to the database. This means:
//    - Any string could be stored as a price (e.g. "DROP TABLE")
//    - IPFS URLs were never verified to be URLs at all
//    - name/description had no length limits (DB storage abuse)
//
//  Usage on a route:
//    router.post('/mint', requireWallet, validate(MintSchema), mintNFT);
//
//  On failure → 422 Unprocessable Entity with field-level details.
// ─────────────────────────────────────────────────────────────

/**
 * validate — wraps a Zod schema and validates req.body against it.
 * Attaches the parsed (coerced + stripped) data to req.body on success.
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map(issue => ({
      field:   issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(422).json({ error: 'Validation failed', errors });
  }
  // Replace req.body with the cleaned/coerced data
  req.body = result.data;
  next();
};

// ─── Schemas ─────────────────────────────────────────────────

/** Ethereum address — lowercase, 42 chars, 0x-prefixed */
const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, 'Must be a valid Ethereum address (0x + 40 hex chars)');

/** ETH price string — positive number, up to 18 decimal places */
const priceSchema = z
  .string()
  .regex(/^\d+(\.\d{1,18})?$/, 'Price must be a positive number (e.g. "0.05")')
  .refine(v => parseFloat(v) > 0, 'Price must be greater than 0');

/**
 * MintSchema — validated body for POST /api/nfts/mint
 */
export const MintSchema = z.object({
  name:        z.string().trim().min(1, 'Name is required').max(100, 'Max 100 characters'),
  description: z.string().trim().min(1, 'Description is required').max(1000, 'Max 1000 characters'),
  price:       priceSchema.optional().default('0'),
  ipfsUrl:     z.string().url('Must be a valid URL'),
  owner:       addressSchema,
  listed:      z.boolean().optional().default(false),
  tokenId:     z.string().optional(),
  category:    z.enum(NFT_CATEGORIES).optional(),
  txHash:      z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid tx hash').optional(),
});

/**
 * ListSchema — validated body for POST /api/nfts/list
 */
export const ListSchema = z.object({
  tokenId:  z.union([z.string(), z.coerce.string()]),
  price:    priceSchema,
  category: z.enum(NFT_CATEGORIES).optional(),
  listingId: z.string().optional(),
});

/**
 * QuerySchema — validated query params for GET /api/nfts
 * (cast strings → numbers, apply defaults)
 */
export const QuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum([...NFT_CATEGORIES, 'All']).optional(),
  sort:     z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  listed:   z.enum(['true', 'false', 'all']).default('all'),
  search:   z.string().max(100).optional(),
});

/**
 * validateQuery — like validate() but for req.query instead of req.body.
 */
export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const errors = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    return res.status(422).json({ error: 'Invalid query params', errors });
  }
  req.query = result.data;
  next();
};
