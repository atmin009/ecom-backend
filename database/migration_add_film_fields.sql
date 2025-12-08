-- Migration: Add fields for screen protector products
-- สำหรับฟิล์มกันรอย Focus Shield

-- เพิ่ม fields ใน products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS device_model VARCHAR(255) NULL COMMENT 'รุ่นมือถือที่รองรับ (เช่น iPhone 15 Pro Max)',
ADD COLUMN IF NOT EXISTS film_type VARCHAR(100) NULL COMMENT 'ประเภทฟิล์ม (Tempered Glass, Privacy, Anti-fingerprint)',
ADD COLUMN IF NOT EXISTS screen_size VARCHAR(50) NULL COMMENT 'ขนาดหน้าจอ (เช่น 6.7 นิ้ว)',
ADD COLUMN IF NOT EXISTS thickness VARCHAR(20) NULL COMMENT 'ความหนา (เช่น 0.33mm)',
ADD COLUMN IF NOT EXISTS hardness VARCHAR(20) NULL COMMENT 'ความแข็ง (เช่น 9H)',
ADD COLUMN IF NOT EXISTS features TEXT NULL COMMENT 'คุณสมบัติพิเศษ (JSON หรือ comma-separated)';

-- เพิ่ม indexes สำหรับการค้นหา
CREATE INDEX IF NOT EXISTS idx_products_device_model ON products(device_model);
CREATE INDEX IF NOT EXISTS idx_products_film_type ON products(film_type);
CREATE INDEX IF NOT EXISTS idx_products_screen_size ON products(screen_size);

-- สำหรับ MySQL < 8.0 ที่ไม่รองรับ IF NOT EXISTS
-- ใช้คำสั่งนี้แทน:
-- ALTER TABLE products 
-- ADD COLUMN device_model VARCHAR(255) NULL COMMENT 'รุ่นมือถือที่รองรับ',
-- ADD COLUMN film_type VARCHAR(100) NULL COMMENT 'ประเภทฟิล์ม',
-- ADD COLUMN screen_size VARCHAR(50) NULL COMMENT 'ขนาดหน้าจอ',
-- ADD COLUMN thickness VARCHAR(20) NULL COMMENT 'ความหนา',
-- ADD COLUMN hardness VARCHAR(20) NULL COMMENT 'ความแข็ง',
-- ADD COLUMN features TEXT NULL COMMENT 'คุณสมบัติพิเศษ';

-- CREATE INDEX idx_products_device_model ON products(device_model);
-- CREATE INDEX idx_products_film_type ON products(film_type);
-- CREATE INDEX idx_products_screen_size ON products(screen_size);

