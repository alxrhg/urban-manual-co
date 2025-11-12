# Admin Operations Dashboard

This dashboard unifies dataset audits, moderation workflows, and support ticket handling under `/admin`.

## Route & API inventory

- **App routes**
  - `/admin` → `app/admin/page.tsx` renders the consolidated dashboard.
- **API routes**
  - `GET /api/admin/dashboard` → Aggregated metrics for datasets, moderation queue, support tickets, and system status.
  - `POST /api/admin/moderation` → Bulk update moderation state for destinations.
  - `POST /api/admin/support` → Bulk ticket assignment, escalation, and closure.

All admin APIs enforce role-based access via `middlewares/adminGuard.ts` and accept either cookie-based sessions or bearer tokens.

## Role-based permissions

Roles are resolved from Supabase `app_metadata` (single `role`, array `roles`, or `is_admin`). Recognized roles:

- `admin`
- `editor`
- `moderator`
- `support`
- `viewer` (fallback)

`lib/auth.ts` exposes:

- `optionalAuth` – best-effort user lookup.
- `ensureRoleOrThrow` – synchronous guards for server components.
- `requireRole` – async guard that can return a service-role client for API routes.

Use these helpers before rendering protected UI or executing privileged queries.

## Dashboard widgets

The dashboard comprises:

1. **Dataset audit cards** – surfaces table availability and key metrics per dataset. Refresh via the “Refresh insights” button or the global dashboard refresh action.
2. **Moderation board** – tabular view with filters (`All`, `Pending`, `Flagged`, `Needs enrichment`, `Approved`) and bulk actions (`Approve`, `Flag`, `Reject`, `Reset`). Optional notes are persisted when the target table exposes moderation columns.
3. **Support kanban** – columnar board that groups tickets into `Open`, `Escalated`, and `Resolved`. Bulk controls support assignment, priority adjustments, escalation, and closure.
4. **System status** – highlights Supabase configuration, freshest analytics events, last content updates, and any missing datasets.

## Toasts & alerts

Use the `useToast` hook to surface feedback:

```ts
const { success, error } = useToast();

success('Moderation queue updated');
error('Failed to update support tickets');
```

All dashboard mutations already call `success`/`error` internally. Additional admin tooling should follow the same pattern for consistency.

## Extending datasets

1. Add the desired Supabase table or materialized view.
2. Update `/api/admin/dashboard` to include new counts or summaries (use the `safeCount`/`safeSelect` helpers to gracefully handle missing tables in lower environments).
3. Surface the dataset inside `DatasetAudit` by enriching the payload structure.
4. Update UI widgets to present actionable insights.

## Troubleshooting

- **Missing tables** – API responses set `unavailable: true`; the UI surfaces amber warnings. Provision the tables and re-run.
- **Authorization failures** – ensure the requesting account has `admin`, `editor`, `moderator`, or `support` role metadata.
- **Moderation/support actions no-op** – the API attempts to write to optional audit tables (`moderation_actions`, `support_ticket_activity`). If they do not exist, operations still succeed but warn in logs.
