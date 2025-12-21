# Authentication Experience Testing Plan for Urban Manual

## Overview

This document outlines a comprehensive testing plan for Claude Chrome to evaluate the complete authentication experience on Urban Manual, including login, logout, OAuth flows, protected routes, and session management.

**Target URL**: https://www.urbanmanual.co

---

## Test Objectives

1. Verify all authentication flows work correctly
2. Test protected route behavior for unauthenticated users
3. Validate OAuth integration (Google, Apple)
4. Check session persistence and logout
5. Evaluate auth-related UX and error handling
6. Test edge cases and error scenarios

---

## Phase 1: Unauthenticated User Experience

### Prompt for Claude Chrome:

> "Test the unauthenticated experience on urbanmanual.co:
>
> **Public Pages (should work without login):**
> 1. Go to homepage (/) - loads normally?
> 2. Go to /cities - accessible?
> 3. Go to /destination/chiltern-firehouse - can view?
> 4. Go to /map - map loads?
> 5. Go to /search - search works?
> 6. Go to /discover - accessible?
>
> **Protected Routes (should redirect to login):**
> 1. Go to /trips - what happens?
> 2. Go to /account - redirects?
> 3. Go to /collections - behavior?
> 4. Go to /admin - behavior? (should block)
>
> **Auth-Gated Actions:**
> 1. On a destination page, try to save/heart it
> 2. Try to add a destination to a trip
> 3. Try to create a collection
> - Does it prompt login or show error?
>
> **Navigation State:**
> - What does the nav show for logged-out users?
> - Is there a clear 'Sign In' or 'Log In' button?
> - Is there a 'Sign Up' option?
>
> Report all findings about unauthenticated behavior."

### Checklist:

**Public Routes**
- [ ] Homepage (/) accessible
- [ ] /cities accessible
- [ ] /destination/[slug] accessible
- [ ] /map accessible
- [ ] /search accessible
- [ ] /discover accessible
- [ ] /architects accessible
- [ ] /brands accessible

**Protected Routes**
- [ ] /trips redirects to login
- [ ] /account redirects to login
- [ ] /collections redirects to login
- [ ] /admin blocks non-admin users

**Auth-Gated Actions**
- [ ] Save/heart prompts login
- [ ] Add to trip prompts login
- [ ] Create collection prompts login
- [ ] Clear messaging shown

**Navigation**
- [ ] Sign In button visible
- [ ] Sign Up option available
- [ ] No user avatar shown
- [ ] No account menu visible

---

## Phase 2: Login Page Experience

### Prompt for Claude Chrome:

> "Navigate to the login page and thoroughly test it:
>
> **Finding Login:**
> 1. From homepage, find and click login/sign in
> 2. Note the path (e.g., /auth/login, /login)
>
> **Page Layout:**
> - Does the login page load without errors?
> - Is the design clean and trustworthy?
> - Is there a logo/branding?
> - Clear heading indicating 'Sign In' or 'Log In'?
>
> **OAuth Buttons:**
> - Is 'Sign in with Google' button visible?
> - Is 'Sign in with Apple' button visible?
> - Are buttons properly styled with brand colors/logos?
> - Are buttons large enough to tap on mobile?
>
> **Email/Password (if available):**
> - Is there an email input field?
> - Is there a password input field?
> - Is there a 'Forgot Password' link?
> - Is there a 'Sign Up' link for new users?
>
> **Legal/Privacy:**
> - Terms of Service link present?
> - Privacy Policy link present?
> - Any consent checkbox?
>
> **Back/Cancel:**
> - Is there a way to go back to previous page?
> - Close button or back arrow?
>
> Report the login page structure and any issues."

### Checklist:

**Page Structure**
- [ ] Page loads without errors
- [ ] Clear 'Sign In' heading
- [ ] Branding/logo present
- [ ] Clean, focused layout
- [ ] No distracting elements

**OAuth Options**
- [ ] Google OAuth button visible
- [ ] Apple OAuth button visible
- [ ] Buttons have proper logos
- [ ] Buttons are accessible (44px+ height)
- [ ] Clear button labels

**Email/Password (if applicable)**
- [ ] Email input with proper type
- [ ] Password input with type="password"
- [ ] Show/hide password toggle
- [ ] Remember me checkbox (optional)
- [ ] Submit button clearly labeled

**Supporting Links**
- [ ] Forgot Password link
- [ ] Sign Up / Create Account link
- [ ] Terms of Service link
- [ ] Privacy Policy link

**Navigation**
- [ ] Back/close button available
- [ ] Logo links to homepage

---

## Phase 3: OAuth Flow Testing

### Prompt for Claude Chrome:

> "Test the OAuth authentication flows:
>
> **Google OAuth:**
> 1. Click 'Sign in with Google' button
> 2. Does it redirect to Google's auth page?
> 3. Note the URL - is it accounts.google.com?
> 4. Are the correct permissions requested?
> 5. (If you can authenticate) Complete the flow
> 6. Are you redirected back to Urban Manual?
> 7. Where do you land after auth (homepage, /account, previous page)?
>
> **Apple OAuth:**
> 1. Click 'Sign in with Apple' button
> 2. Does it redirect to Apple's auth page?
> 3. Note the URL - is it appleid.apple.com?
>
> **OAuth Cancel/Failure:**
> 1. Start OAuth flow
> 2. Cancel or go back without completing
> 3. What happens? Error message? Back to login?
>
> **Loading States:**
> - Is there a loading indicator during OAuth redirect?
> - Is there a loading state while processing callback?
>
> Report OAuth flow behavior and any issues."

### Checklist:

**Google OAuth**
- [ ] Button initiates OAuth flow
- [ ] Redirects to accounts.google.com
- [ ] Correct app name shown on Google
- [ ] Reasonable permissions requested
- [ ] Successful auth redirects back
- [ ] User is logged in after redirect

**Apple OAuth**
- [ ] Button initiates OAuth flow
- [ ] Redirects to appleid.apple.com
- [ ] Correct app name shown
- [ ] Successful auth redirects back

**Error Handling**
- [ ] Cancelled OAuth handled gracefully
- [ ] Error message shown if OAuth fails
- [ ] User can retry authentication
- [ ] No stuck loading states

**Loading States**
- [ ] Loading indicator during redirect
- [ ] Processing state on callback
- [ ] No blank/white screens

---

## Phase 4: Authenticated User Experience

### Prompt for Claude Chrome:

> "After logging in, test the authenticated experience:
>
> **Navigation Changes:**
> - Does nav show user avatar/name?
> - Is there an account dropdown menu?
> - What options are in the menu?
> - Is 'Sign In' button gone?
>
> **Protected Routes Now Accessible:**
> 1. Go to /trips - can you access it now?
> 2. Go to /account - loads profile?
> 3. Go to /collections - accessible?
>
> **Auth-Gated Actions Now Work:**
> 1. Go to a destination page
> 2. Click save/heart - does it work?
> 3. Try adding to a trip - works?
> 4. Create a collection - works?
>
> **User Profile Display:**
> - Is your name shown correctly?
> - Is your email shown (in account)?
> - Profile picture displayed (if you have one)?
>
> **Session Persistence:**
> 1. Refresh the page
> 2. Are you still logged in?
> 3. Close tab, reopen site
> 4. Still logged in?
> 5. Wait a few minutes, refresh
> 6. Still logged in?
>
> Report authenticated state behavior."

### Checklist:

**Navigation**
- [ ] User avatar visible in nav
- [ ] Account dropdown/menu available
- [ ] User name displayed
- [ ] Sign In button removed/hidden

**Protected Routes**
- [ ] /trips accessible
- [ ] /account accessible
- [ ] /collections accessible
- [ ] No redirect to login

**User Actions**
- [ ] Can save destinations
- [ ] Can add to trips
- [ ] Can create collections
- [ ] Changes persist

**Profile Display**
- [ ] Name shown correctly
- [ ] Email displayed in account
- [ ] Profile picture shown (if set)
- [ ] Account settings accessible

**Session**
- [ ] Persists on refresh
- [ ] Persists on tab close/reopen
- [ ] Reasonable session duration

---

## Phase 5: Logout Flow

### Prompt for Claude Chrome:

> "Test the logout experience:
>
> **Finding Logout:**
> 1. While logged in, find the logout option
> 2. Is it in account menu? Settings? Obvious?
>
> **Logout Process:**
> 1. Click logout
> 2. Is there a confirmation prompt?
> 3. Is there a loading state?
> 4. Where are you redirected after logout?
>
> **Post-Logout State:**
> 1. After logout, check navigation
> 2. Is 'Sign In' button back?
> 3. Is user avatar gone?
> 4. Try accessing /trips - redirects to login?
> 5. Try accessing /account - redirects?
>
> **Session Cleanup:**
> 1. Open DevTools > Application > Cookies
> 2. Are auth cookies cleared after logout?
> 3. Refresh the page - still logged out?
>
> **Multiple Tabs:**
> 1. Open Urban Manual in two tabs
> 2. Logout in one tab
> 3. Refresh the other tab
> 4. Is user logged out in both?
>
> Report logout behavior and any issues."

### Checklist:

**Finding Logout**
- [ ] Logout option easily findable
- [ ] In logical location (account menu/settings)
- [ ] Clear label ('Log Out', 'Sign Out')

**Logout Process**
- [ ] Click triggers logout (no accidental clicks - confirm if destructive)
- [ ] Loading state shown
- [ ] Redirects to appropriate page (home or login)

**Post-Logout**
- [ ] Navigation shows logged-out state
- [ ] Sign In button returns
- [ ] User info removed
- [ ] Protected routes redirect again

**Session Cleanup**
- [ ] Auth cookies cleared
- [ ] Local storage cleared (if used)
- [ ] Refresh keeps user logged out

**Multi-Tab**
- [ ] Logout syncs across tabs (ideal)
- [ ] Or: other tabs show logged-out on refresh

---

## Phase 6: Account Management

### Prompt for Claude Chrome:

> "Test account management features:
>
> **Profile Settings (/account):**
> 1. Navigate to account/profile page
> 2. Can you edit your display name?
> 3. Can you upload/change profile picture?
> 4. Can you update email? (may require verification)
> 5. Are there privacy settings?
>
> **Password Management (if email/password auth):**
> - Is there a change password option?
> - Does it require current password?
> - Password strength requirements shown?
>
> **Connected Accounts:**
> - Can you see connected OAuth providers?
> - Can you connect additional providers?
> - Can you disconnect a provider?
>
> **Account Deletion:**
> 1. Is there a 'Delete Account' option?
> 2. Does it show warnings about data loss?
> 3. Does it require confirmation?
> 4. (Don't actually delete!)
>
> **Save Behavior:**
> - When you edit settings, is there a Save button?
> - Is there auto-save?
> - Are changes confirmed with a message?
>
> Report account management UX and any issues."

### Checklist:

**Profile Editing**
- [ ] Name editable
- [ ] Profile picture upload works
- [ ] Email shown (may not be editable)
- [ ] Changes save successfully
- [ ] Confirmation shown

**Privacy Settings**
- [ ] Privacy options available
- [ ] Settings persist
- [ ] Clear explanations

**Security**
- [ ] Password change available (if applicable)
- [ ] Connected accounts shown
- [ ] Session management (optional)

**Account Deletion**
- [ ] Option exists
- [ ] Proper warnings shown
- [ ] Requires confirmation
- [ ] Not too easy to accidentally trigger

---

## Phase 7: Error Handling & Edge Cases

### Prompt for Claude Chrome:

> "Test auth error scenarios:
>
> **Invalid/Expired Session:**
> 1. Open DevTools > Application > Cookies
> 2. Delete the auth cookie(s)
> 3. Try to access /account
> 4. Does it handle gracefully? Redirect to login?
>
> **Network Errors:**
> 1. Open DevTools > Network > Offline mode
> 2. Try to log in
> 3. Is there an error message?
> 4. Go back online - can you retry?
>
> **OAuth Errors:**
> - If OAuth provider is down (can't easily test)
> - Check for timeout handling
> - Check for generic error messages
>
> **Multiple Login Attempts:**
> 1. If logged in, try going to login page
> 2. What happens? Redirect to account?
>
> **Rate Limiting (if applicable):**
> - Try multiple rapid login attempts
> - Is there rate limiting?
> - Is there a message if rate limited?
>
> **Browser Back Button:**
> 1. Go to login page
> 2. Start OAuth flow
> 3. Press back button
> 4. What happens? Graceful handling?
>
> Report all error handling behavior."

### Checklist:

**Session Errors**
- [ ] Expired session redirects to login
- [ ] Clear message about session expiry
- [ ] No broken UI states

**Network Errors**
- [ ] Offline state handled
- [ ] Error message shown
- [ ] Retry possible when online

**Navigation Edge Cases**
- [ ] Logged-in user visiting /login redirected
- [ ] Back button during OAuth handled
- [ ] Deep links work after auth

**Rate Limiting**
- [ ] Reasonable rate limits
- [ ] Clear message if limited
- [ ] Lockout duration communicated

---

## Phase 8: Mobile Auth Experience

### Prompt for Claude Chrome:

> "Test authentication on mobile viewport:
>
> 1. Open DevTools and set viewport to iPhone 14 (390px)
>
> **Login Page Mobile:**
> - Does login page look good on mobile?
> - Are OAuth buttons full-width?
> - Are buttons large enough to tap (44px+)?
> - Is text readable?
> - No horizontal scroll?
>
> **OAuth on Mobile:**
> - Do OAuth redirects work on mobile viewport?
> - Is the return from OAuth smooth?
>
> **Authenticated Mobile:**
> - How is user shown in mobile nav?
> - Is there a hamburger menu with account options?
> - Can you access account settings?
> - Can you log out from mobile nav?
>
> **Touch Interactions:**
> - Are all buttons easy to tap?
> - No elements too close together?
> - Form inputs accessible?
>
> Report mobile-specific auth issues."

### Checklist:

**Mobile Login**
- [ ] Login page responsive
- [ ] OAuth buttons large enough
- [ ] Form inputs usable
- [ ] Keyboard doesn't break layout

**Mobile Navigation**
- [ ] User visible in mobile nav
- [ ] Account options in hamburger menu
- [ ] Logout accessible

**Touch UX**
- [ ] 44px+ touch targets
- [ ] Adequate spacing between elements
- [ ] No accidental taps

---

## Issue Reporting Format

When reporting auth issues, use this format:

```
## Auth Issue: [Brief Description]

**Page**: /path/to/page
**Severity**: Critical / High / Medium / Low
**Category**: Login / OAuth / Session / Logout / Account / Error Handling

**Current Behavior**:
[Describe what happens]

**Expected Behavior**:
[Describe what should happen]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Observe issue]

**Console Errors** (if any):
[Paste errors]

**User State**:
Logged in / Logged out / During OAuth
```

---

## Success Criteria

| Criteria | Target |
|----------|--------|
| Protected routes redirect properly | 100% |
| OAuth flows complete successfully | 100% |
| Login page loads without errors | Yes |
| Logout clears session | Yes |
| Session persists on refresh | Yes |
| Mobile auth UX works | Yes |
| Error messages are clear | Yes |
| No console errors during auth | 0 |

---

## Quick Reference Prompts

### Full Auth Flow Test
> "Test complete auth on urbanmanual.co: try accessing /trips unauthenticated, go to login, test Google OAuth button, verify logged-in state, test logout. Report all issues."

### Protected Routes Test
> "Try accessing /trips, /account, /collections, /admin on urbanmanual.co without logging in. Report what happens for each."

### Mobile Auth Test
> "Set viewport to 375px. Test login page layout, OAuth buttons, and post-login mobile nav on urbanmanual.co."

### Session Test
> "Log in to urbanmanual.co. Refresh page, close tab and reopen, check /account. Verify session persists. Then test logout and verify session cleared."

---

*Plan created: December 2024*
*For: Claude Chrome Extension authentication testing*
