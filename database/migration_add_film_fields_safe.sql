-- Migration: Add fields for screen protector products
-- สำหรับฟิล์มกันรอย Focus Shield
-- Safe version - checks if columns exist before adding

-- ตรวจสอบและเพิ่ม device_model
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'device_model');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN device_model VARCHAR(255) NULL COMMENT ''รุ่นมือถือที่รองรับ (เช่น iPhone 15 Pro Max)''',
  'SELECT ''Column device_model already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ตรวจสอบและเพิ่ม film_type
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'film_type');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN film_type VARCHAR(100) NULL COMMENT ''ประเภทฟิล์ม (Tempered Glass, Privacy, Anti-fingerprint)''',
  'SELECT ''Column film_type already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ตรวจสอบและเพิ่ม screen_size
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'screen_size');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN screen_size VARCHAR(50) NULL COMMENT ''ขนาดหน้าจอ (เช่น 6.7 นิ้ว)''',
  'SELECT ''Column screen_size already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ตรวจสอบและเพิ่ม thickness
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'thickness');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN thickness VARCHAR(20) NULL COMMENT ''ความหนา (เช่น 0.33mm)''',
  'SELECT ''Column thickness already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ตรวจสอบและเพิ่ม hardness
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'hardness');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN hardness VARCHAR(20) NULL COMMENT ''ความแข็ง (เช่น 9H)''',
  'SELECT ''Column hardness already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ตรวจสอบและเพิ่ม features
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'features');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN features TEXT NULL COMMENT ''คุณสมบัติพิเศษ (JSON หรือ comma-separated)''',
  'SELECT ''Column features already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- เพิ่ม indexes (ตรวจสอบก่อน)
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND INDEX_NAME = 'idx_products_device_model');

SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_products_device_model ON products(device_model)',
  'SELECT ''Index idx_products_device_model already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND INDEX_NAME = 'idx_products_film_type');

SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_products_film_type ON products(film_type)',
  'SELECT ''Index idx_products_film_type already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'products' 
  AND INDEX_NAME = 'idx_products_screen_size');

SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_products_screen_size ON products(screen_size)',
  'SELECT ''Index idx_products_screen_size already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration completed successfully!' AS result;

