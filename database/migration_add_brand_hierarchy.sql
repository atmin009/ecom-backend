-- Migration: Add Parent-Child Hierarchy to Brands
-- Run this to add hierarchical brand support (e.g., Apple > iPhone > iPhone 17 series)

-- Add parent_id column to brands table (if not exists)
SET @dbname = DATABASE();
SET @tablename = 'brands';
SET @columnname = 'parent_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL AFTER id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add self-referencing foreign key (if not exists)
SET @constraint_name = 'fk_brands_parent';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (CONSTRAINT_NAME = @constraint_name)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD CONSTRAINT ', @constraint_name, ' FOREIGN KEY (parent_id) REFERENCES ', @tablename, '(id) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for parent_id (if not exists)
SET @index_name = 'idx_brands_parent';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (INDEX_NAME = @index_name)
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE INDEX ', @index_name, ' ON ', @tablename, '(parent_id)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update existing brands to have NULL parent_id (top-level brands)
UPDATE brands SET parent_id = NULL WHERE parent_id IS NULL;

