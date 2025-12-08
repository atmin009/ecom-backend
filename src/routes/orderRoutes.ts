import { Router } from 'express';
import { createOrder, getOrderById } from '../controllers/orderController';

const router = Router();

router.post('/', createOrder);
router.get('/:orderId', getOrderById);

export { router as orderRoutes };

