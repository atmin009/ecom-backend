-- =====================================================
-- E-commerce System - Complete Database Schema
-- ไฟล์นี้รวมทุกอย่างไว้ในไฟล์เดียวสำหรับสร้างฐานข้อมูลใหม่
-- MySQL 5.7+ / MariaDB 10.2+
-- =====================================================

-- =====================================================
-- 1. CATEGORIES - หมวดหมู่สินค้า
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description TEXT,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_categories_active (is_active),
  INDEX idx_categories_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. BRANDS - แบรนด์สินค้า (พร้อม hierarchical support)
-- =====================================================
CREATE TABLE IF NOT EXISTS brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NULL COMMENT 'สำหรับ hierarchical brands (เช่น Apple > iPhone > iPhone 17)',
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description TEXT,
  logo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES brands(id) ON DELETE SET NULL,
  INDEX idx_brands_active (is_active),
  INDEX idx_brands_sort (sort_order),
  INDEX idx_brands_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. PRODUCTS - สินค้า (พร้อม fields สำหรับฟิล์มกันรอย)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description_short TEXT,
  description_long TEXT,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  is_free_gift BOOLEAN DEFAULT false,
  category_id INT NULL,
  brand_id INT NULL,
  -- Fields สำหรับฟิล์มกันรอย
  device_model VARCHAR(255) NULL COMMENT 'รุ่นมือถือที่รองรับ (เช่น iPhone 15 Pro Max)',
  film_type VARCHAR(100) NULL COMMENT 'ประเภทฟิล์ม (Tempered Glass, Privacy, Anti-fingerprint)',
  screen_size VARCHAR(50) NULL COMMENT 'ขนาดหน้าจอ (เช่น 6.7 นิ้ว)',
  thickness VARCHAR(20) NULL COMMENT 'ความหนา (เช่น 0.33mm)',
  hardness VARCHAR(20) NULL COMMENT 'ความแข็ง (เช่น 9H)',
  features TEXT NULL COMMENT 'คุณสมบัติพิเศษ (JSON หรือ comma-separated)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
  INDEX idx_products_category (category_id),
  INDEX idx_products_brand (brand_id),
  INDEX idx_products_device_model (device_model),
  INDEX idx_products_film_type (film_type),
  INDEX idx_products_screen_size (screen_size)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. ORDERS - คำสั่งซื้อ
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  shipping_address_line TEXT NOT NULL,
  province VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  subdistrict VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
  fulfill_status ENUM('pending', 'processing', 'shipped', 'completed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_order_number (order_number),
  INDEX idx_orders_customer_phone (customer_phone),
  INDEX idx_orders_customer_email (customer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. ORDER_ITEMS - รายการสินค้าในคำสั่งซื้อ
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  is_free_gift BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_order_items_order_id (order_id),
  INDEX idx_order_items_product_id (product_id),
  CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. PAYMENTS - การชำระเงิน
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  gateway VARCHAR(50) NOT NULL,
  gateway_transaction_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  raw_response JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  INDEX idx_payments_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. OTP_REQUESTS - คำขอ OTP
-- =====================================================
CREATE TABLE IF NOT EXISTS otp_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp_code VARCHAR(255) NOT NULL COMMENT 'hashed',
  expires_at TIMESTAMP NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_requests_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 8. SMS_LOGS - บันทึกการส่ง SMS
-- =====================================================
CREATE TABLE IF NOT EXISTS sms_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('otp', 'order_created', 'payment_success', 'other') NOT NULL,
  status ENUM('sent', 'failed') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 9. PROVINCES - จังหวัด
-- =====================================================
CREATE TABLE IF NOT EXISTS provinces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 10. DISTRICTS - อำเภอ
-- =====================================================
CREATE TABLE IF NOT EXISTS districts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  province_id INT NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  FOREIGN KEY (province_id) REFERENCES provinces(id),
  INDEX idx_districts_province_id (province_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11. SUBDISTRICTS - ตำบล
-- =====================================================
CREATE TABLE IF NOT EXISTS subdistricts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  district_id INT NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  FOREIGN KEY (district_id) REFERENCES districts(id),
  INDEX idx_subdistricts_district_id (district_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 12. ADMIN_USERS - ผู้ดูแลระบบ
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed password',
  full_name VARCHAR(255),
  role ENUM('super_admin', 'admin', 'staff') DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admin_users_username (username),
  INDEX idx_admin_users_email (email),
  INDEX idx_admin_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 13. PROMOTIONS - โปรโมชั่น
-- =====================================================
CREATE TABLE IF NOT EXISTS promotions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  promotion_type ENUM('percentage', 'fixed_amount', 'buy_x_get_y', 'free_gift') NOT NULL,
  discount_value DECIMAL(10, 2) NULL COMMENT 'สำหรับ percentage หรือ fixed_amount',
  min_purchase_amount DECIMAL(10, 2) NULL COMMENT 'ยอดซื้อขั้นต่ำ',
  buy_quantity INT NULL COMMENT 'สำหรับ buy_x_get_y',
  get_quantity INT NULL COMMENT 'สำหรับ buy_x_get_y',
  free_gift_product_id INT NULL COMMENT 'สำหรับ free_gift',
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_limit INT NULL COMMENT 'จำนวนครั้งที่ใช้ได้ (NULL = ไม่จำกัด)',
  usage_count INT DEFAULT 0 COMMENT 'จำนวนครั้งที่ใช้แล้ว',
  created_by INT NULL COMMENT 'admin_user id',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (free_gift_product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  INDEX idx_promotions_active (is_active),
  INDEX idx_promotions_dates (start_date, end_date),
  INDEX idx_promotions_type (promotion_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 14. PROMOTION_PRODUCTS - สินค้าที่ใช้โปรโมชั่น (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS promotion_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  promotion_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_promotion_product (promotion_id, product_id),
  INDEX idx_promotion_products_promotion (promotion_id),
  INDEX idx_promotion_products_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 15. PROMOTION_USAGE_LOGS - บันทึกการใช้งานโปรโมชั่น
-- =====================================================
CREATE TABLE IF NOT EXISTS promotion_usage_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  promotion_id INT NOT NULL,
  order_id INT NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_promotion_usage_promotion (promotion_id),
  INDEX idx_promotion_usage_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SAMPLE DATA - ข้อมูลตัวอย่าง (Optional)
-- =====================================================

-- Sample categories
INSERT INTO categories (name, name_en, description, sort_order) VALUES
  ('แว่นกันแดด', 'Sunglasses', 'แว่นกันแดดทุกประเภท', 1),
  ('แว่นสายตา', 'Eyeglasses', 'แว่นสายตาทุกประเภท', 2),
  ('เลนส์', 'Lenses', 'เลนส์แว่นตาทุกประเภท', 3),
  ('อุปกรณ์เสริม', 'Accessories', 'อุปกรณ์เสริมสำหรับแว่นตา', 4)
ON DUPLICATE KEY UPDATE name=name;

-- Sample brands
INSERT INTO brands (name, name_en, description, sort_order) VALUES
  ('Focus Shield', 'Focus Shield', 'แบรนด์แว่นตาคุณภาพสูง', 1),
  ('Ray-Ban', 'Ray-Ban', 'แบรนด์แว่นตาชื่อดังระดับโลก', 2),
  ('Oakley', 'Oakley', 'แบรนด์แว่นกีฬาและแฟชั่น', 3),
  ('Gucci', 'Gucci', 'แบรนด์แว่นตาลักชูรี่', 4)
ON DUPLICATE KEY UPDATE name=name;

-- Sample products (optional)
-- Note: category_id and brand_id should reference existing categories and brands
INSERT INTO products (name, sku, price, description_short, image_url, is_active, is_free_gift, category_id, brand_id) VALUES
  ('Product 1', 'PROD-001', 500.00, 'Description for product 1', 'https://via.placeholder.com/300', true, false, 1, 1),
  ('Product 2', 'PROD-002', 750.00, 'Description for product 2', 'https://via.placeholder.com/300', true, false, 1, 2),
  ('Product 3', 'PROD-003', 1200.00, 'Description for product 3', 'https://via.placeholder.com/300', true, false, 2, 1),
  ('Free Gift', 'GIFT-001', 0.00, 'Free gift item', 'https://via.placeholder.com/300', true, true, NULL, NULL)
ON DUPLICATE KEY UPDATE sku=sku;

-- =====================================================
-- หมายเหตุสำคัญ
-- =====================================================
-- 1. Admin Users: ต้องสร้าง admin user ผ่าน script createAdminUser.ts
--    ไม่ควรใส่ password hash โดยตรงใน SQL
--    รัน: npx ts-node backend/scripts/createAdminUser.ts admin admin123 admin@focusshield.com
--
-- 2. Address Data: ต้อง import ข้อมูล provinces, districts, subdistricts 
--    จากไฟล์ address data (ดู import_address_data.sql)
--
-- 3. Brands Hierarchy: ตาราง brands มี parent_id สำหรับสร้าง hierarchical structure
--    (เช่น Apple > iPhone > iPhone 17 series)
--
-- 4. Film Products: ตาราง products มี fields เพิ่มเติมสำหรับฟิล์มกันรอย:
--    - device_model, film_type, screen_size, thickness, hardness, features
--
-- 5. Promotions: ระบบโปรโมชั่นรองรับหลายประเภท:
--    - percentage (ลดเปอร์เซ็นต์)
--    - fixed_amount (ลดจำนวนเงิน)
--    - buy_x_get_y (ซื้อ X แถม Y)
--    - free_gift (ของแถม)
