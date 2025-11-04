-- Add tier graduation rewards configuration to system settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'tier_graduation_rewards',
  '{
    "bronze_to_silver": {
      "reward_type": "fixed",
      "reward_value": 10,
      "reward_title": "Upgraded to Silver Tier!",
      "reward_description": "Congratulations on reaching Silver tier! Enjoy $10 off your next order."
    },
    "silver_to_gold": {
      "reward_type": "fixed",
      "reward_value": 15,
      "reward_title": "Upgraded to Gold Tier!",
      "reward_description": "Congratulations on reaching Gold tier! Enjoy $15 off your next order."
    }
  }'::jsonb,
  'Configuration for tier graduation rewards including type (fixed/percentage), value, title, and description'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Update the update_customer_tier function to use tier_graduation_rewards
CREATE OR REPLACE FUNCTION public.update_customer_tier(customer_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  visit_count INTEGER;
  new_tier tier_type;
  current_tier tier_type;
  tier_thresholds JSONB;
  graduation_rewards JSONB;
  upgrade_config JSONB;
  reward_type TEXT;
  reward_value NUMERIC;
  reward_title TEXT;
  reward_description TEXT;
BEGIN
  -- Get tier thresholds from settings
  SELECT setting_value INTO tier_thresholds
  FROM public.system_settings
  WHERE setting_key = 'tier_thresholds';
  
  -- Get tier graduation rewards from settings
  SELECT setting_value INTO graduation_rewards
  FROM public.system_settings
  WHERE setting_key = 'tier_graduation_rewards';
  
  -- Use defaults if settings not found
  tier_thresholds := COALESCE(tier_thresholds, '{"bronze": {"min": 0, "max": 9}, "silver": {"min": 10, "max": 19}, "gold": {"min": 20}}'::jsonb);
  graduation_rewards := COALESCE(graduation_rewards, '{
    "bronze_to_silver": {"reward_type": "fixed", "reward_value": 10, "reward_title": "Upgraded to Silver Tier!", "reward_description": "Congratulations on reaching Silver tier! Enjoy $10 off your next order."},
    "silver_to_gold": {"reward_type": "fixed", "reward_value": 15, "reward_title": "Upgraded to Gold Tier!", "reward_description": "Congratulations on reaching Gold tier! Enjoy $15 off your next order."}
  }'::jsonb);
  
  SELECT total_visits, cs.current_tier 
  INTO visit_count, current_tier
  FROM public.customer_stats cs
  WHERE cs.customer_id = customer_profile_id;
  
  -- Determine new tier based on visit count
  IF visit_count >= (tier_thresholds->'gold'->>'min')::integer THEN
    new_tier := 'gold';
    upgrade_config := graduation_rewards->'silver_to_gold';
  ELSIF visit_count >= (tier_thresholds->'silver'->>'min')::integer THEN
    new_tier := 'silver';
    upgrade_config := graduation_rewards->'bronze_to_silver';
  ELSE
    new_tier := 'bronze';
    upgrade_config := NULL;
  END IF;
  
  -- Only create reward if tier has changed and upgrade_config exists
  IF new_tier != current_tier AND upgrade_config IS NOT NULL THEN
    UPDATE public.customer_stats 
    SET current_tier = new_tier, tier_updated_at = now(), updated_at = now()
    WHERE customer_id = customer_profile_id;
    
    -- Extract reward configuration
    reward_type := upgrade_config->>'reward_type';
    reward_value := (upgrade_config->>'reward_value')::numeric;
    reward_title := upgrade_config->>'reward_title';
    reward_description := upgrade_config->>'reward_description';
    
    -- Create reward based on type
    IF reward_type = 'fixed' THEN
      INSERT INTO public.rewards (
        customer_id, 
        reward_type, 
        reward_title, 
        reward_description,
        reward_value,
        applicable_to,
        minimum_order_value
      )
      VALUES (
        customer_profile_id,
        'tier_upgrade',
        reward_title,
        reward_description,
        reward_value,
        'all',
        0
      );
    ELSIF reward_type = 'percentage' THEN
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
        reward_title,
        reward_description,
        reward_value::integer,
        'all',
        0
      );
    END IF;
  END IF;
END;
$function$;