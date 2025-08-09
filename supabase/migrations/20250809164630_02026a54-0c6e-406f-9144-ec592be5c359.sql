-- Secure functions by setting explicit search_path
CREATE OR REPLACE FUNCTION public.handle_new_visit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  -- Update visit count
  INSERT INTO public.customer_stats (customer_id, total_visits)
  VALUES (NEW.customer_id, 1)
  ON CONFLICT (customer_id) 
  DO UPDATE SET 
    total_visits = customer_stats.total_visits + 1,
    updated_at = now();
  
  -- Update tier and check for milestone rewards
  PERFORM public.update_customer_tier(NEW.customer_id);
  PERFORM public.check_milestone_rewards(NEW.customer_id);
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  code TEXT;
  done BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    code := upper(substr(md5(random()::text), 1, 8));
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code) THEN
      done := TRUE;
    END IF;
  END LOOP;
  RETURN code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_milestone_rewards(customer_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  visit_count INTEGER;
BEGIN
  -- Get current visit count
  SELECT total_visits INTO visit_count
  FROM public.customer_stats
  WHERE customer_id = customer_profile_id;
  
  -- Check for milestone rewards (every 6 visits)
  IF visit_count > 0 AND visit_count % 6 = 0 THEN
    -- Check if reward already exists for this milestone
    IF NOT EXISTS (
      SELECT 1 FROM public.rewards 
      WHERE customer_id = customer_profile_id 
      AND milestone_visits = visit_count
      AND is_birthday_reward = FALSE
      AND is_referral_reward = FALSE
    ) THEN
      INSERT INTO public.rewards (customer_id, reward_type, reward_title, reward_description, milestone_visits)
      VALUES (
        customer_profile_id,
        'milestone',
        'Milestone Reward - ' || visit_count || ' Visits!',
        'Congratulations on reaching ' || visit_count || ' visits! Enjoy your reward.',
        visit_count
      );
    END IF;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_customer_tier(customer_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  visit_count INTEGER;
  new_tier tier_type;
  current_tier tier_type;
BEGIN
  -- Get current visit count and tier
  SELECT total_visits, cs.current_tier 
  INTO visit_count, current_tier
  FROM public.customer_stats cs
  WHERE cs.customer_id = customer_profile_id;
  
  -- Determine new tier based on visit count
  IF visit_count >= 20 THEN
    new_tier := 'gold';
  ELSIF visit_count >= 10 THEN
    new_tier := 'silver';
  ELSE
    new_tier := 'bronze';
  END IF;
  
  -- Update tier if changed
  IF new_tier != current_tier THEN
    UPDATE public.customer_stats 
    SET current_tier = new_tier, tier_updated_at = now(), updated_at = now()
    WHERE customer_id = customer_profile_id;
    
    -- Create tier upgrade reward
    INSERT INTO public.rewards (customer_id, reward_type, reward_title, reward_description)
    VALUES (
      customer_profile_id,
      'tier_upgrade',
      'Tier Upgraded to ' || upper(new_tier::text),
      'Congratulations! You have been upgraded to ' || upper(new_tier::text) || ' tier!'
    );
  END IF;
END;
$function$;