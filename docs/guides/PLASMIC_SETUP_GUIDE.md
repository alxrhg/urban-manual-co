# Plasmic Setup Guide - Push Your Design

## Current Status
✅ Plasmic is installed and configured  
✅ Component registration file created  
✅ Ready to recreate your homepage in Plasmic

---

## Step 1: Register Components in Plasmic Studio

1. **Open your Plasmic project:**
   - Go to: https://studio.plasmic.app/projects/pEZdPb88zvW8NfciQQQwSK

2. **Enable Code Components:**
   - Click on "Code Components" in the left sidebar
   - Click "Register Component"
   - You'll need to add components manually in Plasmic Studio

3. **Or use the registration file:**
   - The file `components/plasmic/register.tsx` is set up
   - It will register components when your app runs
   - Visit `/plasmic-host` in your local dev server to enable registration

---

## Step 2: Recreate Your Homepage Structure

Your current homepage has this structure:

```
Homepage
├── Header
├── Hero Section
│   ├── GreetingHero
│   └── SearchFiltersComponent
├── Main Content
│   ├── City/Category Pills
│   ├── View Toggle (Grid/Map)
│   ├── UniversalGrid (with DestinationCard items)
│   └── Pagination
├── Sections (conditional)
│   ├── TrendingSection
│   ├── SmartRecommendations
│   └── Other sections
└── Footer
```

### In Plasmic Studio:

1. **Delete the default "Homepage" component** (or rename it)

2. **Create a new Homepage component:**
   - Click "+" to add new component
   - Name it "Homepage"
   - Set it as a Page component

3. **Add your registered components:**
   - Drag `Header` to the top
   - Drag `GreetingHero` below header
   - Drag `SearchFiltersComponent` below greeting
   - Drag `UniversalGrid` for the destinations grid
   - Add `Footer` at the bottom

4. **Style and layout:**
   - Use Plasmic's layout tools to match your current design
   - Set spacing, colors, typography
   - Make it responsive

---

## Step 3: Sync Your Design

After designing in Plasmic:

```bash
# Sync changes to your codebase
npm run plasmic:sync

# Or watch for changes automatically
npm run plasmic:watch
```

---

## Step 4: Use Your Plasmic Homepage

You have two options:

### Option A: Replace Current Homepage
Update `app/page.tsx` to use the Plasmic component:

```tsx
import { PlasmicHomepage } from "@/components/plasmic/website_starter/PlasmicHomepage";

export default function Home() {
  return <PlasmicHomepage />;
}
```

### Option B: Keep Both (Recommended for now)
- Keep your current `app/page.tsx` as is
- Access Plasmic version at `/plasmic-homepage`
- Gradually migrate functionality

---

## Component Registration Details

The following components are set up for registration:

1. **GreetingHero** - Hero section with greeting
2. **DestinationCard** - Individual destination card
3. **SearchFiltersComponent** - Search and filters
4. **UniversalGrid** - Grid layout component
5. **Header** - Site header
6. **Footer** - Site footer

### To Add More Components:

Edit `components/plasmic/register.tsx` and add:

```tsx
PLASMIC.registerComponent(YourComponent, {
  name: "YourComponent",
  displayName: "Your Component",
  importPath: "@/components/YourComponent",
  props: {
    // Define editable props
  },
});
```

---

## Quick Start Checklist

- [ ] Open Plasmic Studio: https://studio.plasmic.app/projects/pEZdPb88zvW8NfciQQQwSK
- [ ] Start local dev server: `npm run dev`
- [ ] Visit `/plasmic-host` to enable component registration
- [ ] In Plasmic Studio, register your components (or they auto-register)
- [ ] Create new Homepage component
- [ ] Drag and drop your registered components
- [ ] Style to match your current design
- [ ] Run `npm run plasmic:sync` to sync changes
- [ ] Test the design

---

## Troubleshooting

### Components not showing in Plasmic?
1. Make sure dev server is running
2. Visit `/plasmic-host` page
3. Check browser console for registration errors
4. Components should appear in Plasmic Studio after registration

### Design not syncing?
1. Run `npm run plasmic:sync` manually
2. Check `plasmic.json` has correct project ID
3. Verify you're authenticated: `npx plasmic auth`

### Need help?
- Check Plasmic docs: https://docs.plasmic.app
- Your project: https://studio.plasmic.app/projects/pEZdPb88zvW8NfciQQQwSK

---

## Next Steps

1. **Start designing** in Plasmic Studio
2. **Sync regularly** with `npm run plasmic:sync`
3. **Test** your designs locally
4. **Iterate** and improve!

