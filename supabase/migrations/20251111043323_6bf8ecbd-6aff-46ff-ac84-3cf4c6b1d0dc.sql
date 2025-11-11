-- Add foreign key constraints to establish relationships for PostgREST joins
-- Using DO blocks to safely add constraints only if they don't exist

DO $$ 
BEGIN
  -- 1. orders.customer_profile_id -> profiles.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_customer_profile_id_fkey' 
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_customer_profile_id_fkey
    FOREIGN KEY (customer_profile_id) REFERENCES public.profiles(id)
    ON DELETE SET NULL;
  END IF;

  -- 2. customer_stats.customer_id -> profiles.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customer_stats_customer_id_fkey' 
    AND table_name = 'customer_stats'
  ) THEN
    ALTER TABLE public.customer_stats
    ADD CONSTRAINT customer_stats_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;

  -- 3. visits.customer_id -> profiles.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'visits_customer_id_fkey' 
    AND table_name = 'visits'
  ) THEN
    ALTER TABLE public.visits
    ADD CONSTRAINT visits_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;

  -- 4. rewards.customer_id -> profiles.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'rewards_customer_id_fkey' 
    AND table_name = 'rewards'
  ) THEN
    ALTER TABLE public.rewards
    ADD CONSTRAINT rewards_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;

  -- 5. referrals.referrer_id -> profiles.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referrals_referrer_id_fkey' 
    AND table_name = 'referrals'
  ) THEN
    ALTER TABLE public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey
    FOREIGN KEY (referrer_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;

  -- 6. referrals.referred_id -> profiles.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referrals_referred_id_fkey' 
    AND table_name = 'referrals'
  ) THEN
    ALTER TABLE public.referrals
    ADD CONSTRAINT referrals_referred_id_fkey
    FOREIGN KEY (referred_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_profile_id 
ON public.orders(customer_profile_id);

CREATE INDEX IF NOT EXISTS idx_customer_stats_customer_id 
ON public.customer_stats(customer_id);

CREATE INDEX IF NOT EXISTS idx_visits_customer_id 
ON public.visits(customer_id);

CREATE INDEX IF NOT EXISTS idx_rewards_customer_id 
ON public.rewards(customer_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id 
ON public.referrals(referrer_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_id 
ON public.referrals(referred_id);