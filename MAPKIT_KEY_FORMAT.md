# How to Format Apple MapKit Private Key in .env.local

## The Problem
The Apple MapKit private key from the `.p8` file needs to be in a specific format for the JWT library to work with ES256 algorithm.

## Solution: Two Ways to Format

### Option 1: Multi-line (Recommended - Easiest)

In your `.env.local`, paste the key exactly as it appears in the `.p8` file:

```env
MAPKIT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgYourPrivateKeyHere
anotherLineOfYourKey
andAnotherLine
lastLineOfKey==
-----END PRIVATE KEY-----"
```

**Important:**
- Keep the quotes around the entire key
- Keep all the newlines (press Enter after each line)
- Include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines

### Option 2: Single-line with \n

If you prefer one line, use `\n` for newlines:

```env
MAPKIT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgYourPrivateKeyHere\nanotherLineOfYourKey\nandAnotherLine\nlastLineOfKey==\n-----END PRIVATE KEY-----"
```

## Quick Test

After updating `.env.local`:

1. **Restart dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Check browser console:**
   - Go to http://localhost:3000/map-demo
   - Open DevTools (F12)
   - Look for "Apple Maps" in the console
   - Should see map loading, not errors

3. **If you see errors:**
   - Check the private key has proper BEGIN/END lines
   - Ensure no extra spaces or characters
   - Verify Team ID and Key ID are correct (10 characters each)

## Current Status

Your `.env.local` should have:
```env
MAPKIT_TEAM_ID=ABC123XYZ          # 10 characters
MAPKIT_KEY_ID=DEF456GHI           # 10 characters  
MAPKIT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
[your key here - multiple lines]
-----END PRIVATE KEY-----"
```

## What the Code Does Now

The updated `normalizePrivateKey` function will:
1. ✅ Handle escaped newlines (`\n`)
2. ✅ Remove extra quotes and whitespace
3. ✅ Ensure proper PEM headers
4. ✅ Format key body in 64-character lines (standard PEM format)
5. ✅ Work with both multi-line and single-line formats

Try it now and let me know if you see Apple Maps loading!
