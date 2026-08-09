-- ============================================================================
-- ALL MIGRATIONS FOR SUPABASE - Run these in order in the SQL Editor
-- ============================================================================

-- Migration 1: 20251108112504_f5e911a4-f50d-427e-85ee-e414fcfea675.sql
-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'lb',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pending Approval',
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'customer',
  UNIQUE(user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for products
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for order_items
CREATE POLICY "Users can view their order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for profiles on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- ============================================================================
-- Migration 2: 20251112111430_803a492b-9330-4bfe-9ce2-a3e7419261ff.sql
-- ============================================================================

-- Add email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email TEXT;

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$function$;

-- Update existing profiles with email from auth.users
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.user_id = auth.users.id AND profiles.email IS NULL;

-- ============================================================================
-- Migration 3: 20251116040811_193acb8a-9d88-4724-be86-4927286d40d7.sql
-- ============================================================================

-- Create missing profiles for users who have orders but no profile
INSERT INTO public.profiles (user_id, full_name, email)
SELECT 
  au.id as user_id,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Customer') as full_name,
  au.email
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
)
AND EXISTS (
  SELECT 1 FROM public.orders o WHERE o.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- Migration 4: 20251207164736_c68a6c7c-14bc-4c0f-8914-525bddeea9b5.sql
-- ============================================================================

-- Add phone_number column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;

-- ============================================================================
-- Migration 5: 20251207164903_e2f69f06-7a6c-4d45-9754-3cabb64d7ee5.sql
-- ============================================================================

-- Update handle_new_user function to include phone_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, phone_number)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- Migration 6: 20251208115714_238d8962-5d2e-4e13-8ade-f9e17b4c1b1f.sql
-- ============================================================================

-- Add address fields to profiles table for delivery purposes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS street_address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS pincode text;

-- ============================================================================
-- Migration 7: 20251210115024_af73dbeb-1cb0-486d-ba38-4ff9a048c5c4.sql
-- ============================================================================

-- Add UTR number column to orders table for payment tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utr_number text;

-- ============================================================================
-- Migration 8: 20251211131056_4c09ea0b-1b72-49d8-bbbc-4e84e2d25764.sql
-- ============================================================================

-- Create admin_settings table to store QR code and other settings
CREATE TABLE public.admin_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can manage settings
CREATE POLICY "Admins can view settings" 
ON public.admin_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert settings" 
ON public.admin_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings" 
ON public.admin_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view the QR code setting (needed for payment modal)
CREATE POLICY "Anyone can view qr_code_url setting" 
ON public.admin_settings 
FOR SELECT 
USING (key = 'qr_code_url');

-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true);

-- Storage policies for QR codes
CREATE POLICY "Anyone can view QR codes" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'qr-codes');

CREATE POLICY "Admins can upload QR codes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'qr-codes' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update QR codes" 
ON storage.objects 
FOR UPDATE
USING (bucket_id = 'qr-codes' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete QR codes" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'qr-codes' AND has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- Migration 9: 20251211133819_5026bc82-aa1c-446c-995a-f10df1d9ed18.sql
-- ============================================================================

-- Drop the existing policy and create a new one that allows both qr_code_url and upi_id
DROP POLICY IF EXISTS "Anyone can view qr_code_url setting" ON public.admin_settings;

CREATE POLICY "Anyone can view payment settings" 
ON public.admin_settings 
FOR SELECT 
USING (key IN ('qr_code_url', 'upi_id'));

-- ============================================================================
-- Migration 10: 20251211133915_40e0c2c5-13c1-4f5d-9294-8025ea32bd73.sql
-- ============================================================================

-- Add UTR verification status column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utr_verified boolean DEFAULT false;

-- ============================================================================
-- Migration 11: 20251212125144_9e5502e9-5052-433c-b96c-1a3e6c0f407c.sql
-- ============================================================================

-- Add tax_percentage column to orders table (null = no tax, 0 = free, >0 = custom tax)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_percentage numeric DEFAULT NULL;

-- ============================================================================
-- Migration 12: 20260106054909_39780cb7-c01b-4091-a668-c42a74979a58.sql
-- ============================================================================

-- Add cancellation_reason column to orders table for customer cancellation reasons
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason text DEFAULT NULL;

-- ============================================================================
-- Migration 13: 20260106055527_f6c56c6d-95de-41c8-aefa-52423a75ba30.sql
-- ============================================================================

-- Allow customers to update their own orders (for cancellation)
CREATE POLICY "Users can update their own orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
