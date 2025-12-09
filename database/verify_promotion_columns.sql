-- Script to verify promotion columns exist
-- Run this to check if migration was successful

USE ecommerce;

SELECT 
  'Checking promotion columns...' AS status;

SELECT 
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ All promotion columns exist'
    ELSE CONCAT('❌ Missing columns. Found: ', COUNT(*), '/5')
  END AS result,
  GROUP_CONCAT(COLUMN_NAME ORDER BY COLUMN_NAME) AS existing_columns
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'ecommerce'
  AND TABLE_NAME = 'products'
  AND COLUMN_NAME IN (
    'promotion_price',
    'promotion_start_date',
    'promotion_end_date',
    'promotion_action',
    'original_price'
  );

-- Show all promotion columns details
SELECT 
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'ecommerce'
  AND TABLE_NAME = 'products'
  AND COLUMN_NAME IN (
    'promotion_price',
    'promotion_start_date',
    'promotion_end_date',
    'promotion_action',
    'original_price'
  )
ORDER BY ORDINAL_POSITION;

