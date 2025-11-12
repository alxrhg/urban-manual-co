# Account Self-Service Experience

This document captures the structure, data flows, and behavior of the redesigned account experience that now lives under the `/account` route group.

## Route map

| Path | Description | Primary data sources |
| --- | --- | --- |
| `/account` | Redirects to `/account/profile` | n/a |
| `/account/profile` | Overview of the member profile, stats, world map, and achievements | `UserContext`, `/api/account/profile`, `/api/account/preferences`, Supabase tables (`saved_places`, `visited_places`, `collections`, `destinations`) |
| `/account/security` | Session management and recent account activity | `UserContext`, `/api/account/sessions`, `/api/account/activity`, Supabase auth admin APIs |
| `/account/preferences` | Notification, privacy, and connected-service controls | `UserContext`, `/api/account/settings/*` endpoints |
| `/account/history` | Visited history, saved lists, and collections view | `UserContext`, Supabase tables (`visited_places`, `saved_places`, `collections`) |

Every section is wrapped by `components/account/AccountLayout.tsx`, which provides the shared navigation sidebar and account summary. The layout consumes `UserContext` to render user identity details and exposes a one-click action to revoke other sessions.

## Core state management

The `contexts/UserContext.tsx` provider is the central integration point for account data. On mount (and whenever auth state changes) it:

1. Reads the active Supabase session via the client SDK.
2. Loads profile, preference, notification, privacy, and connected-service records through dedicated API routes (`/api/account/profile`, `/api/account/preferences`, and the new `/api/account/settings/*` endpoints).
3. Fetches saved places, visited places, collections, destination metadata, and visited-country stats directly from Supabase tables.
4. Retrieves active sessions and activity history through `/api/account/sessions` and `/api/account/activity`.

The provider exposes derived values to the entire account experience:

- `profile`, `preferences`, `savedPlaces`, `visitedPlaces`, `collections`, `visitedCountries`, `totalDestinations`
- `notificationSettings`, `privacySettings`, `connectedServices`
- `sessions` and `activityLog`
- Mutation helpers (`updateNotificationSettings`, `updatePrivacySettings`, `updateConnectedServices`, `signOutOtherDevices`, `endSession`, and `refresh*` helpers)

Each section page consumes only the slices it needs:

- **Profile** — renders the profile editor, summary stats, world map, and achievement progress using context-supplied datasets. After edits, `refreshProfile` re-syncs context state.
- **Security** — lists normalized `sessions`, allows targeted device logout (`endSession`) or global revocation (`signOutOtherDevices`), and shows an activity feed composed in the provider.
- **Preferences** — uses the shared `useManagedForm` hook from `lib/forms.ts` so notification, privacy, and service forms share consistent state handling.
- **History** — reuses existing `EnhancedVisitedTab` and `EnhancedSavedTab` components fed from context arrays and lists collections in a responsive grid.

## API extensions

New endpoints live under `app/api/account`:

- `settings/notifications` – persists notification toggles (`notification_settings` JSON + legacy `email_notifications`).
- `settings/privacy` – manages privacy booleans (`privacy_settings` JSON + `is_public`, `privacy_mode`, `allow_tracking`, `show_activity`).
- `settings/services` – stores connected integrations (`connected_services` JSON).
- `sessions` – lists `user_sessions` records and orchestrates Supabase auth revocation using service-role `signOut` calls. Supports scoped deletions (single session, other sessions, or global sign-out).
- `activity` – merges `activities` and `user_sessions` records into a single chronological feed for the security dashboard.

All routes rely on `withErrorHandling` for consistent responses and respect RLS by authenticating the caller with `createServerClient`.

## Forms & shared utilities

`lib/forms.ts` introduces `useManagedForm`, `handleBooleanInput`, and helpers for parsing API errors. Each preferences form instance uses this hook to:

- Track submission state (`status`, `message`, `isDirty`).
- Optimistically update context values on success.
- Provide accessible switch/toggle bindings through the shared `handleBooleanInput` helper.

## Session management flow

1. `UserContext` fetches recent `user_sessions` rows for display.
2. Security actions trigger `/api/account/sessions`:
   - `DELETE` with `{ scope: 'others' }` revokes every refresh token except the current one via Supabase admin `signOut`.
   - `DELETE` with `{ sessionId }` marks the record as ended and attempts to revoke other sessions to enforce logout.
   - `DELETE` with `{ scope: 'global' }` signs out all sessions, including the current browser.
3. The UI immediately refreshes session state and activity feed to reflect the action.

`/api/account/activity` keeps the dashboard in sync by joining:

- Structured activity rows from `activities`.
- Derived session events (sign-in / sign-out) produced from `user_sessions` timestamps.

## Accessibility & responsiveness

- Navigation is announced via `aria-label` and uses focus-visible styles for keyboard navigation.
- Sections use semantic headings (`h1`/`h2`) and labelled regions.
- Forms pair `Label` + `Switch` for screen-reader compatibility and expose live status feedback (saving/saved/error).
- Layout adapts to mobile with stacked sections and wraps statistics / cards into responsive grids.

## Testing checklist

- Authenticate and confirm `/account` redirects to `/account/profile`.
- Validate each section fetches data without console errors.
- Toggle preferences and verify API responses update context state.
- Sign out other devices or a specific session and confirm activity log updates.
- Ensure navigation remains keyboard-accessible across breakpoints.
