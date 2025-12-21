# Chrome Browser Testing Plan for Urban Manual

## Overview

This document outlines a plan for **Claude Chrome Extension** to interactively test the Urban Manual website and identify improvements. Claude will directly browse, click, and interact with the site through the browser extension.

**Testing Approach**: Live browser interaction via Claude Chrome plugin
**Target URL**: https://www.urbanmanual.co (production) or http://localhost:3000 (dev)

---

## How This Works

```
┌─────────────────────────────────────────────────────────────┐
│              CLAUDE CHROME TESTING WORKFLOW                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User opens Urban Manual in Chrome                       │
│  2. User activates Claude Chrome extension                  │
│  3. Claude can see the page and interact with it            │
│  4. Claude tests features by clicking, typing, navigating   │
│  5. Claude reports issues found                             │
│  6. User asks Claude Code to fix issues in the codebase     │
│  7. Repeat until quality targets met                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Sessions

### Session Format
Each testing session should focus on one area. Ask Claude Chrome to:
1. Navigate to the relevant page
2. Test specific interactions
3. Note any issues (errors, broken UI, slow loads, etc.)
4. Report findings back

---

## Phase 1: Critical User Flows to Test

### Priority 1: Core Functionality (Test First)

#### 1.1 Homepage & Navigation

**Prompt for Claude Chrome:**
> "Go to urbanmanual.co. Check if the homepage loads correctly. Click on each navigation link and verify they work. Look for any broken images, console errors, or layout issues. Try the mobile menu if on mobile view."

**What to look for:**
- [ ] Page loads without errors
- [ ] All navigation links work
- [ ] Images load properly (no broken images)
- [ ] Destination cards are clickable
- [ ] Filters (city, category) update results
- [ ] No console errors visible

#### 1.2 Search Functionality

**Prompt for Claude Chrome:**
> "Use the search bar to search for 'restaurant london'. Check if results appear. Try searching for something that won't have results. Test the autocomplete suggestions."

**What to look for:**
- [ ] Search input accepts text
- [ ] Results appear within 3 seconds
- [ ] Autocomplete suggestions show while typing
- [ ] Empty state shown for no results
- [ ] Clicking a result navigates correctly

#### 1.3 Authentication Flow

**Prompt for Claude Chrome:**
> "Try to access /trips without being logged in. Then go to the login page and check if the OAuth buttons (Google, Apple) work. If logged in, test the logout flow."

**What to look for:**
- [ ] Protected routes redirect to login
- [ ] Login page renders correctly
- [ ] OAuth buttons initiate auth flow
- [ ] Logout clears session properly

---

### Priority 2: User Features

#### 2.1 Destination Pages

**Prompt for Claude Chrome:**
> "Navigate to any destination page (e.g., /destination/chiltern-firehouse). Check all sections load: images, map, description, related places. Try saving/bookmarking the destination."

**What to look for:**
- [ ] All content sections visible
- [ ] Images load correctly
- [ ] Map shows correct location
- [ ] Related destinations appear
- [ ] Save/heart button works

#### 2.2 Trip Planning (requires login)

**Prompt for Claude Chrome:**
> "Go to /trips and create a new trip. Add a destination to it. Try editing the trip name and dates. Test the AI itinerary generation if available."

**What to look for:**
- [ ] Can create new trip
- [ ] Can add destinations to trip
- [ ] Can edit trip details
- [ ] Changes persist after refresh
- [ ] Itinerary generation works

#### 2.3 User Account (requires login)

**Prompt for Claude Chrome:**
> "Go to /account. Check if profile info displays. Try editing profile fields and uploading a profile picture. Check privacy settings."

**What to look for:**
- [ ] Profile information displays
- [ ] Can edit and save changes
- [ ] Profile picture upload works
- [ ] Settings persist

---

### Priority 3: Advanced Features

#### 3.1 Collections

**Prompt for Claude Chrome:**
> "Go to /collections. Create a new collection, add some destinations to it, and try sharing it."

**What to look for:**
- [ ] Can create collection
- [ ] Can add destinations
- [ ] Share functionality works
- [ ] Collection persists

#### 3.2 AI Chat

**Prompt for Claude Chrome:**
> "Go to /chat. Send a message like 'recommend a restaurant in Paris'. Check if you get a response and if the conversation history works."

**What to look for:**
- [ ] Chat interface loads
- [ ] Can send messages
- [ ] AI responds within 10 seconds
- [ ] Conversation history shows

#### 3.3 Map Features

**Prompt for Claude Chrome:**
> "Go to /map. Check if the map loads with markers. Try zooming in/out and clicking on markers."

**What to look for:**
- [ ] Map tiles load
- [ ] Markers visible
- [ ] Zoom controls work
- [ ] Clicking markers shows info

---

### Priority 4: Admin Dashboard (requires admin account)

**Prompt for Claude Chrome:**
> "Go to /admin. Navigate through the different sections: destinations, architects, analytics. Try editing a destination."

**What to look for:**
- [ ] Admin dashboard accessible
- [ ] All sections load
- [ ] Can view/edit content
- [ ] Changes save correctly

---

## Phase 2: Issue Reporting Format

When Claude Chrome finds issues, report them in this format to Claude Code:

```
## Issue Found: [Brief Description]

**Page**: /path/to/page
**Severity**: Critical / High / Medium / Low
**Type**: Bug / UI / Performance / Accessibility

**Description**:
What happened vs. what was expected

**Steps to Reproduce**:
1. Go to [page]
2. Click [element]
3. Observe [issue]

**Console Errors** (if any):
[paste any errors seen]

**Screenshot Description**:
[describe what you see on screen]
```

---

## Phase 3: Claude Code Fix Workflow

After Claude Chrome reports issues, bring them to Claude Code (this terminal) to fix:

```
┌─────────────────────────────────────────────────────────────┐
│           CLAUDE CHROME → CLAUDE CODE WORKFLOW              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CLAUDE CHROME (Browser)          CLAUDE CODE (Terminal)   │
│  ─────────────────────────        ─────────────────────     │
│                                                             │
│  1. Test page/feature         →   (share findings)          │
│                                                             │
│  2. Find issue                →   3. Locate relevant code   │
│                                                             │
│  4. Describe issue            →   5. Implement fix          │
│                                                             │
│  6. Re-test the fix           →   7. Commit if working      │
│                                                             │
│  8. Move to next issue        →   (repeat)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Issue Categories & Response

| Issue Type | Example | Fix Action |
|------------|---------|------------|
| **Console Errors** | React hydration mismatch | Fix component rendering |
| **Broken Images** | 404 on image load | Fix image URL/source |
| **Navigation Failure** | Link doesn't work | Fix href/routing |
| **Form Not Submitting** | Button click no effect | Fix event handler |
| **API Errors** | 500 on data fetch | Fix API route |
| **Accessibility** | Missing alt text | Add accessibility attrs |
| **Performance** | Slow page load | Optimize bundle/queries |
| **Layout Issues** | Content overflow | Fix CSS/responsive |

---

## Phase 4: Testing Checklist

### Visual Quality
- [ ] Images render at correct aspect ratios
- [ ] Typography is consistent across pages
- [ ] Colors match design system
- [ ] Animations are smooth
- [ ] No layout overflow or broken elements

### Responsive (test with Chrome DevTools device mode)
- [ ] Mobile (< 640px)
- [ ] Tablet (640px - 1024px)
- [ ] Desktop (1024px+)

### Performance
- [ ] Pages load within 3 seconds
- [ ] No visible jank during scrolling
- [ ] Images lazy load appropriately

---

## Phase 5: Sample Testing Session

### Example Session: Homepage Testing

**You say to Claude Chrome:**
> "Go to urbanmanual.co. Test the homepage thoroughly:
> 1. Check if all images load
> 2. Click on the navigation links
> 3. Try the search bar with 'paris restaurant'
> 4. Click on a destination card
> 5. Open Chrome DevTools (F12) and check for console errors
> Report any issues you find."

**Claude Chrome will:**
1. Navigate to the site
2. Visually inspect the page
3. Click elements and observe behavior
4. Report findings

**Then bring findings here to Claude Code to fix.**

---

## Phase 6: Quick Reference Prompts

Copy-paste these prompts to Claude Chrome for quick testing:

### Full Site Smoke Test
> "Go to urbanmanual.co and test: homepage loads, search works, click a destination, check navigation links work. Open DevTools console and report any errors."

### Search Deep Test
> "On urbanmanual.co, test search extensively: try 'restaurant', try 'asdfasdf' (no results), test filters, test autocomplete. Report issues."

### Mobile Test
> "Open Chrome DevTools, set device to iPhone 14. Navigate urbanmanual.co - check mobile menu, scroll behavior, touch interactions."

### Authenticated Features
> "Log in to urbanmanual.co (I'll handle OAuth). Then test: create a trip, add a destination, go to account settings, create a collection."

### Performance Check
> "On urbanmanual.co, open DevTools Performance tab. Reload the page and report: load time, any long tasks, any layout shifts."

---

## Success Criteria

| Criteria | Target |
|----------|--------|
| Homepage loads without errors | Yes |
| All navigation links work | 100% |
| Search returns results | Yes |
| No console errors on main pages | 0 errors |
| Page load times | < 3 seconds |
| Mobile responsive | Works on mobile |
| Protected routes redirect properly | Yes |

---

## Getting Started

1. **Open Chrome** with Claude Chrome extension active
2. **Navigate to** `https://www.urbanmanual.co`
3. **Start with Priority 1** tests (homepage, search, auth)
4. **Report issues** to Claude Code using the format above
5. **I'll fix** the issues in the codebase
6. **Re-test** to verify fixes
7. **Move to Priority 2** and continue

---

*Plan created: December 2024*
*For: Claude Chrome Extension + Claude Code workflow*
