import { prisma } from '../config/db.js';

/**
 * userModel — Prisma-based user management
 */

export const findOrCreateUser = async (address) => {
  let user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        address: address.toLowerCase(),
      },
    });
  }

  return user;
};

export const getUserByAddress = async (address) => {
  return prisma.user.findUnique({
    where: { address: address.toLowerCase() },
  });
};

export const updateUser = async (address, data) => {
  return prisma.user.update({
    where: { address: address.toLowerCase() },
    data,
  });
};
