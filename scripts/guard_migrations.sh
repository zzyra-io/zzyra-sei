#!/usr/bin/env bash
set -euo pipefail
# Wraps DDL statements in migrations with table-existence checks

MIGRATIONS_DIR="$(pwd)/supabase/migrations"
for file in "$MIGRATIONS_DIR"/*.sql; do
  echo "Guarding $file"
  awk 'BEGIN {inblock=0} \
    /^(ALTER TABLE|CREATE TABLE|CREATE INDEX|DROP POLICY|CREATE POLICY).*public\./ { \
      table=""; \
      if (match($0, /TABLE[ ]+public\.([a-z_]+)/, arr)) table=arr[1]; \
      else if (match($0, /public\.([a-z_]+)/, arr)) table=arr[1]; \
      if (table) { \
        print "DO $$\nBEGIN\n  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='"'"'public'"'"' AND table_name='" table "') THEN"; \
        inblock=1; \
      } \
    } \
    { print } \
    /^;[ ]*$/ && inblock { print "  END IF;\nEND$$;"; inblock=0 }' "$file" | \
    sponge "$file"
done

echo "All migrations guarded."
