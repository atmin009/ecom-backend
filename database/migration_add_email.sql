-- Migration: Add customer_email column to orders table
-- Run this if your orders table doesn't have customer_email column yet
-- This script checks if column exists before adding it

-- For MySQL 8.0+ (supports IF NOT EXISTS)
-- ALTER TABLE orders 
-- ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255) NOT NULL DEFAULT '' AFTER customer_phone;

-- For MySQL < 8.0, use this procedure to check first:
SET @dbname = DATABASE();
SET @tablename = 'orders';
SET @columnname = 'customer_email';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1', -- Column exists, do nothing
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(255) NOT NULL DEFAULT "" AFTER customer_phone')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for email (check if exists first)
SET @indexname = 'idx_orders_customer_email';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (INDEX_NAME = @indexname)
  ) > 0,
  'SELECT 1', -- Index exists, do nothing
  CONCAT('CREATE INDEX ', @indexname, ' ON ', @tablename, ' (customer_email)')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Update existing records (if any) - set a default email
-- UPDATE orders SET customer_email = CONCAT('customer_', id, '@example.com') WHERE customer_email = '';

