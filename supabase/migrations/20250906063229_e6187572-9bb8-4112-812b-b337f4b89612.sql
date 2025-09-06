-- Add delivered_at column to orders table
ALTER TABLE public.orders 
ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;

-- Create menu_items table for dynamic menu management
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'food',
  is_available BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on menu_items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Create policies for menu_items
CREATE POLICY "Menu items are viewable by everyone" 
ON public.menu_items 
FOR SELECT 
USING (true);

CREATE POLICY "Staff and admins can manage menu items" 
ON public.menu_items 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['staff'::user_role, 'admin'::user_role]));

-- Add trigger for updated_at on menu_items
CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample menu items
INSERT INTO public.menu_items (name, description, price, category) VALUES
('Classic Burger', 'Juicy beef patty with fresh lettuce, tomato, and our special sauce', 12.99, 'food'),
('Margherita Pizza', 'Fresh tomatoes, mozzarella, and basil on our homemade dough', 14.99, 'food'),
('Caesar Salad', 'Crisp romaine lettuce with parmesan cheese and Caesar dressing', 9.99, 'food'),
('Fish & Chips', 'Beer-battered fish with golden fries and tartar sauce', 16.99, 'food'),
('Pasta Carbonara', 'Creamy pasta with bacon, eggs, and parmesan cheese', 13.99, 'food'),
('Grilled Chicken', 'Tender grilled chicken breast with seasonal vegetables', 15.99, 'food'),
('Coca Cola', 'Classic refreshing cola', 2.99, 'drink'),
('Fresh Orange Juice', 'Freshly squeezed orange juice', 3.99, 'drink'),
('Coffee', 'Freshly brewed coffee', 2.49, 'drink'),
('Iced Tea', 'Refreshing iced tea with lemon', 2.99, 'drink');

-- Add index for better performance
CREATE INDEX idx_orders_status_delivered ON public.orders(status, delivered_at);
CREATE INDEX idx_menu_items_category_available ON public.menu_items(category, is_available);