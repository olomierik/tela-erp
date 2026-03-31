-- Add product_name and quantity_received columns to myerp_goods_receipts
-- These fields enable inventory updates when a goods receipt is marked complete.

ALTER TABLE public.myerp_goods_receipts
  ADD COLUMN IF NOT EXISTS product_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quantity_received numeric(15,4) NOT NULL DEFAULT 0;
