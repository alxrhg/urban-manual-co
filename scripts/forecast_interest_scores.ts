import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string;
const supabase = createClient(url, key);

function analyzeTrend(values: number[]): 'up' | 'down' | 'flat' {
	if (values.length < 2) return 'flat';
	const half = Math.floor(values.length / 2);
	const first = values.slice(0, half).reduce((a, b) => a + b, 0) / Math.max(half, 1);
	const second = values.slice(half).reduce((a, b) => a + b, 0) / Math.max(values.length - half, 1);
	const change = (second - first) / Math.max(first, 1e-6);
	if (change > 0.05) return 'up';
	if (change < -0.05) return 'down';
	return 'flat';
}

async function main() {
	const start = Date.now();
	// Sample: aggregate daily views from popularity_view per city proxying via destinations
	const { data: rows, error } = await supabase
		.from('destinations')
		.select('city, slug');
	if (error) throw error;
	const cities = Array.from(new Set((rows || []).map((r: any) => (r.city || '').toLowerCase()).filter(Boolean)));

	for (const city of cities) {
		// Pull last 28 days popularity proxy from popularity_view via city destinations
		const { data: pv } = await supabase
			.from('popularity_view')
			.select('destination_slug, trending_score')
			.limit(10000);
		const cityDests = new Set((rows || []).filter((r: any) => String(r.city || '').toLowerCase().includes(city)).map((r: any) => r.slug));
		const values = (pv || []).filter((p: any) => cityDests.has(p.destination_slug)).map((p: any) => Number(p.trending_score || 0));
		if (!values.length) continue;
		const interest = values.reduce((a, b) => a + b, 0) / values.length;
		const trend = analyzeTrend(values);
		await supabase.from('forecasting_data').insert({
			metric_type: 'popularity',
			metric_value: interest,
			recorded_at: new Date().toISOString(),
			metadata: { city },
			interest_score: interest,
			trend_direction: trend,
			last_forecast: new Date().toISOString(),
		});
	}
	await supabase.from('jobs_history').insert({
		job_name: 'monthly_forecast_interest_scores',
		status: 'success',
		duration_ms: Date.now() - start,
		notes: 'Computed city interest scores and trend.'
	});
}

main().catch(async (e) => {
	console.error(e);
	try { await supabase.from('jobs_history').insert({ job_name: 'monthly_forecast_interest_scores', status: 'error', duration_ms: 0, notes: String(e?.message || e) }); } catch {}
	process.exit(1);
});
