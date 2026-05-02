import { prisma } from '../config/db.js';

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ────────────────────────────────────────────────────────────
//  Internal Helpers (used by other controllers)
// ────────────────────────────────────────────────────────────

/**
 * Increment the listed NFT count
 */
export const incrementListedCount = async (amount = 1) => {
  let metric = await prisma.metric.findFirst();
  if (!metric) {
    metric = await prisma.metric.create({ data: { listedNFTs: amount } });
  } else {
    metric = await prisma.metric.update({
      where: { id: metric.id },
      data: { listedNFTs: metric.listedNFTs + amount },
    });
  }
  return metric;
};

/**
 * Decrement the listed NFT count
 */
export const decrementListedCount = async (amount = 1) => {
  let metric = await prisma.metric.findFirst();
  if (!metric) {
    metric = await prisma.metric.create({ data: { listedNFTs: Math.max(0, -amount) } });
  } else {
    metric = await prisma.metric.update({
      where: { id: metric.id },
      data: { listedNFTs: Math.max(0, metric.listedNFTs - amount) },
    });
  }
  return metric;
};

/**
 * Add to total sales volume and transaction count
 */
export const recordSale = async (priceEth) => {
  let metric = await prisma.metric.findFirst();
  if (!metric) {
    metric = await prisma.metric.create({
      data: {
        totalVolume: priceEth.toString(),
        totalTransactions: 1,
      },
    });
  } else {
    const newVolume = (parseFloat(metric.totalVolume) + parseFloat(priceEth)).toFixed(4);
    metric = await prisma.metric.update({
      where: { id: metric.id },
      data: {
        totalVolume: newVolume,
        totalTransactions: metric.totalTransactions + 1,
      },
    });
  }
  return metric;
};

// ────────────────────────────────────────────────────────────
//  API Endpoints
// ────────────────────────────────────────────────────────────

// ── GET /api/metrics ──────────────────────────────────────
export const getMetrics = asyncHandler(async (req, res) => {
  let metric = await prisma.metric.findFirst();
  if (!metric) {
    metric = await prisma.metric.create({ data: {} });
  }
  res.json(metric);
});

// ── POST /api/metrics/update ──────────────────────────────
export const updateMetrics = asyncHandler(async (req, res) => {
  const { totalNFTs, listedNFTs, totalVolume, floorPrice, avgPrice } = req.body;

  let metric = await prisma.metric.findFirst();
  if (!metric) {
    metric = await prisma.metric.create({ data: {} });
  }

  const updated = await prisma.metric.update({
    where: { id: metric.id },
    data: {
      ...(totalNFTs !== undefined && { totalNFTs }),
      ...(listedNFTs !== undefined && { listedNFTs }),
      ...(totalVolume && { totalVolume: totalVolume.toString() }),
      ...(floorPrice && { floorPrice: floorPrice.toString() }),
      ...(avgPrice && { avgPrice: avgPrice.toString() }),
    },
  });

  res.json(updated);
});

// ── POST /api/metrics/recompute ────────────────────────────
export const recomputeMetrics = asyncHandler(async (req, res) => {
  // Compute fresh metrics from database
  const totalNFTs = await prisma.nFT.count();
  const listedNFTs = await prisma.nFT.count({ where: { listed: true } });

  let metric = await prisma.metric.findFirst();
  if (!metric) {
    metric = await prisma.metric.create({ data: {} });
  }

  const updated = await prisma.metric.update({
    where: { id: metric.id },
    data: { totalNFTs, listedNFTs },
  });

  res.json(updated);
});
