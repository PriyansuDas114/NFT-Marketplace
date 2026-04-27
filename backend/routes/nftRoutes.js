import express from 'express';
import { mintNFT, fetchNFTs, fetchListedNFTs, listNFTForSale } from '../controllers/nftController.js';

const router = express.Router();

router.post('/mint', mintNFT);
router.get('/', fetchNFTs);
router.get('/listed', fetchListedNFTs);
router.post('/list',listNFTForSale);

export default router;
