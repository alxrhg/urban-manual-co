import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string;
const supabase = createClient(url, key);

const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN || '';
const FROM_EMAIL = process.env.POSTMARK_FROM || 'alerts@urbanmanual.com';

async function sendEmail(to: string, subject: string, text: string) {
	if (!POSTMARK_TOKEN) return;
	await fetch('https://api.postmarkapp.com/email', {
		method: 'POST',
		headers: {
			'X-Postmark-Server-Token': POSTMARK_TOKEN,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ From: FROM_EMAIL, To: to, Subject: subject, TextBody: text }),
	});
}

async function main() {
	const start = Date.now();
	// Fetch recent active alerts without read=true
	const { data: alerts } = await supabase
		.from('opportunity_alerts')
		.select('id, user_id, city, category, title, description, created_at, read')
		.eq('is_active', true)
		.order('created_at', { ascending: false })
		.limit(200);

	// Map users to emails
	const userIds = Array.from(new Set((alerts || []).map((a: any) => a.user_id).filter(Boolean)));
	let emails: Record<string, string> = {};
	if (userIds.length) {
		const { data: profiles } = await supabase.from('users').select('id, email').in('id', userIds);
		(profiles || []).forEach((u: any) => { if (u.email) emails[u.id] = u.email; });
	}

	for (const a of alerts || []) {
		if (!a.user_id || !emails[a.user_id]) continue;
		const subject = a.title || 'Urban Manual Alert';
		const text = (a.description || 'You have a new travel alert.') + (a.city ? `\nCity: ${a.city}` : '');
		await sendEmail(emails[a.user_id], subject, text);
	}

	await supabase.from('jobs_history').insert({
		job_name: 'send_alert_emails',
		status: 'success',
		duration_ms: Date.now() - start,
		notes: `Processed ${(alerts || []).length} alerts.`
	});
}

main().catch(async (e) => {
	console.error(e);
	try { await supabase.from('jobs_history').insert({ job_name: 'send_alert_emails', status: 'error', duration_ms: 0, notes: String(e?.message || e) }); } catch {}
	process.exit(1);
});
