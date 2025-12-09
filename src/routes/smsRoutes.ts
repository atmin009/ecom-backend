import { Router } from 'express';
import { sendPaymentSuccessSms } from '../controllers/smsController';

const router = Router();

router.post('/payment-success', sendPaymentSuccessSms);

export { router as smsRoutes };

