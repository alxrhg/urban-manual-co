# Update to Fix: Admin UPDATE and INSERT Operations

## User Feedback
> "now delete is working, but update destination ie update city name is still not working"

## Root Cause
The initial fix (migration 432) only added DELETE policies for admin users. The same issue existed for UPDATE and INSERT operations - they were missing RLS policies for authenticated admin users.

## Solution - Migration 433

Created `supabase/migrations/433_add_destinations_update_insert_policies.sql` to add:

### 1. UPDATE Policy for Admin Users
```sql
CREATE POLICY "Authenticated admin users can update destinations"
ON destinations FOR UPDATE
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
```

### 2. INSERT Policy for Admin Users
```sql
CREATE POLICY "Authenticated admin users can insert destinations"
ON destinations FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
```

## What This Enables

### Before Migration 433
- ❌ Admin users could NOT update destination fields (city, name, etc.)
- ❌ Admin users could NOT create new destinations via admin UI
- ✅ Admin users could delete (after migration 432)
- ✅ Admin users could read

### After Migration 433
- ✅ Admin users can update destination fields (city, name, etc.)
- ✅ Admin users can create new destinations via admin UI
- ✅ Admin users can delete
- ✅ Admin users can read

## Deployment Steps

### Step 1: Apply Migration 432 (if not done)
In Supabase SQL Editor, run:
```
supabase/migrations/432_add_destinations_delete_policy.sql
```

### Step 2: Apply Migration 433 (NEW - Required for UPDATE/INSERT)
In Supabase SQL Editor, run:
```
supabase/migrations/433_add_destinations_update_insert_policies.sql
```

### Step 3: Test All Operations
1. **UPDATE Test:**
   - Go to `/admin`
   - Edit a destination
   - Change the city name
   - Save
   - ✅ Should work now

2. **INSERT Test:**
   - Go to `/admin`
   - Click "Add Place"
   - Fill in details
   - Save
   - ✅ Should work now

3. **DELETE Test:**
   - Go to `/admin`
   - Delete a destination
   - ✅ Should still work (from migration 432)

## Complete Access Control

After BOTH migrations (432 + 433), the access control is:

| Operation | Anonymous | Regular User | Admin User | Service Role |
|-----------|-----------|--------------|------------|--------------|
| SELECT    | ✅ Yes    | ✅ Yes       | ✅ Yes     | ✅ Yes       |
| INSERT    | ❌ No     | ❌ No        | ✅ Yes     | ✅ Yes       |
| UPDATE    | ❌ No     | ❌ No        | ✅ Yes     | ✅ Yes       |
| DELETE    | ❌ No     | ❌ No        | ✅ Yes     | ✅ Yes       |

## Files Modified/Created

### Created
- `supabase/migrations/433_add_destinations_update_insert_policies.sql` (NEW)

### Updated
- `supabase_allow_destinations_access.sql` - Reference file with all policies
- `README_DELETE_FIX.md` - Updated quick guide for all operations

## Security
All operations use the same JWT-based admin role verification:
```sql
(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
```

This ensures:
- ✅ Server-side role validation
- ✅ Cannot be spoofed by client
- ✅ Requires valid JWT token
- ✅ Role is in app_metadata (not modifiable by user)

## Verification

After applying migration 433, verify with this query:
```sql
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'destinations' 
  AND cmd IN ('DELETE', 'UPDATE', 'INSERT')
ORDER BY cmd, roles;
```

Expected result: 6 policies
- 2 for DELETE (service_role + authenticated)
- 2 for UPDATE (service_role + authenticated)
- 2 for INSERT (service_role + authenticated)

## Commit
`a46d45a` - Add UPDATE and INSERT RLS policies for admin users to enable full CRUD operations
