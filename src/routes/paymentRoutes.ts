import { Router } from 'express';
import { createPayment, handleMoneySpaceWebhook } from '../controllers/paymentController';

const router = Router();

router.post('/create', createPayment);
router.post('/moneyspace/webhook', handleMoneySpaceWebhook);

export { router as paymentRoutes };

