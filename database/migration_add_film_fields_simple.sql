-- Migration: Add fields for screen protector products (Simple version)
-- สำหรับฟิล์มกันรอย Focus Shield
-- ใช้ version นี้ถ้า MySQL version ไม่รองรับ IF NOT EXISTS

-- เพิ่ม columns (ถ้า column มีอยู่แล้วจะ error แต่ไม่เป็นไร)
ALTER TABLE products 
ADD COLUMN device_model VARCHAR(255) NULL COMMENT 'รุ่นมือถือที่รองรับ (เช่น iPhone 15 Pro Max)',
ADD COLUMN film_type VARCHAR(100) NULL COMMENT 'ประเภทฟิล์ม (Tempered Glass, Privacy, Anti-fingerprint)',
ADD COLUMN screen_size VARCHAR(50) NULL COMMENT 'ขนาดหน้าจอ (เช่น 6.7 นิ้ว)',
ADD COLUMN thickness VARCHAR(20) NULL COMMENT 'ความหนา (เช่น 0.33mm)',
ADD COLUMN hardness VARCHAR(20) NULL COMMENT 'ความแข็ง (เช่น 9H)',
ADD COLUMN features TEXT NULL COMMENT 'คุณสมบัติพิเศษ (JSON หรือ comma-separated)';

-- เพิ่ม indexes
CREATE INDEX idx_products_device_model ON products(device_model);
CREATE INDEX idx_products_film_type ON products(film_type);
CREATE INDEX idx_products_screen_size ON products(screen_size);

-- ถ้า error "Duplicate column name" หรือ "Duplicate key name" แสดงว่า column/index มีอยู่แล้ว ไม่เป็นไร

