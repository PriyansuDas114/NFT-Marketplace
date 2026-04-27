import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const saveNFT = async (nft) => {
  return await prisma.nFT.create({
    data: {
      name: nft.name,
      description: nft.description,
      price: parseFloat(nft.price),
      image: nft.image,
      ipfsUrl: nft.ipfsUrl,
      owner: nft.owner,
      listed: nft.listed ?? false
    }
  });
};

export const listNFT = async (tokenId, price) => {
  return await prisma.nFT.update({
    where: { tokenId },
    data: {
      listed: true,
      price: parseFloat(price)
    }
  });
};

export const getAllNFTs = async () => {
  return await prisma.nFT.findMany({ orderBy: { createdAt: 'desc' } });
};

export const getListedNFTs = async () => {
  return await prisma.nFT.findMany({
    where: { listed: true },
    orderBy: { createdAt: 'desc' }
  });
};