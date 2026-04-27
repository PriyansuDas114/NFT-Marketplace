-- CreateTable
CREATE TABLE "NFT" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "image" TEXT NOT NULL,
    "ipfsUrl" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "listed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NFT_pkey" PRIMARY KEY ("id")
);
