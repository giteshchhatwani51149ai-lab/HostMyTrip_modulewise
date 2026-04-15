-- ============================================
-- HostMyTrip Database Setup Script
-- Run this in MySQL Workbench or any MySQL client
-- ============================================

-- Step 1: Create the database
CREATE DATABASE IF NOT EXISTS hostmytrip 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Step 2: Verify it was created
SHOW DATABASES LIKE 'hostmytrip';

-- Step 3: Select it
USE hostmytrip;

-- Done! The backend will auto-create all tables
-- when you run: npm run dev (via Sequelize sync)
-- Then run: npm run seed (to populate dummy data)
