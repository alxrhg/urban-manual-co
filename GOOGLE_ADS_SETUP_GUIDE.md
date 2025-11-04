# Google AdSense In-Feed Ads - Setup Guide

## ✅ Implementation Complete

In-Feed ads have been integrated into all major grid pages! They appear every 14 items and match your destination card design perfectly.

## Current Status

**Placeholder Slot ID**: `1234567890` (needs to be replaced)

The ads are already implemented in:
- ✓ Homepage destination grid (`app/page.tsx`)
- ✓ City page destination grid (`app/city/[city]/page-client.tsx`)
- ✓ Cities page grid (`app/cities/page.tsx`)

## Next Steps

### 1. Create Ad Units in Google AdSense

1. Go to [Google AdSense Dashboard](https://www.google.com/adsense/)
2. Navigate to **Ads** → **By ad unit** → **In-feed ads**
3. Click **New ad unit** → **In-feed**
4. Configure your ad:
   - **Name**: "Urban Manual In-Feed"
   - **Choose your layout**: Select a card-style layout
   - **Customize**: Keep minimal to match your design
5. Click **Save and get code**
6. Copy the **data-ad-slot** ID (looks like `1234567890`)

### 2. Replace Placeholder Slot IDs

Search for `'1234567890'` in these files and replace with your actual slot ID:

```bash
# Search command
grep -r "1234567890" app/
```

**Files to update:**
- `app/page.tsx` (line ~826)
- `app/city/[city]/page-client.tsx` (line ~265)
- `app/cities/page.tsx` (line ~211)

**Example replacement:**
```tsx
// Before
slot={item.data.slot} // slot is '1234567890'

// After (once you have your slot ID from AdSense)
slot="9876543210" // Your actual AdSense slot ID
```

### 3. Test in Development

Run your development server:
```bash
npm run dev
```

**Note**: Ads won't display in development. You'll see empty spaces where ads should be. This is normal.

### 4. Deploy to Production

Once deployed, Google will review your site and start showing ads within 24-48 hours.

## Ad Placement Strategy

### Current Implementation
- **Frequency**: Every 14 items
- **Grid integration**: Ads appear as card items matching your design
- **Responsive**: Works across all screen sizes
- **Non-intrusive**: Ads never appear at the very end of lists

### Example Grid Layout
```
[Destination] [Destination] [Destination] [Destination] [Destination] [Destination] [Destination]
[Destination] [Destination] [Destination] [Destination] [Destination] [Destination] [Destination]
[AD CARD]     [Destination] [Destination] [Destination] [Destination] [Destination] [Destination]
[Destination] [Destination] [Destination] [Destination] [Destination] [Destination] [Destination]
```

## Design Details

The `InFeedAd` component creates ads that:
- Match your card aspect ratio (square)
- Use rounded-2xl borders
- Include subtle "Sponsored" label
- Blend seamlessly with destination cards
- Scale with grid layout (2-7 columns responsive)

## Monitoring Performance

After ads are live:
1. Check [AdSense Reports](https://www.google.com/adsense/reports)
2. Monitor:
   - Impressions
   - Click-through rate (CTR)
   - Revenue
   - Viewability
3. Adjust placement if needed (change the `% 14` frequency)

## Troubleshooting

### Ads not showing
- Wait 24-48 hours after deployment
- Check AdSense account is approved
- Verify ads.txt is accessible at `yourdomain.com/ads.txt`
- Check browser console for errors

### Ads look bad
- Use different ad format (try "Matched content" style)
- Reduce frequency (change `% 14` to `% 21`)
- Add more wrapper styling if needed

### Revenue is low
- Increase ad frequency (change `% 14` to `% 10`)
- Add display ads between sections
- Optimize ad placement based on heatmaps

## Optional: Multiple Ad Units

You can create different ad units for different pages:

```tsx
// Homepage
<InFeedAd slot="1111111111" />

// City pages
<InFeedAd slot="2222222222" />

// Cities page
<InFeedAd slot="3333333333" />
```

This allows you to track performance per page type.

## Questions?

Check the [AdSense Help Center](https://support.google.com/adsense) or review `GOOGLE_ADS_INTEGRATION.md` for component details.
