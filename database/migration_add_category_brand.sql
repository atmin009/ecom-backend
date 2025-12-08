-- Migration: Add Categories and Brands
-- Run this to add category and brand support

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

-- Add category_id and brand_id to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id INT NULL AFTER is_free_gift,
ADD COLUMN IF NOT EXISTS brand_id INT NULL AFTER category_id;

-- Add foreign keys
ALTER TABLE products
ADD CONSTRAINT fk_products_category 
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_products_brand 
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);

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

