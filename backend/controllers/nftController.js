import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { PAGINATION } from '../config/constants.js';
import { incrementListedCount, decrementListedCount, recordSale } from './metricsController.js';

/**
 * asyncHandler — eliminates try/catch boilerplate in every handler.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── GET /api/nfts ─────────────────────────────────────────────
/**
 * getAllNFTs — paginated list with filtering and sorting.
 */
export const getAllNFTs = asyncHandler(async (req, res) => {
  const {
    page     = PAGINATION.DEFAULT_PAGE,
    limit    = PAGINATION.DEFAULT_LIMIT,
    category,
    sort     = 'newest',
    listed   = 'all',
    search,
  } = req.query;

  const where = {};
  if (listed === 'true')        where.listed = true;
  if (listed === 'false')       where.listed = false;
  if (category && category !== 'All') where.category = category;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy = {
    newest: { createdAt: 'desc' },
    price_asc: { price: 'asc' },
    price_desc: { price: 'desc' },
  }[sort] || { createdAt: 'desc' };

  const skip = (page - 1) * limit;

  const [nfts, total] = await Promise.all([
    prisma.nFT.findMany({
      where,
      orderBy,
      skip,
      take: parseInt(limit),
    }),
    prisma.nFT.count({ where }),
  ]);

  res.json({
    nfts,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
    },
  });
});

// ── GET /api/nfts/listed ──────────────────────────────────────
export const getListedNFTs = asyncHandler(async (req, res) => {
  const nfts = await prisma.nFT.findMany({
    where: { listed: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(nfts);
});

// ── GET /api/nfts/:id ─────────────────────────────────────────
export const getNFTById = asyncHandler(async (req, res) => {
  const nft = await prisma.nFT.findUnique({
    where: { id: req.params.id },
  });
  if (!nft) throw new AppError('NFT not found', 404);
  res.json(nft);
});

// ── GET /api/nfts/owner/:address ──────────────────────────────
export const getNFTsByOwner = asyncHandler(async (req, res) => {
  const nfts = await prisma.nFT.findMany({
    where: { owner: req.params.address.toLowerCase() },
    orderBy: { createdAt: 'desc' },
  });
  res.json(nfts);
});

// ── POST /api/nfts/mint ───────────────────────────────────────
/**
 * mintNFT — Create new NFT record after blockchain mint.
 * Requires wallet authentication headers.
 */
export const mintNFT = asyncHandler(async (req, res) => {
  const { name, description, price, ipfsUrl, owner, listed, category, traits, txHash } = req.body;

  if (!name || !description || !ipfsUrl || !owner) {
    throw new AppError('Missing required fields', 400);
  }

  // Get next tokenId (incremented counter)
  const lastNFT = await prisma.nFT.findFirst({
    orderBy: { tokenId: 'desc' },
  });
  const tokenId = (lastNFT?.tokenId || 0) + 1;

  const nft = await prisma.nFT.create({
    data: {
      tokenId,
      name: name.trim(),
      description: description.trim(),
      price: price?.toString() || '0',
      ipfsUrl,
      owner: owner.toLowerCase(),
      listed: Boolean(listed),
      category: category || 'Art',
      traits: traits ? JSON.stringify(traits) : null,
      txHash,
    },
  });

  res.status(201).json(nft);
});

// ── POST /api/nfts/list ───────────────────────────────────────
/**
 * listNFT — Update NFT listing status and price.
 * Increments listedNFTs metric if this is the first time listing.
 */
export const listNFT = asyncHandler(async (req, res) => {
  const { tokenId, price, category, listingId } = req.body;

  if (!tokenId || !price) {
    throw new AppError('tokenId and price are required', 400);
  }

  const nft = await prisma.nFT.findUnique({
    where: { tokenId: parseInt(tokenId) },
  });

  if (!nft) throw new AppError('NFT not found', 404);

  const wasListed = nft.listed;

  const updated = await prisma.nFT.update({
    where: { tokenId: parseInt(tokenId) },
    data: {
      listed: true,
      price: price.toString(),
      category: category || nft.category,
      listingId: listingId ? parseInt(listingId) : null,
    },
  });

  // Increment metrics only if newly listed
  if (!wasListed) {
    await incrementListedCount(1);
  }

  res.json(updated);
});

// ── POST /api/nfts/buy ────────────────────────────────────────
/**
 * buyNFT — Update NFT ownership after purchase.
 * Decrements listedNFTs metric and records sale volume.
 */
export const buyNFT = asyncHandler(async (req, res) => {
  const { tokenId, listingId, newOwner, txHash } = req.body;

  if (!tokenId || !newOwner) {
    throw new AppError('tokenId and newOwner are required', 400);
  }

  const nft = await prisma.nFT.findUnique({
    where: { tokenId: parseInt(tokenId) },
  });

  if (!nft) throw new AppError('NFT not found', 404);

  const updated = await prisma.nFT.update({
    where: { tokenId: parseInt(tokenId) },
    data: {
      owner: newOwner.toLowerCase(),
      listed: false,
      listingId: null,
      txHash: txHash || nft.txHash,
    },
  });

  // Decrement metrics
  if (nft.listed) {
    await decrementListedCount(1);
  }

  // Record sale volume
  if (nft.price) {
    await recordSale(nft.price);
  }

  res.json(updated);
});

// ── POST /api/nfts/cancel-listing ─────────────────────────────
/**
 * cancelListing — Delist an NFT.
 * Decrements listedNFTs metric.
 */
export const cancelListing = asyncHandler(async (req, res) => {
  const { tokenId } = req.body;

  if (!tokenId) throw new AppError('tokenId is required', 400);

  const nft = await prisma.nFT.findUnique({
    where: { tokenId: parseInt(tokenId) },
  });

  if (!nft) throw new AppError('NFT not found', 404);

  const updated = await prisma.nFT.update({
    where: { tokenId: parseInt(tokenId) },
    data: {
      listed: false,
      listingId: null,
    },
  });

  // Decrement metrics
  if (nft.listed) {
    await decrementListedCount(1);
  }

  res.json(updated);
});
