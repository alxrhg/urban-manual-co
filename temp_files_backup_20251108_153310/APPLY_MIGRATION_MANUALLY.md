# Apply Migration Manually (Due to Connection Timeout)

Since the CLI connection is timing out, apply the migration manually via Supabase Dashboard.

## Step-by-Step

### 1. Open Supabase Dashboard
- Go to https://supabase.com/dashboard
- Select your project
- Check if project is paused (if so, restore it first)

### 2. Open SQL Editor
- Click **SQL Editor** in the left sidebar
- Click **New Query**

### 3. Copy Migration SQL
Open this file and copy ALL its contents:
```
supabase/migrations/421_ensure_michelin_is_dining.sql
```

### 4. Paste and Run
- Paste the SQL into the SQL Editor
- Click **Run** (or press Cmd+Enter)
- Wait for "Success" message

### 5. Verify
Run this query to verify:
```sql
-- Check if constraint exists
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'destinations' 
  AND constraint_name = 'chk_michelin_is_dining';

-- Check if trigger exists
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_ensure_michelin_is_dining';
```

## Migration Content

The migration does:
1. ✅ Updates existing destinations with Michelin stars to category 'Dining'
2. ✅ Creates trigger to auto-enforce this rule
3. ✅ Adds database constraint to prevent invalid data

## After Applying

Once the connection issue is resolved, you can verify with CLI:
```bash
npx supabase migration list
```

