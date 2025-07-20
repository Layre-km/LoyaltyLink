-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('customer', 'staff', 'admin');

-- Create tier enum
CREATE TYPE public.tier_type AS ENUM ('bronze', 'silver', 'gold');

-- Create reward status enum
CREATE TYPE public.reward_status AS ENUM ('available', 'claimed');

-- Create profiles table for extended user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  date_of_birth DATE,
  role user_role NOT NULL DEFAULT 'customer',
  referral_code TEXT NOT NULL UNIQUE,
  referred_by_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visits table
CREATE TABLE public.visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  logged_by_staff_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer_stats table for tracking tiers and visit counts
CREATE TABLE public.customer_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_visits INTEGER NOT NULL DEFAULT 0,
  current_tier tier_type NOT NULL DEFAULT 'bronze',
  tier_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rewards table
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  reward_title TEXT NOT NULL,
  reward_description TEXT,
  milestone_visits INTEGER,
  is_birthday_reward BOOLEAN NOT NULL DEFAULT FALSE,
  is_referral_reward BOOLEAN NOT NULL DEFAULT FALSE,
  status reward_status NOT NULL DEFAULT 'available',
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  claimed_at TIMESTAMP WITH TIME ZONE,
  claimed_by_staff_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  reward_granted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff and admins can view all profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('staff', 'admin'))
);

-- Create policies for visits
CREATE POLICY "Staff and admins can manage visits" ON public.visits FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('staff', 'admin'))
);
CREATE POLICY "Customers can view their own visits" ON public.visits FOR SELECT USING (
  customer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Create policies for customer_stats
CREATE POLICY "Customer stats are viewable by everyone" ON public.customer_stats FOR SELECT USING (true);
CREATE POLICY "Staff and admins can update customer stats" ON public.customer_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('staff', 'admin'))
);

-- Create policies for rewards
CREATE POLICY "Customers can view their own rewards" ON public.rewards FOR SELECT USING (
  customer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Staff and admins can manage rewards" ON public.rewards FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('staff', 'admin'))
);

-- Create policies for referrals
CREATE POLICY "Users can view their referrals" ON public.referrals FOR SELECT USING (
  referrer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
  referred_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Staff and admins can view all referrals" ON public.referrals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('staff', 'admin'))
);

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Create function to update tier based on visit count
CREATE OR REPLACE FUNCTION public.update_customer_tier(customer_profile_id UUID)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

-- Create function to check and create milestone rewards
CREATE OR REPLACE FUNCTION public.check_milestone_rewards(customer_profile_id UUID)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger function for visit logging
CREATE OR REPLACE FUNCTION public.handle_new_visit()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for visit logging
CREATE TRIGGER on_visit_logged
  AFTER INSERT ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_visit();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_stats_updated_at
  BEFORE UPDATE ON public.customer_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();