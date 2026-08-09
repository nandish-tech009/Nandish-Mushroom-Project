-- Add UTR verification status column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utr_verified boolean DEFAULT false;