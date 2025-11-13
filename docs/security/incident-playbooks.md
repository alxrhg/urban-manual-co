# Incident Playbooks

This document augments `SECURITY.md` by detailing concrete steps when secrets or keys are compromised. Each playbook references the automation that now exists inside `scripts/` and the escalation contacts that must be notified.

## 1. OpenAI API Key Exposure

1. **Detect & Triage**
   - Validate the alert (GitHub Actions, audit logs, or `key-rotation` workflow failure).
   - Confirm whether traffic anomalies exist via OpenAI usage dashboard.
2. **Immediate Actions**
   - Run `tsx scripts/rotate-openai-key.ts --update-schedule`.
   - Ensure the script reports successful Vercel + Supabase secret updates.
3. **Post-Rotation**
   - Deploy a Vercel preview build to validate inference endpoints.
   - Notify `security@urbanmanual.com` and AI Platform owner (Lena Ortiz).
   - File an incident if malicious activity is confirmed.

## 2. Supabase Service Role Key Exposure

1. **Detect & Triage**
   - Use Supabase audit logs to confirm read/write anomalies.
   - Assess whether backups or row-level security were bypassed.
2. **Immediate Actions**
   - Run `tsx scripts/rotate-supabase-service-role.ts --update-schedule`.
   - Disable long-running edge functions until new secrets propagate.
3. **Post-Rotation**
   - Restart Supabase realtime + storage services via the dashboard.
   - Notify `security@urbanmanual.com`, Data Platform owner (Rami Choi), and create a post-mortem issue.

## 3. Vercel Automation Token Exposure

1. **Immediate Actions**
   - Revoke the compromised token via `vercel tokens rm <id>`.
   - Issue a new token and update the GitHub Actions secret `VERCEL_TOKEN`.
2. **Follow-Up**
   - Re-run the most recent workflow manually to confirm no regressions.
   - Inform DevInfra (Noor Said) and log the event with Security.

## 4. Google Maps / Places Key Exposure

1. **Immediate Actions**
   - Use the manual `gcloud services api-keys create` flow from `key-rotation.md`.
   - Restrict usage to approved APIs + HTTP referrers before distributing.
2. **Follow-Up**
   - Update Vercel + Supabase secrets manually.
   - Notify Product Engineering (Priya Patel) and Security.

## Escalation Matrix

| Severity | Who to Page | How |
| --- | --- | --- |
| SEV1 (active exploitation) | `oncall@pagerduty.urbanmanual.com` | PagerDuty bridge + Slack #security-incident |
| SEV2 (no active abuse) | `security@urbanmanual.com` | Email + GitHub issue |
| SEV3 (routine rotation) | Service owner only | Async update in #devinfra |

Always update `automation/key-rotation/schedule.json` after the remediation step and ensure a PR captures the change for auditing.
