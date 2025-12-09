-- Script to check if promotion columns exist in products table
-- Run this to verify migration status

SELECT 
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'products'
  AND COLUMN_NAME IN (
    'promotion_price',
    'promotion_start_date',
    'promotion_end_date',
    'promotion_action',
    'original_price'
  )
ORDER BY COLUMN_NAME;

-- If no rows returned, the columns don't exist - you need to run migration_add_promotion_fields.sql

