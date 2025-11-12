-- Allow all users to read system settings
-- Only admins can modify them

-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "Only admins can modify system settings" ON public.system_settings;

-- Allow everyone to read system settings
CREATE POLICY "Anyone can view system settings"
ON public.system_settings
FOR SELECT
USING (true);

-- Only admins can modify system settings (INSERT, UPDATE, DELETE)
CREATE POLICY "Only admins can modify system settings"
ON public.system_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Only admins can update system settings"
ON public.system_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Only admins can delete system settings"
ON public.system_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));