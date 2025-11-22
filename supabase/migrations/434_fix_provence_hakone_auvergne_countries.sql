-- Fix country mappings for Provence, Hakone, and Auvergne
-- This migration ensures all destinations in these regions have the correct country
-- Handles all variations including hyphenated city names

-- Provence is in France (handle all variations including "provence-alpes-côte-d-azur")
UPDATE destinations
SET country = 'France'
WHERE LOWER(city) LIKE '%provence%'
AND (country IS NULL OR country != 'France');

-- Hakone is in Japan
UPDATE destinations
SET country = 'Japan'
WHERE LOWER(city) = 'hakone' 
AND (country IS NULL OR country != 'Japan');

-- Auvergne is in France (handle all variations including "auvergne-rhône-alpes")
UPDATE destinations
SET country = 'France'
WHERE LOWER(city) LIKE '%auvergne%'
AND (country IS NULL OR country != 'France');

-- Log the changes
DO $$
DECLARE
  provence_count INTEGER;
  hakone_count INTEGER;
  auvergne_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO provence_count 
  FROM destinations 
  WHERE LOWER(city) LIKE '%provence%' AND country = 'France';
  
  SELECT COUNT(*) INTO hakone_count 
  FROM destinations 
  WHERE LOWER(city) = 'hakone' AND country = 'Japan';
  
  SELECT COUNT(*) INTO auvergne_count 
  FROM destinations 
  WHERE LOWER(city) LIKE '%auvergne%' AND country = 'France';
  
  RAISE NOTICE 'Updated destinations: Provence (France): %, Hakone (Japan): %, Auvergne (France): %',
    provence_count, hakone_count, auvergne_count;
END $$;

