-- Fix RLS policies to use has_role() instead of get_current_user_role()
-- This ensures users with multiple roles (e.g., both 'customer' and 'staff') 
-- are correctly recognized for their staff/admin permissions

-- Drop and recreate policies for profiles table
DROP POLICY IF EXISTS "Staff and admins can view all profiles" ON public.profiles;
CREATE POLICY "Staff and admins can view all profiles"
ON public.profiles
FOR ALL
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Drop and recreate policies for customer_stats table
DROP POLICY IF EXISTS "Staff and admins can update customer stats" ON public.customer_stats;
CREATE POLICY "Staff and admins can update customer stats"
ON public.customer_stats
FOR ALL
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Drop and recreate policies for orders table
DROP POLICY IF EXISTS "Staff and admins can manage orders" ON public.orders;
CREATE POLICY "Staff and admins can manage orders"
ON public.orders
FOR ALL
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Drop and recreate policies for visits table
DROP POLICY IF EXISTS "Staff and admins can manage visits" ON public.visits;
CREATE POLICY "Staff and admins can manage visits"
ON public.visits
FOR ALL
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Drop and recreate policies for rewards table
DROP POLICY IF EXISTS "Staff and admins can manage rewards" ON public.rewards;
CREATE POLICY "Staff and admins can manage rewards"
ON public.rewards
FOR ALL
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Drop and recreate policies for referrals table
DROP POLICY IF EXISTS "Staff and admins can view all referrals" ON public.referrals;
CREATE POLICY "Staff and admins can view all referrals"
ON public.referrals
FOR ALL
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'admin'::user_role));