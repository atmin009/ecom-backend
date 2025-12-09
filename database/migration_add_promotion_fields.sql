-- Migration: Add Promotion Fields to Products Table
-- สำหรับระบบ countdown โปรโมชั่น
-- Safe version - checks if columns exist before adding
--
-- Usage: mysql -u root -p ecommerce < migration_add_promotion_fields.sql

-- ตรวจสอบและเพิ่ม promotion_price
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'promotion_price');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN promotion_price DECIMAL(10, 2) NULL COMMENT ''ราคาโปรโมชั่น'' AFTER price',
  'SELECT ''Column promotion_price already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ตรวจสอบและเพิ่ม promotion_start_date
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'promotion_start_date');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN promotion_start_date DATETIME NULL COMMENT ''วันที่เริ่มโปรโมชั่น'' AFTER promotion_price',
  'SELECT ''Column promotion_start_date already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ตรวจสอบและเพิ่ม promotion_end_date
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'promotion_end_date');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN promotion_end_date DATETIME NULL COMMENT ''วันที่สิ้นสุดโปรโมชั่น'' AFTER promotion_start_date',
  'SELECT ''Column promotion_end_date already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ตรวจสอบและเพิ่ม promotion_action
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'promotion_action');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN promotion_action ENUM(''revert_price'', ''hide_product'') NULL COMMENT ''การกระทำเมื่อหมดเวลา: revert_price=กลับราคาเดิม, hide_product=ซ่อนสินค้า'' AFTER promotion_end_date',
  'SELECT ''Column promotion_action already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ตรวจสอบและเพิ่ม original_price
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'original_price');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN original_price DECIMAL(10, 2) NULL COMMENT ''ราคาเดิม (เก็บไว้สำหรับ revert)'' AFTER promotion_action',
  'SELECT ''Column original_price already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- เพิ่ม indexes (ตรวจสอบก่อน)
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND INDEX_NAME = 'idx_products_promotion_end');

SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_products_promotion_end ON products(promotion_end_date)',
  'SELECT ''Index idx_products_promotion_end already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND INDEX_NAME = 'idx_products_promotion_active');

SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_products_promotion_active ON products(promotion_start_date, promotion_end_date)',
  'SELECT ''Index idx_products_promotion_active already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration completed successfully! Promotion fields added to products table.' AS result;

-- หมายเหตุ:
-- - original_price ควรตั้งค่าเป็น price เมื่อสร้างโปรโมชั่น
-- - เมื่อโปรโมชั่นหมดเวลา:
--   - ถ้า promotion_action = 'revert_price': ราคาจะกลับไปเป็น original_price
--   - ถ้า promotion_action = 'hide_product': สินค้าจะถูกซ่อนจากการแสดงผล

