-- Add UTR number column to orders table for payment tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utr_number text;