-- Fix orphaned orders by linking them to existing admin user
UPDATE orders 
SET customer_profile_id = (
  SELECT id FROM profiles 
  WHERE email = 'munguambelayre@gmail.com' 
  LIMIT 1
)
WHERE customer_profile_id IS NULL;