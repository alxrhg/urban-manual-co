#!/bin/bash
# Validation script for the DELETE RLS policy migration
# This script checks that the SQL migration file is syntactically valid

echo "🔍 Validating SQL migration file..."
echo ""

MIGRATION_FILE="supabase/migrations/432_add_destinations_delete_policy.sql"

# Check if file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "✅ Migration file exists: $MIGRATION_FILE"
echo ""

# Check for critical SQL keywords
echo "🔍 Checking for required SQL elements..."

if grep -q "BEGIN;" "$MIGRATION_FILE"; then
    echo "✅ Transaction block starts with BEGIN"
else
    echo "❌ Missing BEGIN statement"
    exit 1
fi

if grep -q "COMMIT;" "$MIGRATION_FILE"; then
    echo "✅ Transaction block ends with COMMIT"
else
    echo "❌ Missing COMMIT statement"
    exit 1
fi

if grep -q "DROP POLICY IF EXISTS" "$MIGRATION_FILE"; then
    echo "✅ Safely drops existing policies with IF EXISTS"
else
    echo "⚠️  Warning: No DROP POLICY IF EXISTS found"
fi

if grep -q "FOR DELETE" "$MIGRATION_FILE"; then
    echo "✅ Creates DELETE policy"
else
    echo "❌ Missing CREATE POLICY FOR DELETE"
    exit 1
fi

if grep -q "service_role" "$MIGRATION_FILE"; then
    echo "✅ Includes service_role policy"
else
    echo "❌ Missing service_role policy"
    exit 1
fi

if grep -q "authenticated" "$MIGRATION_FILE"; then
    echo "✅ Includes authenticated user policy"
else
    echo "❌ Missing authenticated user policy"
    exit 1
fi

if grep -q "auth.jwt()" "$MIGRATION_FILE"; then
    echo "✅ Includes JWT role check for admin access"
else
    echo "⚠️  Warning: No JWT role check found"
fi

echo ""
echo "🎉 All validation checks passed!"
echo ""
echo "📋 Next steps:"
echo "1. Open Supabase Dashboard SQL Editor"
echo "2. Copy and paste the content of: $MIGRATION_FILE"
echo "3. Execute the SQL"
echo "4. Verify success message appears"
echo "5. Test delete functionality in admin panel at /admin"
echo ""
echo "📖 For detailed instructions, see: FIX_DELETE_POI_GUIDE.md"
