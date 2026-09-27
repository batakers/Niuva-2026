CREATE OR REPLACE FUNCTION "niuva_enforce_inquiry_reference"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_inquiry_ids UUID[];
  target_inquiry_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'b2b_inquiries' THEN
    IF TG_OP = 'DELETE' THEN
      target_inquiry_ids := ARRAY[OLD."id"];
    ELSIF TG_OP = 'INSERT' THEN
      target_inquiry_ids := ARRAY[NEW."id"];
    ELSE
      target_inquiry_ids := ARRAY[OLD."id", NEW."id"];
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    target_inquiry_ids := ARRAY[OLD."inquiry_id"];
  ELSIF TG_OP = 'INSERT' THEN
    target_inquiry_ids := ARRAY[NEW."inquiry_id"];
  ELSE
    target_inquiry_ids := ARRAY[OLD."inquiry_id", NEW."inquiry_id"];
  END IF;

  FOREACH target_inquiry_id IN ARRAY target_inquiry_ids
  LOOP
    IF EXISTS (
      SELECT 1
      FROM "b2b_inquiries"
      WHERE "id" = target_inquiry_id
        AND "current_stage" <> 'IDEA'
        AND NULLIF(BTRIM("reference_link"), '') IS NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "b2b_inquiry_files"
      WHERE "inquiry_id" = target_inquiry_id
    ) THEN
      RAISE EXCEPTION 'a B2B inquiry beyond IDEA needs a private file or reference link'
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;
