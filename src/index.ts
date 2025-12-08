import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import path from 'path';
import { productRoutes } from './routes/productRoutes';
import { authRoutes } from './routes/authRoutes';
import { orderRoutes } from './routes/orderRoutes';
import { paymentRoutes } from './routes/paymentRoutes';
import { addressRoutes } from './routes/addressRoutes';
import categoryRoutes from './routes/categoryRoutes';
import brandRoutes from './routes/brandRoutes';
import adminRoutes from './routes/adminRoutes';
import { handleMoneyspecWebhook } from './controllers/paymentController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - allow multiple origins for production
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://apis.tidfocus.com',
  'http://apis.tidfocus.com',
  // Add other production domains as needed
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now - tighten in production if needed
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Moneyspec-Signature'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (for debugging) - must be before routes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log(`  Headers:`, {
    origin: req.headers.origin,
    referer: req.headers.referer,
    'user-agent': req.headers['user-agent'],
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    routes: {
      products: '/api/products',
      categories: '/api/categories',
      brands: '/api/brands',
      orders: '/api/orders',
      payments: '/api/payments',
      addresses: '/api/addresses',
    }
  });
});

// Webhook routes (must be before /api routes to avoid conflicts)
// Support both /webhook.php and /api/webhook.php for Moneyspec
app.post('/webhook.php', handleMoneyspecWebhook);
app.post('/api/webhook.php', handleMoneyspecWebhook);

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/addresses', addressRoutes);

// Log registered routes (for debugging)
console.log('📋 Registered API Routes:');
console.log('  GET  /api/products');
console.log('  GET  /api/products/:id');
console.log('  GET  /api/categories');
console.log('  GET  /api/categories/:id');
console.log('  GET  /api/brands');
console.log('  GET  /api/brands/:id');
console.log('  POST /api/auth/otp/request');
console.log('  POST /api/auth/otp/verify');
console.log('  POST /api/orders');
console.log('  GET  /api/orders/:orderId');
console.log('  POST /api/payments/create');
console.log('  GET  /api/addresses/thailand');

// Admin API Routes
app.use('/api/admin', adminRoutes);

// 404 handler for unmatched routes
app.use((req, res, next) => {
  console.log(`⚠️  404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`✅ API endpoints available at: http://localhost:${PORT}/api/*`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ API health check: http://localhost:${PORT}/api/health`);
});

