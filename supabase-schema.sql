-- ========================================
-- Doceria Pegado - Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ========================================

-- ===== PRODUCTS TABLE =====
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    cost INTEGER DEFAULT 0,
    description TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add cost column if table already exists
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cost INTEGER DEFAULT 0;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS description TEXT;

-- ===== ORDERS TABLE =====
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    order_number INTEGER NOT NULL UNIQUE,
    items JSONB NOT NULL,
    total INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    notes TEXT,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add status tracking columns if table already exists
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ===== SETTINGS TABLE =====
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    admin_password TEXT NOT NULL,
    admin_email TEXT DEFAULT 'admin@doceriapegado.com',
    whatsapp_number TEXT DEFAULT '+244943268336',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Add admin_email column if table already exists
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS admin_email TEXT DEFAULT 'admin@doceriapegado.com';

-- Insert default settings if not exists
INSERT INTO settings (id, admin_password, admin_email, whatsapp_number)
VALUES (1, 'DuquesaSegura2024!', 'admin@doceriapegado.com', '+244943268336')
ON CONFLICT (id) DO NOTHING;

-- ===== INDEXES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- ===== ENABLE ROW LEVEL SECURITY (Optional but Recommended) =====
-- This adds an extra layer of security

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products
CREATE POLICY "Public can view products" 
ON products FOR SELECT 
USING (true);

-- Only authenticated users can modify products
CREATE POLICY "Authenticated can modify products" 
ON products FOR ALL 
USING (auth.role() = 'authenticated');

-- Only authenticated users can view orders
CREATE POLICY "Authenticated can view orders" 
ON orders FOR SELECT 
USING (auth.role() = 'authenticated');

-- Anyone can create orders (for checkout)
CREATE POLICY "Anyone can create orders" 
ON orders FOR INSERT 
WITH CHECK (true);

-- Only authenticated users can update orders
CREATE POLICY "Authenticated can update orders" 
ON orders FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Only authenticated users can access settings
CREATE POLICY "Authenticated can access settings" 
ON settings FOR ALL 
USING (auth.role() = 'authenticated');

-- ===== CREATE STORAGE BUCKET FOR PRODUCT IMAGES =====
-- Run this in Supabase Storage section

-- Create 'products' bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to product images
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Only authenticated users can upload product images
CREATE POLICY "Authenticated can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

-- ===== SAMPLE DATA (Optional) =====
-- Insert some sample products for testing

INSERT INTO products (name, price, cost, description, image) VALUES
('Bolo de Chocolate', 15000, 8000, 'Delicioso bolo de chocolate com cobertura cremosa', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400'),
('Bolo de Morango', 18000, 10000, 'Bolo leve com morangos frescos e chantilly', 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400'),
('Bolo Red Velvet', 20000, 11000, 'Clássico bolo vermelho com cream cheese', 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400')
ON CONFLICT DO NOTHING;

-- ===== VERIFICATION QUERIES =====
-- Run these to verify everything is set up correctly

-- Check products
SELECT * FROM products LIMIT 5;

-- Check orders
SELECT * FROM orders LIMIT 5;

-- Check settings (password should be visible in plaintext initially, will be hashed on first login)
SELECT id, admin_email, whatsapp_number, LEFT(admin_password, 10) as password_preview FROM settings;

-- Check if cost field exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'cost';

-- ===== DONE! =====
-- Your database is now ready for the secure Doceria Pegado system!