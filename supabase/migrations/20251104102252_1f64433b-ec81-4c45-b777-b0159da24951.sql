-- Create system_settings table for editable configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "System settings are viewable by authenticated users"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify system settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Insert default settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('tier_thresholds', '{"bronze": {"min": 0, "max": 9}, "silver": {"min": 10, "max": 19}, "gold": {"min": 20}}'::jsonb, 'Visit count thresholds for each tier'),
  ('tier_discounts', '{"bronze": 5, "silver": 10, "gold": 15}'::jsonb, 'Discount percentages for each tier'),
  ('milestone_frequency', '6'::jsonb, 'Number of visits between milestone rewards'),
  ('milestone_reward_value', '10.00'::jsonb, 'Dollar value of milestone rewards'),
  ('referral_reward_value', '15.00'::jsonb, 'Dollar value of referral rewards'),
  ('reward_expiration_days', '30'::jsonb, 'Days until rewards expire'),
  ('birthday_rewards_enabled', 'true'::jsonb, 'Whether birthday rewards are enabled')
ON CONFLICT (setting_key) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update check_milestone_rewards function to read from system_settings
CREATE OR REPLACE FUNCTION public.check_milestone_rewards(customer_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  visit_count INTEGER;
  milestone_freq INTEGER;
  reward_val NUMERIC;
BEGIN
  -- Get milestone frequency from settings
  SELECT (setting_value)::integer INTO milestone_freq
  FROM public.system_settings
  WHERE setting_key = 'milestone_frequency';
  
  -- Get reward value from settings
  SELECT (setting_value)::numeric INTO reward_val
  FROM public.system_settings
  WHERE setting_key = 'milestone_reward_value';
  
  -- Use defaults if settings not found
  milestone_freq := COALESCE(milestone_freq, 6);
  reward_val := COALESCE(reward_val, 10.00);
  
  SELECT total_visits INTO visit_count
  FROM public.customer_stats
  WHERE customer_id = customer_profile_id;
  
  IF visit_count > 0 AND visit_count % milestone_freq = 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.rewards 
      WHERE customer_id = customer_profile_id 
      AND milestone_visits = visit_count
      AND is_birthday_reward = FALSE
      AND is_referral_reward = FALSE
    ) THEN
      INSERT INTO public.rewards (
        customer_id, 
        reward_type, 
        reward_title, 
        reward_description, 
        milestone_visits,
        reward_value,
        applicable_to,
        minimum_order_value
      )
      VALUES (
        customer_profile_id,
        'milestone',
        'Milestone Reward - ' || visit_count || ' Visits!',
        'Congratulations on reaching ' || visit_count || ' visits! Enjoy $' || reward_val || ' off your next order.',
        visit_count,
        reward_val,
        'all',
        0
      );
    END IF;
  END IF;
END;
$$;

-- Update update_customer_tier function to read from system_settings
CREATE OR REPLACE FUNCTION public.update_customer_tier(customer_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  visit_count INTEGER;
  new_tier tier_type;
  current_tier tier_type;
  discount_pct INTEGER;
  tier_thresholds JSONB;
  tier_discounts JSONB;
BEGIN
  -- Get tier thresholds from settings
  SELECT setting_value INTO tier_thresholds
  FROM public.system_settings
  WHERE setting_key = 'tier_thresholds';
  
  -- Get tier discounts from settings
  SELECT setting_value INTO tier_discounts
  FROM public.system_settings
  WHERE setting_key = 'tier_discounts';
  
  -- Use defaults if settings not found
  tier_thresholds := COALESCE(tier_thresholds, '{"bronze": {"min": 0, "max": 9}, "silver": {"min": 10, "max": 19}, "gold": {"min": 20}}'::jsonb);
  tier_discounts := COALESCE(tier_discounts, '{"bronze": 5, "silver": 10, "gold": 15}'::jsonb);
  
  SELECT total_visits, cs.current_tier 
  INTO visit_count, current_tier
  FROM public.customer_stats cs
  WHERE cs.customer_id = customer_profile_id;
  
  -- Determine new tier based on visit count
  IF visit_count >= (tier_thresholds->'gold'->>'min')::integer THEN
    new_tier := 'gold';
    discount_pct := (tier_discounts->>'gold')::integer;
  ELSIF visit_count >= (tier_thresholds->'silver'->>'min')::integer THEN
    new_tier := 'silver';
    discount_pct := (tier_discounts->>'silver')::integer;
  ELSE
    new_tier := 'bronze';
    discount_pct := (tier_discounts->>'bronze')::integer;
  END IF;
  
  IF new_tier != current_tier THEN
    UPDATE public.customer_stats 
    SET current_tier = new_tier, tier_updated_at = now(), updated_at = now()
    WHERE customer_id = customer_profile_id;
    
    INSERT INTO public.rewards (
      customer_id, 
      reward_type, 
      reward_title, 
      reward_description,
      discount_percentage,
      applicable_to,
      minimum_order_value
    )
    VALUES (
      customer_profile_id,
      'tier_upgrade',
      'Tier Upgraded to ' || upper(new_tier::text),
      'Congratulations! You have been upgraded to ' || upper(new_tier::text) || ' tier! Enjoy ' || discount_pct || '% off your next order.',
      discount_pct,
      'all',
      0
    );
  END IF;
END;
$$;

-- Update handle_new_user function to use system_settings for referral reward
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referrer_profile_id UUID;
  new_profile_id UUID;
  referral_reward_val NUMERIC;
BEGIN
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
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  IF NEW.raw_user_meta_data ->> 'referred_by_code' IS NOT NULL THEN
    SELECT id INTO referrer_profile_id 
    FROM public.profiles 
    WHERE referral_code = NEW.raw_user_meta_data ->> 'referred_by_code';
    
    IF referrer_profile_id IS NOT NULL THEN
      -- Get referral reward value from settings
      SELECT (setting_value)::numeric INTO referral_reward_val
      FROM public.system_settings
      WHERE setting_key = 'referral_reward_value';
      
      -- Use default if not found
      referral_reward_val := COALESCE(referral_reward_val, 15.00);
      
      INSERT INTO public.referrals (referrer_id, referred_id, referral_code, reward_granted)
      VALUES (referrer_profile_id, new_profile_id, NEW.raw_user_meta_data ->> 'referred_by_code', true);
      
      INSERT INTO public.rewards (
        customer_id, 
        reward_type, 
        reward_title, 
        reward_description,
        is_referral_reward,
        reward_value,
        applicable_to,
        minimum_order_value
      )
      VALUES (
        referrer_profile_id,
        'referral',
        'Referral Bonus!',
        'Thank you for referring a new customer! Enjoy $' || referral_reward_val || ' off your next order.',
        true,
        referral_reward_val,
        'all',
        0
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;