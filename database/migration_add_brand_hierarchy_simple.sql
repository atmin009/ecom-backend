-- Migration: Add Parent-Child Hierarchy to Brands (Simple Version)
-- Run this to add hierarchical brand support (e.g., Apple > iPhone > iPhone 17 series)
-- This version uses simple ALTER TABLE statements (safe to run multiple times)

-- Add parent_id column to brands table
ALTER TABLE brands 
ADD COLUMN parent_id INT NULL AFTER id;

-- Add self-referencing foreign key
ALTER TABLE brands
ADD CONSTRAINT fk_brands_parent 
  FOREIGN KEY (parent_id) REFERENCES brands(id) ON DELETE SET NULL;

-- Add index for parent_id
CREATE INDEX idx_brands_parent ON brands(parent_id);

-- Update existing brands to have NULL parent_id (top-level brands)
UPDATE brands SET parent_id = NULL WHERE parent_id IS NULL;

-- Note: If you get errors about column/constraint/index already existing,
-- you can safely ignore them or comment out the corresponding lines.

