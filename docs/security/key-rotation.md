# Key Rotation Policy

This playbook defines rotation cadences, ownership, and emergency controls for every externally managed secret. It is the source of truth for the automation found in `automation/key-rotation/schedule.json`, the helper scripts inside `scripts/`, and the `key-rotation` GitHub Actions workflow.

## Cadence Table

| Provider | Secret(s) | Primary Owner | Rotation Cadence | Distribution Targets |
| --- | --- | --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | AI Platform (Lena Ortiz) | Every 30 days or immediately after scoped incidents | Vercel (production/preview), Supabase secrets for background jobs |
| Supabase | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | Data Platform (Rami Choi) | Service role: 45 days, anon: 60 days | Vercel runtime, Supabase edge functions, CI environment |
| Vercel | `VERCEL_ACCESS_TOKEN` (used for automation only) | DevInfra (Noor Said) | 90 days | GitHub Actions secrets only |
| Google Maps / Places | `GOOGLE_MAPS_KEY` | Product Eng (Priya Patel) | 60 days | Vercel runtime, Supabase scheduled jobs |

**Contacts**:
- Security on-call: `security@urbanmanual.com`
- Escalation (PagerDuty bridge): `oncall@pagerduty.urbanmanual.com`

## Automation Workflow

1. Update the `automation/key-rotation/schedule.json` entry when a secret is rotated manually. This file is used by the CI check.
2. Use the rotation scripts under `scripts/` (`rotate-openai-key.ts`, `rotate-supabase-service-role.ts`, additional CLI snippets below) so that new keys are minted through official APIs and distributed to Vercel + Supabase secrets.
3. Push the rotation commit so GitHub Actions runs `key-rotation.yml`. The workflow will fail if any key is within 5 days of its deadline or already overdue.

## Emergency Rotation Steps

1. **Containment**
   - Freeze all automation jobs that depend on the compromised key (disable scheduled Supabase functions and Vercel cron jobs).
   - Revoke exposed tokens with the provider's admin console immediately.
2. **Regeneration**
   - Run the corresponding script with `tsx scripts/rotate-<provider>.ts --update-schedule` to mint a new credential and push it to managed secret stores.
   - Confirm the scripts finished successfully by checking the console output for Vercel + Supabase confirmation IDs.
3. **Validation**
   - Deploy a Vercel preview using `npx vercel deploy --prebuilt` to ensure runtime secrets decrypted correctly.
   - Run smoke tests for endpoints that rely on the rotated key (AI, Supabase edge functions, etc.).
4. **Audit & Communication**
   - Update `automation/key-rotation/schedule.json` with the new `lastRotated` value (the `--update-schedule` flag performs this automatically).
   - Notify `security@urbanmanual.com` and the service owner with the timestamp, summary of impact, and monitoring screenshots.
   - File an incident in the tracker if user data or credentials were exposed.

## Provider-Specific Notes

### OpenAI
- Requires `OPENAI_MANAGEMENT_KEY` with `organization:api_keys.write` scope.
- Script automatically updates Vercel project secrets and Supabase secrets API.
- Verify `OPENAI_API_KEY` in Supabase Edge Functions console after rotation.

### Supabase Service Role + Anon Keys
- Requires `SUPABASE_ACCESS_TOKEN` (org owner) and project ref (e.g., `abcd1234`).
- After rotation, restart Supabase edge functions or re-deploy them via `supabase functions deploy --project-ref <ref>` to pick up new secrets.

### Google Maps / Places
- Google Cloud Console does not yet expose an API for key creation, so rotation is manual:
  ```bash
  gcloud services api-keys create \
    --display-name="urban-manual-places" \
    --project=$GOOGLE_PROJECT_ID

  gcloud services api-keys list --format=json | jq '.[0].name'
  gcloud services api-keys enable --key=$KEY
  gcloud services api-keys restrict --key=$KEY --api-target=maps-backend.googleapis.com
  ```
- Use `vercel env add GOOGLE_MAPS_KEY` and `supabase secrets set GOOGLE_MAPS_KEY=...` to propagate.

### Vercel Automation Token
- Rotate with `vercel tokens issue automation-<date>` and update the GitHub Actions secret `VERCEL_TOKEN`.
- Notify DevInfra before deleting the previous token in case workflows are running.
