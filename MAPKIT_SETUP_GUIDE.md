# Apple MapKit JS Setup Guide

The Apple Map component requires MapKit JS credentials to function. Without these credentials, you'll see a fallback message with a link to open Apple Maps directly.

## Quick Setup (5 minutes)

### 1. Get Apple Developer Credentials

You need an **Apple Developer Account** (free or paid).

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Keys** from the sidebar
4. Click **+** to create a new key

### 2. Create a MapKit JS Key

1. Enter a **Key Name** (e.g., "MapKit JS Key")
2. Check the box for **MapKit JS**
3. Click **Continue**, then **Register**
4. **Download the `.p8` file** - you can only download this once!
5. Note your:
   - **Team ID** (10 characters, found in the top right of Apple Developer portal)
   - **Key ID** (10 characters, shown after creating the key)

### 3. Add Environment Variables

Add these to your `.env.local` file:

```bash
# Apple MapKit JS Configuration
MAPKIT_TEAM_ID=ABC123XYZ          # Your 10-character Team ID
MAPKIT_KEY_ID=DEF456GHI           # Your 10-character Key ID
MAPKIT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSMxxxxxxxx...
(paste your entire .p8 file contents here)
...xxxxxxxxxxxxxxxx
-----END PRIVATE KEY-----

# Optional: Public site URL for token origin validation
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 4. Format the Private Key

**Option A: One-line format with escaped newlines**
```bash
MAPKIT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGB...\n-----END PRIVATE KEY-----
```

**Option B: Multi-line format (recommended)**
```bash
MAPKIT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSMxxxxxxxx...
...xxxxxxxxxxxxxxxx
-----END PRIVATE KEY-----"
```

### 5. Restart Your Dev Server

```bash
npm run dev
# or
pnpm dev
```

## Troubleshooting

### 🔍 Verify Your Credentials

**Test your configuration:**
```bash
curl http://localhost:3000/api/mapkit-verify
```

This will check:
- ✅ All three env vars are present
- ✅ Team ID is exactly 10 characters
- ✅ Key ID is exactly 10 characters
- ✅ Private key has proper BEGIN/END markers

**Example response (valid):**
```json
{
  "status": "valid",
  "allValid": true,
  "checks": {
    "teamId": { "valid": true, "length": 10 },
    "keyId": { "valid": true, "length": 10 },
    "privateKey": { "valid": true }
  },
  "issues": []
}
```

**Example response (invalid):**
```json
{
  "status": "invalid",
  "allValid": false,
  "issues": [
    "MAPKIT_TEAM_ID should be 10 characters, got 8"
  ]
}
```

### Common Issues

#### Map shows "MapKit credentials invalid"
- Your credentials are configured but wrong
- Run `/api/mapkit-verify` to check format
- Verify Team ID and Key ID from Apple Developer portal
- Ensure you downloaded the correct `.p8` file
- Check that the Key has MapKit JS enabled

#### Map shows "Map preview unavailable"
- Credentials are missing entirely
- Add all three env vars to `.env.local`
- Restart your dev server after adding

#### Map loads but shows error
- Verify your Team ID and Key ID are correct (10 characters each)
- Ensure the MapKit JS service is enabled for your key in Apple Developer portal
- Check that the `.p8` file contents are copied correctly without modification

#### Token authentication fails
- Check the API route logs: `app/api/mapkit-token/route.ts`
- Verify the `NEXT_PUBLIC_SITE_URL` matches your actual domain
- For local development, http://localhost should work automatically

## How It Works

1. **Client requests map** → AppleMap component loads
2. **Component initializes MapKit** → Fetches JWT token from `/api/mapkit-token`
3. **Server generates token** → Uses your credentials to sign a JWT
4. **MapKit authenticates** → Token is valid for 1 hour
5. **Map renders** → Shows interactive Apple Map

## No Credentials? No Problem!

If you don't configure MapKit credentials, the app will still work:
- A friendly fallback UI will appear
- Users can click "View in Apple Maps" to open the location externally
- No functionality is broken, just the embedded map preview

## Security Notes

- ✅ Private key is only used server-side (API route)
- ✅ JWT tokens expire after 1 hour
- ✅ Tokens are not cached
- ⚠️ Never commit `.env.local` to version control
- ⚠️ Add `.env.local` to your `.gitignore`

## Cost

MapKit JS is **free** with the following limits:
- 250,000 map views per day
- 25,000 service requests per day

For most applications, this is more than enough.

## Resources

- [MapKit JS Documentation](https://developer.apple.com/documentation/mapkitjs)
- [Creating MapKit JS Keys](https://developer.apple.com/documentation/mapkitjs/creating_a_maps_identifier_and_a_private_key)
- [JWT Token Format](https://developer.apple.com/documentation/mapkitjs/creating_and_using_tokens_with_mapkit_js)

---

**Need help?** Check the browser console for detailed error messages or contact support.
