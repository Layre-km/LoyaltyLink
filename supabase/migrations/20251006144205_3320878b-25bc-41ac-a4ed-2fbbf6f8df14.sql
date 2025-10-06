-- Fix the public data exposure on profiles table
-- Remove the overly permissive SELECT policy and replace it with a secure one

-- Drop the current "Profiles are viewable by everyone" policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a secure policy that only allows users to view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Staff and admins already have an ALL policy that allows them to view all profiles,
-- so they will still have access to all profiles for administrative purposes