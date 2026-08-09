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