-- Fix infinite recursion in RLS policies by creating security definer functions

-- Create function to get current user role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create function to get current user profile ID safely  
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS uuid AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop existing problematic policies on profiles table
DROP POLICY IF EXISTS "Staff and admins can view all profiles" ON public.profiles;

-- Create new safe policies using security definer functions
CREATE POLICY "Staff and admins can view all profiles" 
ON public.profiles 
FOR ALL 
USING (public.get_current_user_role() IN ('staff', 'admin'));

-- Update other policies to use the safe functions
DROP POLICY IF EXISTS "Customers can view their own rewards" ON public.rewards;
CREATE POLICY "Customers can view their own rewards" 
ON public.rewards 
FOR SELECT 
USING (customer_id = public.get_current_user_profile_id());

DROP POLICY IF EXISTS "Customers can view their own visits" ON public.visits;  
CREATE POLICY "Customers can view their own visits"
ON public.visits
FOR SELECT
USING (customer_id = public.get_current_user_profile_id());

DROP POLICY IF EXISTS "Users can view their referrals" ON public.referrals;
CREATE POLICY "Users can view their referrals"
ON public.referrals  
FOR SELECT
USING (referrer_id = public.get_current_user_profile_id() OR referred_id = public.get_current_user_profile_id());

-- Update staff/admin policies to use safe functions
DROP POLICY IF EXISTS "Staff and admins can manage rewards" ON public.rewards;
CREATE POLICY "Staff and admins can manage rewards"
ON public.rewards
FOR ALL
USING (public.get_current_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS "Staff and admins can manage visits" ON public.visits;
CREATE POLICY "Staff and admins can manage visits" 
ON public.visits
FOR ALL
USING (public.get_current_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS "Staff and admins can view all referrals" ON public.referrals;
CREATE POLICY "Staff and admins can view all referrals"
ON public.referrals
FOR ALL  
USING (public.get_current_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS "Staff and admins can update customer stats" ON public.customer_stats;
CREATE POLICY "Staff and admins can update customer stats"
ON public.customer_stats
FOR ALL
USING (public.get_current_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS "Staff and admins can manage orders" ON public.orders;
CREATE POLICY "Staff and admins can manage orders"
ON public.orders  
FOR ALL
USING (public.get_current_user_role() IN ('staff', 'admin'));

-- Create trigger to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, referral_code)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    public.generate_referral_code()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();