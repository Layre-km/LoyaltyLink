-- Security Fix 1: Update order creation policy to require authentication
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;

CREATE POLICY "Authenticated users can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  customer_profile_id = public.get_current_user_profile_id()
  AND public.get_current_user_profile_id() IS NOT NULL
);

-- Security Fix 2: Add NULL safety to get_current_user_profile_id function
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id 
  FROM public.profiles 
  WHERE user_id = auth.uid() 
  AND auth.uid() IS NOT NULL
  LIMIT 1;
$$;

-- Security Fix 3: Update other helper functions with NULL checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND auth.uid() IS NOT NULL
  LIMIT 1;
$$;