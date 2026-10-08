-- Fail explicitly if existing policy families contain conflicting ACTIVE rows.
-- No existing version or rate is repaired or seeded by this migration.
DO $$ BEGIN
  IF EXISTS (SELECT code FROM pricing_rule_versions WHERE status = 'ACTIVE' GROUP BY code HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Multiple ACTIVE pricing versions exist. Review the conflicting family before applying this migration.';
  END IF;
END $$;
CREATE UNIQUE INDEX pricing_rule_versions_one_active_family ON pricing_rule_versions(code) WHERE status = 'ACTIVE';
