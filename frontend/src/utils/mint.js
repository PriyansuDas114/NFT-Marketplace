import { ethers } from 'ethers';
import NFT_ABI from '../abis/NFT.json';

const NFT_CONTRACT_ADDRESS =
  import.meta.env.VITE_NFT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

/**
 * Mint an NFT on-chain using ethers v6 BrowserProvider.
 * @param {string} tokenURI - IPFS metadata URI
 * @returns {ethers.TransactionReceipt}
 */
export const mintNFTOnContract = async (tokenURI) => {
  if (!window.ethereum) throw new Error('No Ethereum wallet detected. Install MetaMask.');

  const provider   = new ethers.BrowserProvider(window.ethereum);
  const signer     = await provider.getSigner();
  const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

  const tx      = await nftContract.mintNFT(tokenURI);
  const receipt = await tx.wait();
  return receipt;
};
