import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getMetrics = async () => {
  const [mintedNFTs, totalVolume, activeUsers, listedNFTs] = await Promise.all([
    prisma.nFT.count(),
    prisma.nFT.aggregate({ _sum: { price: true } }),
    prisma.nFT.findMany({ distinct: ['owner'] }),
    prisma.nFT.count({ where: { listed: true } }),
  ]);

  return {
    mintedNFTs,
    totalVolume: totalVolume._sum.price || 0,
    activeUsers: activeUsers.length,
    listedNFTs
  };
};
