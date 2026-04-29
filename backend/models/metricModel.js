import { prisma } from '../config/db.js';

/**
 * metricModel — Prisma-based metrics management
 */

export const getOrCreateMetrics = async () => {
  let metric = await prisma.metric.findFirst();
  if (!metric) {
    metric = await prisma.metric.create({
      data: {},
    });
  }
  return metric;
};

export const updateMetrics = async (updates) => {
  const metric = await getOrCreateMetrics();
  return prisma.metric.update({
    where: { id: metric.id },
    data: updates,
  });
};

export const incrementListedCount = async () => {
  const metric = await getOrCreateMetrics();
  return prisma.metric.update({
    where: { id: metric.id },
    data: { listedNFTs: { increment: 1 } },
  });
};

export const decrementListedCount = async () => {
  const metric = await getOrCreateMetrics();
  return prisma.metric.update({
    where: { id: metric.id },
    data: { listedNFTs: { increment: -1 } },
  });
};
