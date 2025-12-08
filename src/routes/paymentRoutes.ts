import { Router } from 'express';
import { createPayment, handleMoneySpaceWebhook, handleMoneyspecWebhook } from '../controllers/paymentController';

const router = Router();

router.post('/create', createPayment);
router.post('/moneyspace/webhook', handleMoneySpaceWebhook);
router.post('/moneyspec/webhook', handleMoneyspecWebhook);

export { router as paymentRoutes };

