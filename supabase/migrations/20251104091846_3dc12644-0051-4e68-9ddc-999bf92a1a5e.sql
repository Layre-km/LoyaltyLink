-- Additional Security Hardening: Add explicit deny policies for anonymous access

-- Profiles: Deny anonymous access
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Orders: Deny anonymous access
CREATE POLICY "Deny anonymous access to orders"
ON public.orders
FOR ALL
TO anon
USING (false);

-- Referrals: Deny anonymous access and restrict INSERT
CREATE POLICY "Deny anonymous access to referrals"
ON public.referrals
FOR ALL
TO anon
USING (false);

-- Only allow system-created referrals (through triggers)
CREATE POLICY "Only system can create referrals"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (false);  -- Referrals should only be created by the handle_new_user trigger

-- Rewards: Deny anonymous access
CREATE POLICY "Deny anonymous access to rewards"
ON public.rewards
FOR ALL
TO anon
USING (false);

-- Customer Stats: Deny anonymous access
CREATE POLICY "Deny anonymous access to customer_stats"
ON public.customer_stats
FOR ALL
TO anon
USING (false);

-- Visits: Deny anonymous access
CREATE POLICY "Deny anonymous access to visits"
ON public.visits
FOR ALL
TO anon
USING (false);

-- User Roles: Deny anonymous access
CREATE POLICY "Deny anonymous access to user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false);