import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── GET /api/users/:address ───────────────────────────────
export const getUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { address: req.params.address.toLowerCase() },
  });

  if (!user) throw new AppError('User not found', 404);
  res.json(user);
});

// ── POST /api/users ───────────────────────────────────────
/**
 * createUser — Register or retrieve existing user
 */
export const createUser = asyncHandler(async (req, res) => {
  const { address, username } = req.body;

  if (!address) throw new AppError('Address is required', 400);

  let user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        address: address.toLowerCase(),
        username,
      },
    });
  }

  res.status(201).json(user);
});

// ── PATCH /api/users/:address ─────────────────────────────
/**
 * updateUser — Update user profile
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { username, avatar, bio, website, social } = req.body;

  const user = await prisma.user.update({
    where: { address: req.params.address.toLowerCase() },
    data: {
      ...(username && { username }),
      ...(avatar && { avatar }),
      ...(bio && { bio }),
      ...(website && { website }),
      ...(social && { social: typeof social === 'string' ? social : JSON.stringify(social) }),
    },
  });

  res.json(user);
});

// ── GET /api/users ────────────────────────────────────────
/**
 * getAllUsers — List all users (paginated)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  res.json({
    users,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

// ── GET /api/users/:address (alias for userRoutes) ────────
/**
 * getUserProfile — Get user profile + their NFTs
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const { address } = req.params;

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new AppError('Invalid Ethereum address', 400);
  }

  const user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
  });

  res.json(user || { address: address.toLowerCase() });
});

// ── PATCH /api/users/:address (alias for userRoutes) ────────
/**
 * updateUserProfile — Update user profile
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { address } = req.params;
  const { username, avatar, bio, website, social } = req.body;

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new AppError('Invalid Ethereum address', 400);
  }

  // Ensure user exists
  let user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { address: address.toLowerCase() },
    });
  }

  const updated = await prisma.user.update({
    where: { address: address.toLowerCase() },
    data: {
      ...(username && { username }),
      ...(avatar && { avatar }),
      ...(bio && { bio }),
      ...(website && { website }),
      ...(social && { social: typeof social === 'string' ? social : JSON.stringify(social) }),
    },
  });

  res.json(updated);
});

// ── GET /api/users/:address/nfts ────────────────────────────
/**
 * getUserNFTs — Get NFTs owned by user
 */
export const getUserNFTs = asyncHandler(async (req, res) => {
  const { address } = req.params;

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new AppError('Invalid Ethereum address', 400);
  }

  const nfts = await prisma.nFT.findMany({
    where: { owner: address.toLowerCase() },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json(nfts);
});
