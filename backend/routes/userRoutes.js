import { Router } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getUserNFTs,
} from '../controllers/userController.js';
import { requireWallet } from '../middleware/auth.js';
import { apiLimiter }    from '../middleware/rateLimit.js';

const router = Router();

router.get('/:address',       apiLimiter, getUserProfile);
router.get('/:address/nfts',  apiLimiter, getUserNFTs);
router.patch('/:address',     requireWallet, updateUserProfile);

export default router;
