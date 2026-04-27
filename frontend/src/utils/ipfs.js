/**
 * IPFS upload utility.
 *
 * Uses nft.storage to pin image + metadata.
 * Replace NFT_STORAGE_TOKEN with a real token from https://nft.storage
 *
 * ⚠️  Never commit real tokens to source control — use VITE_NFT_STORAGE_TOKEN env var.
 */
import { NFTStorage, File } from 'nft.storage';

const NFT_STORAGE_TOKEN = import.meta.env.VITE_NFT_STORAGE_TOKEN || 'YOUR_TOKEN_HERE';

/**
 * Upload an image file and metadata to IPFS via nft.storage.
 * @param {File}   imageFile
 * @param {{ name: string, description: string, attributes?: any[] }} metadata
 * @returns {string} Full IPFS gateway URL to the metadata JSON
 */
export const uploadToIPFS = async (imageFile, metadata) => {
  if (!NFT_STORAGE_TOKEN || NFT_STORAGE_TOKEN === 'YOUR_TOKEN_HERE') {
    throw new Error('VITE_NFT_STORAGE_TOKEN is not set. See utils/ipfs.js.');
  }

  const client = new NFTStorage({ token: NFT_STORAGE_TOKEN });

  const stored = await client.store({
    name:        metadata.name,
    description: metadata.description,
    image:       new File([imageFile], imageFile.name, { type: imageFile.type }),
    attributes:  metadata.attributes || [],
  });

  const url = `https://ipfs.io/ipfs/${stored.ipnft}/metadata.json`;
  console.info('[IPFS] Stored at:', url);
  return url;
};

/**
 * Resolve an IPFS URI to an HTTP gateway URL (handles ipfs:// prefix).
 * @param {string} uri
 * @param {string} [gateway]
 * @returns {string}
 */
export const resolveIPFS = (uri, gateway = 'https://ipfs.io') => {
  if (!uri) return '';
  if (uri.startsWith('ipfs://')) return `${gateway}/ipfs/${uri.slice(7)}`;
  if (uri.startsWith('http'))    return uri;
  return `${gateway}/ipfs/${uri}`;
};
