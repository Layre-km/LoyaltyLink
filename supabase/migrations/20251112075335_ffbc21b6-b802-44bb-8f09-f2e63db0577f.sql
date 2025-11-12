-- Remove overly permissive RLS policy on system_settings
-- This policy allowed all authenticated users (including customers) to view sensitive system configurations
-- Only admins should have access to system settings

DROP POLICY IF EXISTS "System settings are viewable by authenticated users" ON public.system_settings;