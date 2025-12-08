-- E-commerce Checkout System Database Schema
-- MySQL

-- Categories table
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

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description TEXT,
  logo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_brands_active (is_active),
  INDEX idx_brands_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products table
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
  INDEX idx_products_category (category_id),
  INDEX idx_products_brand (brand_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders table
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

-- Order items table
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

-- OTP requests table
CREATE TABLE IF NOT EXISTS otp_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp_code VARCHAR(255) NOT NULL COMMENT 'hashed',
  expires_at TIMESTAMP NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_requests_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments table
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

-- SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('otp', 'order_created', 'payment_success', 'other') NOT NULL,
  status ENUM('sent', 'failed') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thai address tables (optional - can use static JSON instead)
CREATE TABLE IF NOT EXISTS provinces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS districts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  province_id INT NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  FOREIGN KEY (province_id) REFERENCES provinces(id),
  INDEX idx_districts_province_id (province_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subdistricts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  district_id INT NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  FOREIGN KEY (district_id) REFERENCES districts(id),
  INDEX idx_subdistricts_district_id (district_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Sample data (optional)
-- Note: category_id and brand_id should reference existing categories and brands
INSERT INTO products (name, sku, price, description_short, image_url, is_active, is_free_gift, category_id, brand_id) VALUES
  ('Product 1', 'PROD-001', 500.00, 'Description for product 1', 'https://via.placeholder.com/300', true, false, 1, 1),
  ('Product 2', 'PROD-002', 750.00, 'Description for product 2', 'https://via.placeholder.com/300', true, false, 1, 2),
  ('Product 3', 'PROD-003', 1200.00, 'Description for product 3', 'https://via.placeholder.com/300', true, false, 2, 1),
  ('Free Gift', 'GIFT-001', 0.00, 'Free gift item', 'https://via.placeholder.com/300', true, true, NULL, NULL)
ON DUPLICATE KEY UPDATE sku=sku;

