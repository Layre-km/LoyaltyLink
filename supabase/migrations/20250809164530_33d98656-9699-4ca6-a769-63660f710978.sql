-- Create orders table for customer orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  table_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  items JSONB NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  notes TEXT,
  customer_profile_id UUID
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies
-- Public can view orders (to allow staff dashboard without auth for now)
DROP POLICY IF EXISTS "Orders are viewable by everyone" ON public.orders;
CREATE POLICY "Orders are viewable by everyone"
ON public.orders
FOR SELECT
USING (true);

-- Allow anyone to create an order (no auth yet)
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;
CREATE POLICY "Anyone can create an order"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- Staff and admins can manage orders
DROP POLICY IF EXISTS "Staff and admins can manage orders" ON public.orders;
CREATE POLICY "Staff and admins can manage orders"
ON public.orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role = ANY (ARRAY['staff'::user_role, 'admin'::user_role])
  )
);

-- Index for sorting by newest first
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

-- Enable realtime broadcasting
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;