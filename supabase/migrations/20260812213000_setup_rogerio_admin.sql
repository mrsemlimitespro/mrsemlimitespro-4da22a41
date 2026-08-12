-- Check if user exists in auth.users via email
DO $$
DECLARE
    target_uuid uuid;
BEGIN
    SELECT id INTO target_uuid FROM auth.users WHERE email = 'rogeriocftv.mr@gmail.com';
    
    IF target_uuid IS NOT NULL THEN
        -- User exists, ensure admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_uuid, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
