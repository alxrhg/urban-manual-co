# Fix: Enable POI/Destination Delete in Admin CMS

## Problem
The admin GUI and POI edit mode cannot delete destinations because the Supabase Row Level Security (RLS) DELETE policy is missing for the `destinations` table.

## Root Cause
The `destinations` table has RLS policies for:
- ✅ **SELECT** - Anyone can read (public data)
- ✅ **INSERT** - Service role only
- ✅ **UPDATE** - Service role only
- ❌ **DELETE** - **MISSING** (causes delete operations to fail)

## Solution
Add DELETE policies for:
1. **Service role** - For backend operations
2. **Authenticated admin users** - For admin UI operations

## How to Apply the Fix

### Option 1: Run the Migration (Recommended)
1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: **SQL Editor**
3. Copy the contents of `supabase/migrations/432_add_destinations_delete_policy.sql`
4. Paste and run the SQL in the editor
5. Verify the success message appears

### Option 2: Run via Supabase CLI (If you have it installed)
```bash
# Make sure you're in the project directory
cd /path/to/urban-manual

# Apply the migration
supabase db push
```

### Option 3: Manual Application
If you prefer to apply manually, run this SQL in Supabase SQL Editor:

```sql
-- Add DELETE policy for service_role
CREATE POLICY "Service role can delete destinations"
ON destinations FOR DELETE
TO service_role
USING (true);

-- Add DELETE policy for authenticated admin users
CREATE POLICY "Authenticated admin users can delete destinations"
ON destinations FOR DELETE
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
```

## Verification Steps

### 1. Check Policy Exists
Run this query in Supabase SQL Editor:
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'destinations'
ORDER BY cmd, policyname;
```

You should see DELETE policies listed.

### 2. Test in Admin Panel
1. Go to your admin panel: `/admin`
2. Click on any destination's "Edit" button
3. Click "Delete Destination"
4. Confirm the deletion
5. Verify the destination is deleted from the list

### 3. Test in POI Drawer
1. Navigate to the map or any page with POI drawer
2. Edit a destination
3. Click "Delete Destination" button
4. Confirm deletion
5. Verify the destination is removed

## Security Considerations

### ✅ What This Fix Does
- Allows **service_role** to delete (backend operations remain secure)
- Allows **authenticated users with admin role** to delete via UI
- Maintains public read access for all users
- Keeps INSERT/UPDATE restricted to service_role

### ✅ What This Fix Does NOT Do
- Does NOT allow anonymous users to delete
- Does NOT allow regular authenticated users to delete
- Does NOT change any other security policies

### Admin Role Check
The policy checks for admin role using:
```sql
(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
```

This ensures only users with `app_metadata.role = 'admin'` can delete destinations.

## Files Modified
- ✅ `supabase/migrations/432_add_destinations_delete_policy.sql` (NEW)
- ✅ `supabase_allow_destinations_access.sql` (UPDATED for reference)

## Troubleshooting

### Error: "new row violates row-level security policy"
**Solution:** Make sure you've applied the migration and your user has the admin role set in Supabase.

### Error: "permission denied for table destinations"
**Solution:** RLS might not be enabled. Check with:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'destinations';
```

### Delete Still Not Working
1. Clear browser cache and cookies
2. Log out and log back in (refreshes JWT token)
3. Verify your user has admin role:
```sql
SELECT 
  id, 
  email, 
  raw_app_meta_data->'role' as role 
FROM auth.users 
WHERE email = 'your-email@example.com';
```

## Code Context

### Where Delete is Called

#### POIDrawer Component
File: `components/POIDrawer.tsx` (lines 262-301)
```typescript
const handleDelete = async () => {
  const supabase = createClient();
  const { error } = await supabase
    .from('destinations')
    .delete()
    .eq('slug', destination.slug);
  // ...
};
```

#### Admin Page Component
File: `app/admin/page.tsx` (lines 1010-1037)
```typescript
const handleDeleteDestination = (slug: string, name: string) => {
  confirm({
    onConfirm: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('slug', slug);
      // ...
    }
  });
};
```

Both use the Supabase client's `.delete()` method, which requires proper RLS policies to work.

## Next Steps After Applying
1. ✅ Apply the migration (see above)
2. ✅ Test delete functionality in admin panel
3. ✅ Test delete functionality in POI drawer
4. ✅ Verify logs show successful deletions
5. ✅ Confirm no security vulnerabilities

## Questions?
If you encounter any issues:
1. Check the Supabase logs for detailed error messages
2. Verify your authentication token is valid
3. Ensure your user account has the admin role
4. Contact the development team if the issue persists
