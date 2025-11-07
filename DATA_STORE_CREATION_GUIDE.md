# Creating Discovery Engine Data Store - Import Source Selection

## Important: You Don't Need to Select an Import Source!

The import source options you're seeing (Website Content, BigQuery, Cloud Storage, etc.) are for **automatic data ingestion** during setup. 

**We're using manual API imports instead**, so you can:

1. **Skip this step** - If there's a "Skip" or "Continue" button
2. **Choose any option** - Just to proceed (you won't use it)
3. **Choose "Cloud Storage"** - If you want to set it up but not use it

---

## What to Do

### Option 1: Skip Import Source (Recommended)

1. Look for a **"Skip"**, **"Continue"**, or **"Create without data"** button
2. Click it to create an empty data store
3. We'll import data via API after creation

### Option 2: Choose Any Option (Just to Proceed)

If you must select something:
- Choose **"Cloud Storage"** (easiest to skip later)
- Or **"BigQuery"** 
- Or any option that lets you proceed

**Don't worry** - we won't use this import method. We'll import via API after the data store is created.

### Option 3: Use Cloud Storage (If You Want)

If you want to set up Cloud Storage as a backup method:

1. Select **"Cloud Storage"**
2. You can create an empty bucket or skip the configuration
3. We'll still use API imports primarily

---

## After Data Store Creation

Once the data store is created (empty is fine!), you'll import data using our scripts:

```bash
# 1. Export data from Supabase
npm run discovery:export

# 2. Import to Discovery Engine via API
npm run discovery:import
```

This uses the Discovery Engine API directly (the `importDocuments` method), which is independent of the import source you selected during creation.

---

## Why This Works

- **Data store creation** = Setting up the container (can be empty)
- **API import** = Adding data programmatically (what we do)
- The import source selection is just for **automatic ingestion** - we don't need it

---

## Summary

**Just create the data store with any option (or skip if possible).** The import source doesn't matter because we're importing via API after creation.

The important things are:
- ✅ Data store name: `urban-manual-destinations`
- ✅ Type: **Generic**
- ✅ Location: **Global** (or your preferred region)
- ✅ Data Store ID: Note this down!

Then use `npm run discovery:import` to add your data via API.

