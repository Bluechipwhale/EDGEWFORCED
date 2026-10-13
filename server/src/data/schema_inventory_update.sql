-- ==============================================================================
-- EDGEWFORCE - PHYSICAL INVENTORY DATABASE SCHEMA MIGRATION
-- Run this SQL in your Supabase SQL Editor to update the database schema without inserting inventory
-- ==============================================================================

-- 1. Ensure columns exist on products table
ALTER TABLE IF EXISTS products 
  ADD COLUMN IF NOT EXISTS location_of_item VARCHAR(255) DEFAULT 'Warehouse Shelves',
  ADD COLUMN IF NOT EXISTS shelf_number VARCHAR(100) DEFAULT '—',
  ADD COLUMN IF NOT EXISTS condition VARCHAR(100) DEFAULT '—',
  ADD COLUMN IF NOT EXISTS quantity_display VARCHAR(100) DEFAULT '1';

-- 2. Create index on location_of_item, shelf_number, and category for blazing-fast search
CREATE INDEX IF NOT EXISTS idx_products_location ON products(company_id, location_of_item);
CREATE INDEX IF NOT EXISTS idx_products_shelf ON products(company_id, shelf_number);
CREATE INDEX IF NOT EXISTS idx_products_condition ON products(company_id, condition);

-- Inventory is entered explicitly through the application. No bundled stock.
