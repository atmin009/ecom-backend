-- Script to check if customer_email column exists
-- Run this to verify your database schema

-- Check orders table structure
DESCRIBE orders;

-- Or use this to see all columns
SHOW COLUMNS FROM orders;

-- If customer_email doesn't exist, run the migration:
-- See: migration_add_email.sql

