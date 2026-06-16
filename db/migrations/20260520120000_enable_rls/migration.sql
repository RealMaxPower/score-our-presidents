-- Enable row-level security on every public-schema table.
--
-- The app accesses Postgres via Prisma using the database owner role, which
-- bypasses RLS — so enabling RLS with zero policies locks out the Supabase
-- PostgREST `anon` / `authenticated` roles (the exposure surface flagged by
-- the advisor) without affecting application reads or writes.
--
-- Clears the Supabase advisors `rls_disabled_in_public` and
-- `sensitive_columns_exposed` for tables holding emails, OAuth tokens,
-- session tokens, and audit data.

-- Backfill: every existing public table.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- Forward coverage: event trigger that flips RLS on any future table
-- created in `public`. Without this, the next `prisma migrate` that adds a
-- table would re-open the advisor warnings until someone remembers to add
-- another enable-RLS migration.
CREATE OR REPLACE FUNCTION public.enforce_rls_on_new_tables()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag = 'CREATE TABLE'
      AND object_type = 'table'
      AND schema_name = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS enforce_rls_on_new_tables;
CREATE EVENT TRIGGER enforce_rls_on_new_tables
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION public.enforce_rls_on_new_tables();
