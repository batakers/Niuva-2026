-- The original deferred ownership trigger serves both link tables and
-- stored_files.  Link rows expose file_id, whereas stored_files exposes id.
-- Select the correct field by trigger table so ordinary PENDING uploads and
-- later ownership verification are both executable.
CREATE OR REPLACE FUNCTION "niuva_enforce_file_ownership_integrity"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_file_ids UUID[];
  target_file_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'stored_files' THEN
    IF TG_OP = 'DELETE' THEN
      target_file_ids := ARRAY[OLD."id"];
    ELSIF TG_OP = 'INSERT' THEN
      target_file_ids := ARRAY[NEW."id"];
    ELSE
      target_file_ids := ARRAY[OLD."id", NEW."id"];
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    target_file_ids := ARRAY[OLD."file_id"];
  ELSIF TG_OP = 'INSERT' THEN
    target_file_ids := ARRAY[NEW."file_id"];
  ELSE
    target_file_ids := ARRAY[OLD."file_id", NEW."file_id"];
  END IF;

  FOREACH target_file_id IN ARRAY target_file_ids
  LOOP
    IF EXISTS (
      SELECT 1
      FROM "b2b_inquiry_files"
      WHERE "file_id" = target_file_id
    )
    AND EXISTS (
      SELECT 1
      FROM "custom_print_request_files"
      WHERE "file_id" = target_file_id
    ) THEN
      RAISE EXCEPTION 'a stored file cannot belong to more than one domain owner'
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM "stored_files"
      WHERE "id" = target_file_id
        AND "upload_status" = 'VERIFIED'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "b2b_inquiry_files"
      WHERE "file_id" = target_file_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "custom_print_request_files"
      WHERE "file_id" = target_file_id
    ) THEN
      RAISE EXCEPTION 'a verified stored file must have one domain owner'
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;
