# Supabase New Keys Migration Checklist

## ✅ Completed

- [x] Code updated to support both old and new key names
- [x] New keys are checked first, legacy keys as fallback
- [x] All API routes updated
- [x] All lib files updated
- [x] Migration guide created

## 📋 To Do

### 1. Get New Keys from Supabase
- [ ] Go to: https://supabase.com/dashboard/project/avdnefdfwvpjkuanhdwk/settings/api
- [ ] Copy **Publishable key** (starts with `sb_publishable_...`)
- [ ] Copy **Secret key** (starts with `sb_secret_...`)

### 2. Update Vercel Environment Variables
- [ ] Go to Vercel project → Settings → Environment Variables
- [ ] Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = (your publishable key)
- [ ] Add `SUPABASE_SECRET_KEY` = (your secret key)
- [ ] Set for all environments (Production, Preview, Development)
- [ ] **Keep old keys** during transition

### 3. Test Locally (Optional)
- [ ] Add new keys to `.env.local`
- [ ] Run `npm run dev`
- [ ] Test Supabase operations (login, queries, etc.)

### 4. Deploy
- [ ] Push changes (code is already updated)
- [ ] Vercel will automatically use new keys
- [ ] Monitor for any errors

### 5. Verify (Wait 24-48 hours)
- [ ] Check production logs
- [ ] Verify all Supabase operations work
- [ ] Test authentication
- [ ] Test database queries
- [ ] Test RLS policies

### 6. Clean Up (After Verification)
- [ ] Remove `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Vercel
- [ ] Remove `SUPABASE_SERVICE_ROLE_KEY` from Vercel
- [ ] Remove from `.env.local` if added

## 🔗 Quick Links

- **Supabase Dashboard**: https://supabase.com/dashboard/project/avdnefdfwvpjkuanhdwk
- **API Settings**: https://supabase.com/dashboard/project/avdnefdfwvpjkuanhdwk/settings/api
- **Project ID**: `avdnefdfwvpjkuanhdwk`

## 📝 Notes

- New keys work as drop-in replacements
- Code automatically prefers new keys if available
- Legacy keys still work as fallback
- No downtime expected during migration
- Can rollback by keeping legacy keys

