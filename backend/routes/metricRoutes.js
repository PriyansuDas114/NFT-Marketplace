import { Router } from 'express';
import { getMetrics, recomputeMetrics } from '../controllers/metricsController.js';
import { requireWallet } from '../middleware/auth.js';

const router = Router();

// Public read
router.get('/', getMetrics);

// Owner-only recompute (add onlyOwner check for production)
router.post('/recompute', requireWallet, recomputeMetrics);

export default router;
