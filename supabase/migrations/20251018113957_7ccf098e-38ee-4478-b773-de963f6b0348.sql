-- Phase 1: Critical Security Fixes - Role Architecture (Fixed)

-- 1. Create user_roles table using existing user_role enum
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Create function to get all user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- 4. Update get_current_user_role function to use new table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

-- 5. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Update handle_new_user trigger to create role in user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referrer_profile_id UUID;
  new_profile_id UUID;
BEGIN
  -- Insert the new user profile (without role)
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name, 
    referral_code,
    phone_number,
    date_of_birth,
    referred_by_code
  )
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    public.generate_referral_code(),
    NEW.raw_user_meta_data ->> 'phone_number',
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'date_of_birth' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'date_of_birth')::date
      ELSE NULL
    END,
    NEW.raw_user_meta_data ->> 'referred_by_code'
  )
  RETURNING id INTO new_profile_id;
  
  -- Create default customer role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  -- Handle referral logic if a referral code was provided
  IF NEW.raw_user_meta_data ->> 'referred_by_code' IS NOT NULL THEN
    -- Find the referrer by referral code
    SELECT id INTO referrer_profile_id 
    FROM public.profiles 
    WHERE referral_code = NEW.raw_user_meta_data ->> 'referred_by_code';
    
    -- If referrer found, create referral record and reward
    IF referrer_profile_id IS NOT NULL THEN
      -- Create referral record
      INSERT INTO public.referrals (referrer_id, referred_id, referral_code, reward_granted)
      VALUES (referrer_profile_id, new_profile_id, NEW.raw_user_meta_data ->> 'referred_by_code', true);
      
      -- Create reward for the referrer
      INSERT INTO public.rewards (
        customer_id, 
        reward_type, 
        reward_title, 
        reward_description,
        is_referral_reward
      )
      VALUES (
        referrer_profile_id,
        'referral',
        'Referral Bonus!',
        'Thank you for referring a new customer! Enjoy your referral reward.',
        true
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. Update promote functions to use user_roles table
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get user_id from profiles
  SELECT user_id INTO target_user_id FROM public.profiles WHERE email = user_email;
  
  IF target_user_id IS NOT NULL THEN
    -- Add admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_user_to_staff(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get user_id from profiles
  SELECT user_id INTO target_user_id FROM public.profiles WHERE email = user_email;
  
  IF target_user_id IS NOT NULL THEN
    -- Add staff role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'staff')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_admin_access(user_email TEXT, secret_key TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Check if the secret key matches
  IF secret_key = 'LOYALTY_ADMIN_SECRET_2024' THEN
    -- Get user_id from profiles
    SELECT user_id INTO target_user_id FROM public.profiles WHERE email = user_email;
    
    IF target_user_id IS NOT NULL THEN
      -- Add admin role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (target_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
      RETURN true;
    END IF;
  END IF;
  RETURN false;
END;
$$;