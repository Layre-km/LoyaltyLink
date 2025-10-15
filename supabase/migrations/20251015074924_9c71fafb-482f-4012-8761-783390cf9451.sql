-- Fix remaining data exposure issues and add order-to-visit automation

-- 1. Fix orders table - remove public SELECT access
DROP POLICY IF EXISTS "Orders are viewable by everyone" ON public.orders;

-- Create secure policy for customers to view only their own orders
CREATE POLICY "Customers can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (customer_profile_id = get_current_user_profile_id());

-- 2. Fix customer_stats table - remove public SELECT access
DROP POLICY IF EXISTS "Customer stats are viewable by everyone" ON public.customer_stats;

-- Create secure policy for customers to view only their own stats
CREATE POLICY "Customers can view their own stats"
ON public.customer_stats
FOR SELECT
TO authenticated
USING (customer_id = get_current_user_profile_id());

-- 3. Create trigger function to log a visit when an order is placed
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create a visit if the order has a customer_profile_id
  IF NEW.customer_profile_id IS NOT NULL THEN
    INSERT INTO public.visits (customer_id, notes)
    VALUES (NEW.customer_profile_id, 'Order #' || NEW.id || ' - Table ' || NEW.table_number);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create trigger to automatically log visits when orders are created
CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_order();