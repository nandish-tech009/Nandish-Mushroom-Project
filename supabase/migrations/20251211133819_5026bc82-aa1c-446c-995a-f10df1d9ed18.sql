-- Drop the existing policy and create a new one that allows both qr_code_url and upi_id
DROP POLICY IF EXISTS "Anyone can view qr_code_url setting" ON public.admin_settings;

CREATE POLICY "Anyone can view payment settings" 
ON public.admin_settings 
FOR SELECT 
USING (key IN ('qr_code_url', 'upi_id'));