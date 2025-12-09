import { Router } from 'express';
import { getActivePromotions } from '../controllers/promotionController';

const router = Router();

// Public route - no authentication required
router.get('/', getActivePromotions);

export { router as promotionRoutes };

