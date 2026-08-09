-- Add tax_percentage column to orders table (null = no tax, 0 = free, >0 = custom tax)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_percentage numeric DEFAULT NULL;