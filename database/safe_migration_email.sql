-- Safe Migration: Add customer_email column (only if it doesn't exist)
-- This script is safe to run multiple times

-- Method 1: Simple check and add (for manual execution)
-- First, check if column exists:
-- SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'customer_email';

-- If result is 0, then run:
-- ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255) NOT NULL DEFAULT '' AFTER customer_phone;

-- Method 2: Using stored procedure (automatic check)
DELIMITER $$

DROP PROCEDURE IF EXISTS AddColumnIfNotExists$$

CREATE PROCEDURE AddColumnIfNotExists()
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO column_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'customer_email';
    
    IF column_exists = 0 THEN
        ALTER TABLE orders 
        ADD COLUMN customer_email VARCHAR(255) NOT NULL DEFAULT '' AFTER customer_phone;
        SELECT 'Column customer_email added successfully' AS result;
    ELSE
        SELECT 'Column customer_email already exists' AS result;
    END IF;
END$$

DELIMITER ;

-- Execute the procedure
CALL AddColumnIfNotExists();

-- Drop the procedure after use
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- Add index if it doesn't exist
DELIMITER $$

DROP PROCEDURE IF EXISTS AddIndexIfNotExists$$

CREATE PROCEDURE AddIndexIfNotExists()
BEGIN
    DECLARE index_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO index_exists
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND INDEX_NAME = 'idx_orders_customer_email';
    
    IF index_exists = 0 THEN
        CREATE INDEX idx_orders_customer_email ON orders(customer_email);
        SELECT 'Index idx_orders_customer_email added successfully' AS result;
    ELSE
        SELECT 'Index idx_orders_customer_email already exists' AS result;
    END IF;
END$$

DELIMITER ;

-- Execute the procedure
CALL AddIndexIfNotExists();

-- Drop the procedure after use
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;

