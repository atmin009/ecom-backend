import { Router } from 'express';
import { getThailandAddresses } from '../controllers/addressController';

const router = Router();

router.get('/thailand', getThailandAddresses);

export { router as addressRoutes };

