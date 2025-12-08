-- Migration: Add Admin Users and Promotions System
-- สำหรับระบบจัดการหลังบ้าน

-- Admin Users table
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

-- Promotions table
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

-- Promotion Products (Many-to-Many: promotion สามารถใช้กับสินค้าหลายตัว)
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

-- Promotion Usage Log (บันทึกการใช้งานโปรโมชั่น)
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

-- Default admin user
-- ใช้ script createAdminUser.ts เพื่อสร้าง admin user
-- หรือรัน: npx ts-node backend/scripts/createAdminUser.ts admin admin123 admin@focusshield.com
-- 
-- Note: Password hash ต้องสร้างด้วย bcrypt.hashSync() ใน Node.js
-- ไม่ควรใส่ password hash โดยตรงใน SQL

