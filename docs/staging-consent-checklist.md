# Staging Consent & Signal Checklist

This checklist covers CookieConsent behavior, Google Analytics/AdSense gating, and the default consent mode configured in `app/layout.tsx`. Use it before each staging deploy and capture evidence for legal/compliance sign-off.

## Scope & References
- Consent defaults and Google tags are initialized in `app/layout.tsx` (default `gtag` consent set to `denied` and AdSense script tag). 
- User consent collection and updates are handled in `components/CookieConsent.tsx` (storage, GA consent updates, and UI flows).

## Pre-flight
- Clear browser storage for the staging origin (cookies + localStorage) to avoid inherited consent states.
- Use a fresh session or incognito window for each scenario.
- Keep DevTools open (Application > Storage, Network > XHR/Fetch & JS, Console) to validate signals.

## Checklist
### A. Default consent from `app/layout.tsx`
- [ ] On first load with no prior consent, confirm `window.dataLayer` exists and the first `consent default` call sets `analytics_storage`, `ad_storage`, `ad_user_data`, and `ad_personalization` to `denied`.
- [ ] Ensure no `gtag('config', 'G-ZLGK6QXD88')` is sent before consent (check the Network tab for blocked/absent GA hits).
- [ ] Verify the AdSense script (`adsbygoogle.js`) loads but does not produce ad requests without marketing consent.

### B. CookieConsent banner behavior (`components/CookieConsent.tsx`)
- [ ] Banner appears ~1s after hydration when no consent is stored and shows the “Accept cookies” and “Settings” actions.
- [ ] Accept All: stores consent in localStorage and cookie, hides the banner, dispatches `cookie-consent-updated`, updates GA consent to `granted` for analytics + marketing, and triggers `gtag('config', 'G-ZLGK6QXD88')`.
- [ ] Accept Necessary: stores necessary-only consent, hides the banner, dispatches `cookie-consent-updated`, keeps GA consent `denied`, and does **not** fire a GA config call.
- [ ] Custom save: toggles per-category switches (Analytics/Marketing/Personalization), then “Save Settings” persists the chosen mix, updates GA consent accordingly, and only fires GA config when analytics is enabled.
- [ ] `open-cookie-settings` event reopens the modal and respects the previously stored selections.

### C. GA/AdSense load gating
- [ ] With marketing off, confirm no ad calls are issued (Network tab) and GA consent remains `denied` for ad-related flags.
- [ ] With marketing on, confirm GA consent updates to `granted` for ad flags and ad requests appear only after consent is saved.
- [ ] With analytics off, ensure no GA config/pageview hits are sent; with analytics on, verify a pageview/config hit fires once.

### D. Evidence & sign-off
- [ ] Capture screenshots of DevTools Network (showing absence/presence of GA/ad requests per scenario) and Application storage (persisted consent payload).
- [ ] Save HAR/console logs when anomalies appear.
- [ ] File QA evidence in `evidence/` with date + tester + scenario (e.g., `evidence/2025-xx-xx-consent-checklist.md`).
- [ ] Request Legal/Compliance review on the collected evidence and record sign-off in the same file.

## Automation / Scheduling
- Preferred: add a Playwright smoke test run (CI cron or pre-deploy job) that:
  - Clears storage, loads the home page, asserts the banner shows after ~1s, and inspects `dataLayer` for default `denied` consent.
  - Clicks Accept Necessary → asserts no GA config call captured via `page.waitForRequest` on `https://www.google-analytics.com/g/collect`.
  - Clicks Accept All → waits for `cookie_consent` storage update and asserts a GA collect request is observed.
  - Toggles Marketing off/on to confirm ad calls only appear after marketing consent is granted.
- If automation is unavailable, run the above steps manually each Tuesday and before any staging → production promotion; record results in `evidence/` with timestamps and reviewer initials.
- Optional: wire Playwright/Cypress run outputs (HAR + screenshots) to the `evidence/` folder for Legal/Compliance review.
