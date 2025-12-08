-- Script to check and fix customer_email column
-- This is safe to run multiple times

-- Step 1: Check if column exists
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'customer_email';

-- Step 2: If column doesn't exist, add it
-- (Only run this if the query above returns no rows)
-- ALTER TABLE orders 
-- ADD COLUMN customer_email VARCHAR(255) NOT NULL DEFAULT '' AFTER customer_phone;

-- Step 3: Check if index exists
SELECT 
    INDEX_NAME,
    COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND INDEX_NAME = 'idx_orders_customer_email';

-- Step 4: If index doesn't exist, add it
-- (Only run this if the query above returns no rows)
-- CREATE INDEX idx_orders_customer_email ON orders(customer_email);

-- Step 5: Verify the table structure
DESCRIBE orders;

