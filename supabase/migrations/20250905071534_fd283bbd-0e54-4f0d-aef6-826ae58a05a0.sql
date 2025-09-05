-- First, let's update the handle_new_user function to handle additional fields and referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referrer_profile_id UUID;
BEGIN
  -- Insert the new user profile
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
  );
  
  -- Handle referral logic if a referral code was provided
  IF NEW.raw_user_meta_data ->> 'referred_by_code' IS NOT NULL THEN
    -- Find the referrer by referral code
    SELECT id INTO referrer_profile_id 
    FROM public.profiles 
    WHERE referral_code = NEW.raw_user_meta_data ->> 'referred_by_code';
    
    -- If referrer found, create referral record and reward
    IF referrer_profile_id IS NOT NULL THEN
      -- Get the new user's profile id
      DECLARE
        new_profile_id UUID;
      BEGIN
        SELECT id INTO new_profile_id FROM public.profiles WHERE user_id = NEW.id;
        
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
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create default admin account (you can change these credentials)
-- First, we need to manually insert into auth.users (this is a one-time setup)
-- For now, let's create a function to promote existing users to admin/staff roles

CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles 
  SET role = 'admin'
  WHERE email = user_email;
END;
$function$;

CREATE OR REPLACE FUNCTION public.promote_user_to_staff(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles 
  SET role = 'staff'
  WHERE email = user_email;
END;
$function$;

-- Let's also create a more secure admin promotion function that requires a secret key
CREATE OR REPLACE FUNCTION public.create_admin_access(user_email text, secret_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the secret key matches (you can change this secret)
  IF secret_key = 'LOYALTY_ADMIN_SECRET_2024' THEN
    UPDATE public.profiles 
    SET role = 'admin'
    WHERE email = user_email;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$function$;