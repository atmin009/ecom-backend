-- Verify that orders table has customer_email column
-- Run this to check your current schema

-- Check all columns in orders table
DESCRIBE orders;

-- Or get detailed info
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
ORDER BY ORDINAL_POSITION;

-- If customer_email exists, you should see it in the results
-- If it doesn't exist, you'll need to add it (but error says it exists, so it should be there)

