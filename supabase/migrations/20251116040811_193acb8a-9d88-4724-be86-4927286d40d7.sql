
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
