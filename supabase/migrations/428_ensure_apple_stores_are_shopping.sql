-- Migration: Ensure all places starting with "apple" are categorized as Shopping (retail stores)
-- This applies to both new and existing destinations

-- 1. Update existing destinations that start with "apple" (case-insensitive)
UPDATE destinations
SET category = 'Shopping'
WHERE LOWER(name) LIKE 'apple%'
  AND category != 'Shopping';

-- 2. Create trigger function to automatically set category for Apple stores
CREATE OR REPLACE FUNCTION ensure_apple_stores_are_shopping()
RETURNS TRIGGER AS $$
BEGIN
  -- If name starts with "apple" (case-insensitive), set category to Shopping
  IF LOWER(NEW.name) LIKE 'apple%' THEN
    NEW.category := 'Shopping';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to run before insert or update
DROP TRIGGER IF EXISTS trigger_ensure_apple_stores_are_shopping ON destinations;
CREATE TRIGGER trigger_ensure_apple_stores_are_shopping
  BEFORE INSERT OR UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION ensure_apple_stores_are_shopping();

-- Success message
SELECT 'Migration completed! All Apple stores are now categorized as Shopping.' as status;

