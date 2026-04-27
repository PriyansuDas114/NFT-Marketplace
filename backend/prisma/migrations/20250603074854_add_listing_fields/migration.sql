/*
  Warnings:

  - A unique constraint covering the columns `[tokenId]` on the table `NFT` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tokenId` to the `NFT` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NFT" ADD COLUMN     "tokenId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "NFT_tokenId_key" ON "NFT"("tokenId");
