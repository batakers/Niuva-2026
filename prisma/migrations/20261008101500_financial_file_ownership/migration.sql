-- Extend the existing deferred ownership invariant to expense evidence.
-- No old migration or existing file is changed; CUSTOMER_UPLOAD keeps its
-- original B2B/Custom Print ownership requirement.
CREATE OR REPLACE FUNCTION niuva_enforce_file_ownership_integrity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_file_ids UUID[];
  target_file_id UUID;
  file_purpose "StoredFilePurpose";
  file_status "StoredFileStatus";
  b2b_count INTEGER;
  custom_count INTEGER;
  expense_count INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'stored_files' THEN
    IF TG_OP = 'INSERT' THEN target_file_ids := ARRAY[NEW.id];
    ELSIF TG_OP = 'DELETE' THEN target_file_ids := ARRAY[OLD.id];
    ELSE target_file_ids := ARRAY[OLD.id, NEW.id]; END IF;
  ELSIF TG_TABLE_NAME = 'expense_entries' THEN
    IF TG_OP = 'INSERT' THEN target_file_ids := ARRAY[NEW.proof_file_id];
    ELSIF TG_OP = 'DELETE' THEN target_file_ids := ARRAY[OLD.proof_file_id];
    ELSE target_file_ids := ARRAY[OLD.proof_file_id, NEW.proof_file_id]; END IF;
  ELSE
    IF TG_OP = 'INSERT' THEN target_file_ids := ARRAY[NEW.file_id];
    ELSIF TG_OP = 'DELETE' THEN target_file_ids := ARRAY[OLD.file_id];
    ELSE target_file_ids := ARRAY[OLD.file_id, NEW.file_id]; END IF;
  END IF;
  FOREACH target_file_id IN ARRAY target_file_ids LOOP
    IF target_file_id IS NULL THEN CONTINUE; END IF;
    SELECT purpose, upload_status INTO file_purpose, file_status FROM stored_files WHERE id = target_file_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    SELECT COUNT(*) INTO b2b_count FROM b2b_inquiry_files WHERE file_id = target_file_id;
    SELECT COUNT(*) INTO custom_count FROM custom_print_request_files WHERE file_id = target_file_id;
    SELECT COUNT(*) INTO expense_count FROM expense_entries WHERE proof_file_id = target_file_id;
    IF b2b_count + custom_count + expense_count > 1
       OR (file_purpose = 'FINANCIAL_EVIDENCE' AND b2b_count + custom_count > 0)
       OR (file_purpose = 'CUSTOMER_UPLOAD' AND expense_count > 0) THEN
      RAISE EXCEPTION 'a stored file cannot belong to more than one domain owner or a different purpose' USING ERRCODE = '23514';
    END IF;
    IF file_status = 'VERIFIED' AND b2b_count + custom_count + expense_count <> 1 THEN
      RAISE EXCEPTION 'a verified stored file must have one domain owner' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER expense_file_ownership_check
AFTER INSERT OR UPDATE OR DELETE ON expense_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION niuva_enforce_file_ownership_integrity();
