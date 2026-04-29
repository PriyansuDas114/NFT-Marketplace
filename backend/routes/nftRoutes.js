import { Router } from 'express';
import {
  getAllNFTs,
  getListedNFTs,
  getNFTById,
  getNFTsByOwner,
  mintNFT,
  listNFT,
  buyNFT,
  cancelListing,
} from '../controllers/nftController.js';
import { requireWallet }         from '../middleware/auth.js';
import { validate, validateQuery, MintSchema, ListSchema, QuerySchema } from '../middleware/validate.js';
import { mintLimiter, listLimiter } from '../middleware/rateLimit.js';

const router = Router();

// ── Read endpoints (public) ───────────────────────────────────
router.get('/',               validateQuery(QuerySchema), getAllNFTs);
router.get('/listed',         getListedNFTs);
router.get('/owner/:address', getNFTsByOwner);
router.get('/:id',            getNFTById);

// ── Write endpoints (authenticated + rate limited) ────────────
router.post(
  '/mint',
  requireWallet,                // ← verify wallet signature
  mintLimiter,                  // ← 5 per 15 min per wallet
  validate(MintSchema),         // ← validate + sanitise body
  mintNFT
);

router.post(
  '/list',
  requireWallet,
  listLimiter,
  validate(ListSchema),
  listNFT
);

router.post(
  '/buy',
  requireWallet,
  validate(ListSchema.pick({ tokenId: true }).extend({ txHash: MintSchema.shape.txHash })),
  buyNFT
);

router.post(
  '/cancel',
  requireWallet,
  validate(ListSchema.pick({ tokenId: true })),
  cancelListing
);

export default router;
