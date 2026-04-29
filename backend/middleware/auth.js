import { ethers } from 'ethers';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
//  SIWE-lite wallet authentication
//
//  The original backend had NO authentication at all — any caller
//  could POST to /api/nfts/mint and write arbitrary data to the DB.
//
//  This middleware implements EIP-191 personal_sign verification:
//    1. Client signs a timestamped message with their private key
//    2. Server recovers the signer address from the signature
//    3. Server verifies it matches the claimed address
//
//  Usage on a route:
//    router.post('/mint', requireWallet, mintNFT);
//
//  Expected headers:
//    x-wallet-address:   0xABC...
//    x-wallet-signature: 0xDEF...
//    x-wallet-message:   "NexMint auth: 1234567890"
// ─────────────────────────────────────────────────────────────

const authHeaderSchema = z.object({
  'x-wallet-address':   z.string().min(40).max(42),
  'x-wallet-signature': z.string().min(130),
  'x-wallet-message':   z.string().min(1).max(500),
});

export const requireWallet = (req, res, next) => {
  // Parse and validate headers
  const parsed = authHeaderSchema.safeParse(req.headers);
  if (!parsed.success) {
    return res.status(401).json({
      error: 'Unauthorized',
      detail: 'Missing or malformed wallet auth headers. '
            + 'Provide x-wallet-address, x-wallet-signature, x-wallet-message.',
    });
  }

  const { 'x-wallet-address': address, 'x-wallet-signature': signature, 'x-wallet-message': message } = parsed.data;

  try {
    // EIP-191: recover signer from personal_sign message
    const recovered = ethers.verifyMessage(message, signature);

    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({
        error: 'Unauthorized',
        detail: 'Signature does not match the provided address.',
      });
    }

    // Attach verified address to request for downstream use
    req.walletAddress = recovered.toLowerCase();
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      detail: 'Invalid signature format.',
    });
  }
};

/**
 * optionalWallet — same as requireWallet but does NOT block the request.
 * Attaches req.walletAddress if auth headers are present and valid,
 * otherwise sets req.walletAddress = null.
 *
 * Use for endpoints that work for both authenticated and anonymous callers.
 */
export const optionalWallet = (req, res, next) => {
  const parsed = authHeaderSchema.safeParse(req.headers);
  if (!parsed.success) {
    req.walletAddress = null;
    return next();
  }

  const { 'x-wallet-address': address, 'x-wallet-signature': signature, 'x-wallet-message': message } = parsed.data;

  try {
    const recovered = ethers.verifyMessage(message, signature);
    req.walletAddress = recovered.toLowerCase() === address.toLowerCase()
      ? recovered.toLowerCase()
      : null;
  } catch {
    req.walletAddress = null;
  }

  next();
};
