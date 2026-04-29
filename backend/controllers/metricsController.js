import { prisma } from '../config/db.js';

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

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
