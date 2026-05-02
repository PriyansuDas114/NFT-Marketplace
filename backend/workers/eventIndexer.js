import { ethers } from 'ethers';
import { prisma } from '../config/db.js';
import { incrementListedCount, decrementListedCount, recordSale } from '../controllers/metricsController.js';

/**
 * Event Indexer Worker
 * 
 * Listens to blockchain events (ItemListed, ItemSold, ItemCanceled)
 * and syncs them to the PostgreSQL database.
 * 
 * This keeps the DB in sync with on-chain state and maintains metrics.
 */

const MARKETPLACE_ADDRESS = process.env.VITE_MARKETPLACE_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const NFT_ADDRESS = process.env.VITE_NFT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Simple marketplace ABI with only the events we need
const MARKETPLACE_ABI = [
  'event ItemListed(uint256 indexed itemId, address indexed seller, address indexed nftAddress, uint256 tokenId, uint256 price)',
  'event ItemSold(uint256 indexed itemId, address indexed buyer, address indexed nftAddress, uint256 tokenId, uint256 price)',
  'event ItemCanceled(uint256 indexed itemId)',
];

// Event handlers
const handlers = {
  ItemListed: async (itemId, seller, nftAddress, tokenId, price) => {
    console.log(`[Event] ItemListed: itemId=${itemId}, seller=${seller}, tokenId=${tokenId}, price=${ethers.formatEther(price)}`);
    
    try {
      const nft = await prisma.nFT.findUnique({
        where: { tokenId: parseInt(tokenId) },
      });

      if (!nft) {
        console.warn(`  NFT with tokenId ${tokenId} not found in DB. Skipping.`);
        return;
      }

      // Update listing info
      const wasListed = nft.listed;
      await prisma.nFT.update({
        where: { tokenId: parseInt(tokenId) },
        data: {
          listed: true,
          listingId: parseInt(itemId),
          price: ethers.formatEther(price),
          owner: seller.toLowerCase(),
        },
      });

      // Increment metrics if newly listed
      if (!wasListed) {
        await incrementListedCount(1);
        console.log(`  ✓ Listed count incremented`);
      }
    } catch (err) {
      console.error('  ✗ Handler error:', err.message);
    }
  },

  ItemSold: async (itemId, buyer, nftAddress, tokenId, price) => {
    console.log(`[Event] ItemSold: itemId=${itemId}, buyer=${buyer}, tokenId=${tokenId}, price=${ethers.formatEther(price)}`);
    
    try {
      const nft = await prisma.nFT.findUnique({
        where: { tokenId: parseInt(tokenId) },
      });

      if (!nft) {
        console.warn(`  NFT with tokenId ${tokenId} not found in DB. Skipping.`);
        return;
      }

      // Update ownership and delist
      await prisma.nFT.update({
        where: { tokenId: parseInt(tokenId) },
        data: {
          owner: buyer.toLowerCase(),
          listed: false,
          listingId: null,
        },
      });

      // Decrement metrics
      if (nft.listed) {
        await decrementListedCount(1);
        console.log(`  ✓ Listed count decremented`);
      }

      // Record sale
      await recordSale(ethers.formatEther(price));
      console.log(`  ✓ Sale recorded: ${ethers.formatEther(price)} ETH`);
    } catch (err) {
      console.error('  ✗ Handler error:', err.message);
    }
  },

  ItemCanceled: async (itemId) => {
    console.log(`[Event] ItemCanceled: itemId=${itemId}`);
    
    try {
      const nft = await prisma.nFT.findUnique({
        where: { listingId: parseInt(itemId) },
      });

      if (!nft) {
        console.warn(`  NFT with listingId ${itemId} not found in DB. Skipping.`);
        return;
      }

      // Delist
      if (nft.listed) {
        await prisma.nFT.update({
          where: { id: nft.id },
          data: {
            listed: false,
            listingId: null,
          },
        });

        // Decrement metrics
        await decrementListedCount(1);
        console.log(`  ✓ Delisted, listed count decremented`);
      }
    } catch (err) {
      console.error('  ✗ Handler error:', err.message);
    }
  },
};

/**
 * Start the event indexer
 * Attaches listeners to the marketplace contract
 */
export const startEventIndexer = async (provider) => {
  if (!provider) {
    console.error('Event indexer: No provider given');
    return;
  }

  try {
    console.log('Starting event indexer...');
    
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

    // Listen for ItemListed events
    marketplace.on('ItemListed', async (itemId, seller, nftAddress, tokenId, price) => {
      await handlers.ItemListed(itemId, seller, nftAddress, tokenId, price);
    });
    console.log('✓ Listening for ItemListed events');

    // Listen for ItemSold events
    marketplace.on('ItemSold', async (itemId, buyer, nftAddress, tokenId, price) => {
      await handlers.ItemSold(itemId, buyer, nftAddress, tokenId, price);
    });
    console.log('✓ Listening for ItemSold events');

    // Listen for ItemCanceled events
    marketplace.on('ItemCanceled', async (itemId) => {
      await handlers.ItemCanceled(itemId);
    });
    console.log('✓ Listening for ItemCanceled events');

    console.log('Event indexer started successfully\n');
  } catch (err) {
    console.error('Failed to start event indexer:', err.message);
  }
};

/**
 * Stop the event indexer
 * Removes all listeners
 */
export const stopEventIndexer = async (provider) => {
  if (!provider) return;

  try {
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
    marketplace.removeAllListeners();
    console.log('Event indexer stopped');
  } catch (err) {
    console.error('Failed to stop event indexer:', err.message);
  }
};

export default { startEventIndexer, stopEventIndexer };
