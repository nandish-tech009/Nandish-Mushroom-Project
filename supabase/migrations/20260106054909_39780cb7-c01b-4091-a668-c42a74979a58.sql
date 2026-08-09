-- Add cancellation_reason column to orders table for customer cancellation reasons
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason text DEFAULT NULL;