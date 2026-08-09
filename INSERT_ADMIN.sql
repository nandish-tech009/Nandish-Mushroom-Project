-- ============================================================================
-- CREATE ADMIN USER AND ASSIGN ADMIN ROLE
-- ============================================================================
-- Email: nandish_tech009@gmail.com
-- Password: Gsnandish (will be hashed automatically)
-- Role: admin

-- STEP 1: Create the admin user in auth.users with hashed password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'nandish_tech009@gmail.com',
  crypt('Gsnandish', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  false
);

-- STEP 2: Create profile for the new admin user
INSERT INTO public.profiles (user_id, full_name, email)
SELECT id, 'Admin User', 'nandish_tech009@gmail.com'
FROM auth.users 
WHERE email = 'nandish_tech009@gmail.com';

-- STEP 3: Assign admin role to the new user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'nandish_tech009@gmail.com';
