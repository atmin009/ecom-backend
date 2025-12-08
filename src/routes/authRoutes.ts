import { Router } from 'express';
import { requestOTP, verifyOTP } from '../controllers/authController';

const router = Router();

router.post('/otp/request', requestOTP);
router.post('/otp/verify', verifyOTP);

export { router as authRoutes };

