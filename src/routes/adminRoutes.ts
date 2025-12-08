import { Router } from 'express';
import { authenticateAdmin } from '../middlewares/authMiddleware';
import { adminLogin, getCurrentAdmin, changePassword } from '../controllers/adminAuthController';
import {
  getAdminProducts,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
} from '../controllers/adminProductController';
import {
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
} from '../controllers/adminOrderController';
import {
  getAdminPromotions,
  getAdminPromotionById,
  createAdminPromotion,
  updateAdminPromotion,
  deleteAdminPromotion,
} from '../controllers/adminPromotionController';
import {
  getAdminCategories,
  getAdminCategoryById,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from '../controllers/adminCategoryController';
import {
  getAdminBrands,
  getAdminBrandById,
  createAdminBrand,
  updateAdminBrand,
  deleteAdminBrand,
} from '../controllers/adminBrandController';
import {
  exportProducts,
  exportProductsTemplate,
  importProducts,
  upload,
} from '../controllers/adminProductImportExportController';

const router = Router();

// Auth routes (no authentication required)
router.post('/auth/login', adminLogin);
router.get('/auth/me', authenticateAdmin, getCurrentAdmin);
router.post('/auth/change-password', authenticateAdmin, changePassword);

// Product routes (require authentication)
router.get('/products', authenticateAdmin, getAdminProducts);
router.get('/products/:id', authenticateAdmin, getAdminProductById);
router.post('/products', authenticateAdmin, createAdminProduct);
router.put('/products/:id', authenticateAdmin, updateAdminProduct);
router.delete('/products/:id', authenticateAdmin, deleteAdminProduct);

// Order routes (require authentication)
router.get('/orders', authenticateAdmin, getAdminOrders);
router.get('/orders/:id', authenticateAdmin, getAdminOrderById);
router.put('/orders/:id/status', authenticateAdmin, updateOrderStatus);

// Promotion routes (require authentication)
router.get('/promotions', authenticateAdmin, getAdminPromotions);
router.get('/promotions/:id', authenticateAdmin, getAdminPromotionById);
router.post('/promotions', authenticateAdmin, createAdminPromotion);
router.put('/promotions/:id', authenticateAdmin, updateAdminPromotion);
router.delete('/promotions/:id', authenticateAdmin, deleteAdminPromotion);

// Category routes (require authentication)
router.get('/categories', authenticateAdmin, getAdminCategories);
router.get('/categories/:id', authenticateAdmin, getAdminCategoryById);
router.post('/categories', authenticateAdmin, createAdminCategory);
router.put('/categories/:id', authenticateAdmin, updateAdminCategory);
router.delete('/categories/:id', authenticateAdmin, deleteAdminCategory);

// Brand routes (require authentication)
router.get('/brands', authenticateAdmin, getAdminBrands);
router.get('/brands/:id', authenticateAdmin, getAdminBrandById);
router.post('/brands', authenticateAdmin, createAdminBrand);
router.put('/brands/:id', authenticateAdmin, updateAdminBrand);
router.delete('/brands/:id', authenticateAdmin, deleteAdminBrand);

// Product Import/Export routes
router.get('/products/export/template', authenticateAdmin, exportProductsTemplate);
router.post('/products/import', authenticateAdmin, upload.single('file'), importProducts);
router.get('/products/export', authenticateAdmin, exportProducts);

export default router;

