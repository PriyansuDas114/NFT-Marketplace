import { ethers } from 'ethers';
import { resolveIPFS } from './ipfs';

/**
 * Fetch all NFTs owned by the connected wallet.
 * Requires an ERC721Enumerable contract.
 *
 * @param {ethers.Provider} provider
 * @param {ethers.Contract} nftContract - Must support balanceOf, tokenOfOwnerByIndex, tokenURI
 * @returns {Array<{ tokenId: string, name: string, image: string, description: string }>}
 */
export const getOwnedNFTs = async (provider, nftContract) => {
  const signer  = await provider.getSigner();
  const address = await signer.getAddress();
  const balance = await nftContract.balanceOf(address);
  const total   = Number(balance);

  const results = await Promise.allSettled(
    Array.from({ length: total }, (_, i) =>
      nftContract.tokenOfOwnerByIndex(address, i).then(async (tokenId) => {
        const uri  = await nftContract.tokenURI(tokenId);
        const url  = resolveIPFS(uri);
        const meta = await fetch(url).then(r => r.json());
        return {
          tokenId: tokenId.toString(),
          name:    meta.name        || `Token #${tokenId}`,
          image:   resolveIPFS(meta.image),
          description: meta.description || '',
          attributes: meta.attributes  || [],
        };
      })
    )
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
};

/**
 * Shorten an Ethereum address for display.
 * @param {string} address
 * @param {number} [chars=4]
 * @returns {string}
 */
export const shortAddress = (address, chars = 4) => {
  if (!address) return '';
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
};

/**
 * Format ETH value with symbol.
 * @param {string|number} wei
 * @returns {string}
 */
export const formatETH = (wei) => {
  try {
    return `Ξ ${parseFloat(ethers.formatEther(wei.toString())).toFixed(4)}`;
  } catch {
    return '—';
  }
};
