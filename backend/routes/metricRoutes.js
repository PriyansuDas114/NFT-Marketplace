import express from 'express';
import { fetchMetrics } from '../controllers/metricsController.js';

const router = express.Router();

router.get('/', fetchMetrics);

export default router;
