/**
 * constants.js — shared application constants.
 *
 * Contract addresses come from env; these are fallbacks for local Hardhat.
 * Never commit real mainnet/testnet addresses here — use .env.
 */
export const CONTRACT = {
  MARKETPLACE: process.env.MARKETPLACE_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  NFT:         process.env.NFT_ADDRESS         || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
};

export const CHAIN = {
  HARDHAT:  31337,
  SEPOLIA:  11155111,
  MAINNET:  1,
};

export const NFT_CATEGORIES = ['Art', 'Gaming', 'Music', 'Domains', 'Sports'];

export const PAGINATION = {
  DEFAULT_PAGE:  1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT:     100,
};
