-- Add address fields to profiles table for delivery purposes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS street_address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS pincode text;