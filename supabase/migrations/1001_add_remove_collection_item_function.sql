CREATE OR REPLACE FUNCTION remove_collection_item_for_user(
    p_user_id UUID,
    p_collection_id UUID,
    p_destination_slug TEXT
)
RETURNS void AS $$
BEGIN
    DELETE FROM collection_items ci
    WHERE ci.collection_id = p_collection_id
      AND ci.destination_slug = p_destination_slug
      AND EXISTS (
          SELECT 1
          FROM collections c
          WHERE c.id = ci.collection_id
            AND c.user_id = p_user_id
      );
END;
$$ LANGUAGE plpgsql;
