# Migration Cleanup Guide

## Current Status
- **Total migration files**: 40
- **Tracked in database**: 9
- **Confirmed applied**: 6 (416-421)

## Step-by-Step Cleanup Process

### Step 1: Check Which Migrations Are Applied

Run `CHECK_MIGRATION_OBJECTS.sql` in Supabase SQL Editor. This will show you which migrations are actually applied by checking for their database objects.

### Step 2: Identify Migrations to Delete

Based on the results, identify migrations that are:
- ✅ **Applied** - Safe to delete (backed up first)
- ❌ **Not Applied** - Keep these
- ⚠️ **Partial** - Review manually

### Step 3: Edit Deletion Script

Open `scripts/delete-applied-migrations.sh` and add confirmed applied migration filenames to the `MIGRATIONS_TO_DELETE` array:

```bash
MIGRATIONS_TO_DELETE=(
    "416_enable_rls_co_visit_signals.sql"
    "417_fix_all_security_issues.sql"
    "418_fix_additional_function_security.sql"
    "419_fix_user_profiles_rls.sql"
    "420_add_nested_destinations.sql"
    "421_ensure_michelin_is_dining.sql"
    # Add more confirmed applied migrations here
)
```

### Step 4: Run Deletion Script

```bash
./scripts/delete-applied-migrations.sh
```

This will:
- ✅ Create backups in `supabase/migrations_backup_[timestamp]/`
- ✅ Delete only the specified migration files
- ✅ Ask for confirmation before deleting

## ⚠️ Important Notes

### DO NOT DELETE:
- **999_cleanup_old_tables.sql** - This is a cleanup script, not a migration
- Any migration that shows "❌ Not Applied" in the check
- Migrations you're unsure about

### Safe to Delete:
- Migrations confirmed as "✅ Applied" in the check
- Old migrations that have been superseded
- Duplicate migrations

### Backup Strategy:
- All deleted files are automatically backed up
- Backups are timestamped: `migrations_backup_YYYYMMDD_HHMMSS/`
- You can restore from backup if needed

## Quick Reference

### Check Migration Status
```sql
-- Run in Supabase SQL Editor
-- File: CHECK_MIGRATION_OBJECTS.sql
```

### Delete Applied Migrations
```bash
# Edit the script first, then run:
./scripts/delete-applied-migrations.sh
```

### Restore from Backup
```bash
# If you need to restore:
cp supabase/migrations_backup_[timestamp]/*.sql supabase/migrations/
```

## Migration File Organization

After cleanup, you should have:
- **Active migrations**: Migrations not yet applied
- **Applied migrations**: Deleted (backed up)
- **Cleanup scripts**: Kept (like 999_cleanup_old_tables.sql)

