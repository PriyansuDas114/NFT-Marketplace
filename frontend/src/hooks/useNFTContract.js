import { useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import marketplaceAbi from '../abis/Marketplace.json';
import nftAbi from '../abis/NFT.json';

const MARKETPLACE_ADDRESS = import.meta.env.VITE_MARKETPLACE_ADDRESS
  || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

const NFT_ADDRESS = import.meta.env.VITE_NFT_ADDRESS
  || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// ─────────────────────────────────────────────────────────────
//  useNFTContract
//
//  Returns memoised ethers.Contract instances for both the
//  NFT and Marketplace contracts, plus high-level action
//  helpers that handle the full tx lifecycle.
//
//  All instances are null when wallet is not connected.
// ─────────────────────────────────────────────────────────────

export const useNFTContract = () => {
  const { signer, provider } = useWallet();

  // Read-only contracts (use provider — no signer needed)
  const marketplaceRead = useMemo(() => {
    if (!provider) return null;
    return new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceAbi, provider);
  }, [provider]);

  const nftRead = useMemo(() => {
    if (!provider) return null;
    return new ethers.Contract(NFT_ADDRESS, nftAbi, provider);
  }, [provider]);

  // Write contracts (need signer for transactions)
  const marketplace = useMemo(() => {
    if (!signer) return null;
    return new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceAbi, signer);
  }, [signer]);

  const nftContract = useMemo(() => {
    if (!signer) return null;
    return new ethers.Contract(NFT_ADDRESS, nftAbi, signer);
  }, [signer]);

  // ── High-level actions ─────────────────────────────────────

  /**
   * Mint a new NFT and optionally list it in one flow.
   * @param {string}  tokenURI   - IPFS metadata URI
   * @param {string}  [priceEth] - If provided, also list at this price
   * @returns {{ tokenId: bigint, listingId?: bigint }}
   */
  const mintNFT = useCallback(async (tokenURI, priceEth = null) => {
    if (!nftContract) throw new Error('Wallet not connected');

    const mintFee = await nftContract.mintingFee();
    const mintTx  = await nftContract.mintNFT(tokenURI, { value: mintFee });
    const receipt = await mintTx.wait();

    // Parse NFTMinted event to get tokenId
    const mintedEvent = receipt.logs
      .map(log => { try { return nftContract.interface.parseLog(log); } catch { return null; } })
      .find(e => e?.name === 'NFTMinted');

    const tokenId = mintedEvent?.args?.tokenId ?? (await nftContract.tokenCounter()) - 1n;

    if (!priceEth) return { tokenId };

    // List after mint
    await (await nftContract.approve(MARKETPLACE_ADDRESS, tokenId)).wait();
    const listTx  = await marketplace.listItem(
      NFT_ADDRESS,
      tokenId,
      ethers.parseEther(priceEth),
    );
    const listReceipt = await listTx.wait();

    const listedEvent = listReceipt.logs
      .map(log => { try { return marketplace.interface.parseLog(log); } catch { return null; } })
      .find(e => e?.name === 'ItemListed');

    return { tokenId, listingId: listedEvent?.args?.listingId };
  }, [nftContract, marketplace]);

  /**
   * List an existing NFT on the marketplace.
   * Approves marketplace first if needed.
   */
  const listNFT = useCallback(async (tokenId, priceEth) => {
    if (!nftContract || !marketplace) throw new Error('Wallet not connected');

    const approved = await nftContract.getApproved(tokenId);
    const isApproved = approved.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase();

    if (!isApproved) {
      await (await nftContract.approve(MARKETPLACE_ADDRESS, tokenId)).wait();
    }

    const tx = await marketplace.listItem(
      NFT_ADDRESS,
      tokenId,
      ethers.parseEther(String(priceEth)),
    );
    const receipt = await tx.wait();

    const event = receipt.logs
      .map(log => { try { return marketplace.interface.parseLog(log); } catch { return null; } })
      .find(e => e?.name === 'ItemListed');

    return event?.args?.listingId;
  }, [nftContract, marketplace]);

  /**
   * Buy a listed NFT.
   */
  const buyNFT = useCallback(async (listingId, priceEth) => {
    if (!marketplace) throw new Error('Wallet not connected');
    const tx = await marketplace.buyItem(listingId, {
      value: ethers.parseEther(String(priceEth)),
    });
    return tx.wait();
  }, [marketplace]);

  /**
   * Cancel a listing.
   */
  const cancelListing = useCallback(async (listingId) => {
    if (!marketplace) throw new Error('Wallet not connected');
    return (await marketplace.cancelItem(listingId)).wait();
  }, [marketplace]);

  /**
   * Withdraw seller proceeds.
   */
  const withdrawProceeds = useCallback(async () => {
    if (!marketplace) throw new Error('Wallet not connected');
    return (await marketplace.withdrawProceeds()).wait();
  }, [marketplace]);

  /**
   * Preview fee breakdown for a sale — calls the contract view fn.
   */
  const previewFees = useCallback(async (tokenId, priceEth) => {
    if (!marketplaceRead) return null;
    const [royaltyReceiver, royaltyAmount, platformFee, sellerAmount] =
      await marketplaceRead.previewSaleFees(
        NFT_ADDRESS, tokenId, ethers.parseEther(String(priceEth)),
      );
    return {
      royaltyReceiver,
      royaltyAmount:  ethers.formatEther(royaltyAmount),
      platformFee:    ethers.formatEther(platformFee),
      sellerAmount:   ethers.formatEther(sellerAmount),
    };
  }, [marketplaceRead]);

  return {
    // Raw contract instances (for advanced usage)
    marketplace,
    marketplaceRead,
    nftContract,
    nftRead,
    // Addresses
    MARKETPLACE_ADDRESS,
    NFT_ADDRESS,
    // Action helpers
    mintNFT,
    listNFT,
    buyNFT,
    cancelListing,
    withdrawProceeds,
    previewFees,
  };
};

export default useNFTContract;
