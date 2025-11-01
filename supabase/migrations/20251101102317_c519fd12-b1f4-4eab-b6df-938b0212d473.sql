-- Add reward value and discount fields to rewards table
ALTER TABLE public.rewards 
ADD COLUMN reward_value NUMERIC(10,2),
ADD COLUMN discount_percentage INTEGER,
ADD COLUMN applicable_to TEXT DEFAULT 'all',
ADD COLUMN minimum_order_value NUMERIC(10,2) DEFAULT 0,
ADD COLUMN expiration_date TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
ADD COLUMN applied_to_order_id UUID REFERENCES public.orders(id);

-- Add discount tracking to orders table
ALTER TABLE public.orders
ADD COLUMN applied_reward_id UUID REFERENCES public.rewards(id),
ADD COLUMN discount_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN original_amount NUMERIC(10,2);

-- Add index for faster queries
CREATE INDEX idx_rewards_customer_status ON public.rewards(customer_id, status);
CREATE INDEX idx_rewards_expiration ON public.rewards(expiration_date) WHERE status = 'available';

-- Update check_milestone_rewards function to set default values
CREATE OR REPLACE FUNCTION public.check_milestone_rewards(customer_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  visit_count INTEGER;
BEGIN
  SELECT total_visits INTO visit_count
  FROM public.customer_stats
  WHERE customer_id = customer_profile_id;
  
  IF visit_count > 0 AND visit_count % 6 = 0 THEN
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
        'Congratulations on reaching ' || visit_count || ' visits! Enjoy $10 off your next order.',
        visit_count,
        10.00,
        'all',
        0
      );
    END IF;
  END IF;
END;
$function$;

-- Update update_customer_tier function to set percentage discounts
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
  discount_pct INTEGER;
BEGIN
  SELECT total_visits, cs.current_tier 
  INTO visit_count, current_tier
  FROM public.customer_stats cs
  WHERE cs.customer_id = customer_profile_id;
  
  IF visit_count >= 20 THEN
    new_tier := 'gold';
    discount_pct := 15;
  ELSIF visit_count >= 10 THEN
    new_tier := 'silver';
    discount_pct := 10;
  ELSE
    new_tier := 'bronze';
    discount_pct := 5;
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
$function$;

-- Update handle_new_user function to set referral reward value
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referrer_profile_id UUID;
  new_profile_id UUID;
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
        'Thank you for referring a new customer! Enjoy $15 off your next order.',
        true,
        15.00,
        'all',
        0
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create function to apply reward to order
CREATE OR REPLACE FUNCTION public.apply_reward_to_order(
  _reward_id UUID,
  _order_total NUMERIC,
  _order_items JSONB
)
RETURNS TABLE(discount_amount NUMERIC, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reward_record RECORD;
  calculated_discount NUMERIC := 0;
BEGIN
  -- Fetch and validate reward
  SELECT * INTO reward_record
  FROM public.rewards
  WHERE id = _reward_id
    AND status = 'available'
    AND (expiration_date IS NULL OR expiration_date > now());
  
  -- Check if reward exists and is valid
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::NUMERIC, 'Reward is not available or has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check minimum order value
  IF _order_total < reward_record.minimum_order_value THEN
    RETURN QUERY SELECT 0::NUMERIC, ('Minimum order value of $' || reward_record.minimum_order_value || ' required')::TEXT;
    RETURN;
  END IF;
  
  -- Calculate discount
  IF reward_record.reward_value IS NOT NULL THEN
    calculated_discount := LEAST(reward_record.reward_value, _order_total);
  ELSIF reward_record.discount_percentage IS NOT NULL THEN
    calculated_discount := ROUND(_order_total * reward_record.discount_percentage / 100.0, 2);
  ELSE
    RETURN QUERY SELECT 0::NUMERIC, 'Invalid reward configuration'::TEXT;
    RETURN;
  END IF;
  
  -- Ensure discount doesn't exceed order total
  calculated_discount := LEAST(calculated_discount, _order_total);
  
  RETURN QUERY SELECT calculated_discount, NULL::TEXT;
END;
$function$;

-- Update handle_new_order to automatically claim rewards
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create visit if customer_profile_id exists
  IF NEW.customer_profile_id IS NOT NULL THEN
    INSERT INTO public.visits (customer_id, notes)
    VALUES (NEW.customer_profile_id, 'Order #' || NEW.id || ' - Table ' || NEW.table_number);
  END IF;
  
  -- Auto-claim reward if applied
  IF NEW.applied_reward_id IS NOT NULL THEN
    UPDATE public.rewards
    SET status = 'claimed',
        claimed_at = now(),
        applied_to_order_id = NEW.id
    WHERE id = NEW.applied_reward_id
      AND status = 'available';
  END IF;
  
  RETURN NEW;
END;
$function$;