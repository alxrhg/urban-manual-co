import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string;
const supabase = createClient(url, key);

function getLocalTime(utcOffsetMinutes: number | null): { weekday: number; hhmm: string } {
	const now = new Date();
	const offset = typeof utcOffsetMinutes === 'number' ? utcOffsetMinutes : 0;
	const localMs = now.getTime() + offset * 60 * 1000;
	const local = new Date(localMs);
	const weekday = local.getUTCDay(); // 0=Sunday
	const hh = String(local.getUTCHours()).padStart(2, '0');
	const mm = String(local.getUTCMinutes()).padStart(2, '0');
	return { weekday, hhmm: `${hh}${mm}` };
}

function isOpenNow(opening: any, utcOffset: number | null): boolean {
	try {
		if (!opening || !Array.isArray(opening.periods)) return false;
		const { weekday, hhmm } = getLocalTime(utcOffset ?? null);
		for (const p of opening.periods) {
			const open = p.open; // { day: 0-6, time: 'HHMM' }
			const close = p.close; // may be null
			if (!open || !open.time) continue;
			const openDay = typeof open.day === 'number' ? open.day : weekday;
			const closeDay = typeof close?.day === 'number' ? close.day : openDay;
			const openTime = String(open.time);
			const closeTime = close?.time ? String(close.time) : null;
			if (openDay === weekday) {
				if (!closeTime) {
					if (hhmm >= openTime) return true;
				} else if (closeDay === weekday) {
					if (hhmm >= openTime && hhmm < closeTime) return true;
				} else {
					// Handle overnight periods (close next day)
					if (hhmm >= openTime) return true;
				}
			}
		}
		return false;
	} catch {
		return false;
	}
}

async function main() {
	const start = Date.now();
	// 1) Aggregate recent activity for decay scores (last 90 days)
	const { data: saves } = await supabase
		.from('saved_places')
		.select('destination_slug, created_at')
		.gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString());
	const { data: visits } = await supabase
		.from('visited_places')
		.select('destination_slug, visited_at')
		.gte('visited_at', new Date(Date.now() - 90 * 86400000).toISOString());

	const saveMap = new Map<string, number>();
	const visitMap = new Map<string, number>();
	const now = Date.now();
	(saves || []).forEach((s: any) => {
		const ageDays = Math.max((now - new Date(s.created_at).getTime()) / 86400000, 0);
		const weight = Math.exp(-ageDays / 14);
		saveMap.set(s.destination_slug, (saveMap.get(s.destination_slug) || 0) + weight);
	});
	(visits || []).forEach((v: any) => {
		const ageDays = Math.max((now - new Date(v.visited_at).getTime()) / 86400000, 0);
		const weight = Math.exp(-ageDays / 14);
		visitMap.set(v.destination_slug, (visitMap.get(v.destination_slug) || 0) + weight);
	});

	// 2) Fetch destinations
	const { data: dests, error } = await supabase
		.from('destinations')
		.select('id, slug, rating, current_opening_hours_json, utc_offset');
	if (error) throw error;

	// 3) Compute updates
	const updates: any[] = [];
	for (const d of dests || []) {
		const rating = typeof d.rating === 'number' ? d.rating : 0;
		const savesDecay = saveMap.get(d.slug) || 0;
		const visitsDecay = visitMap.get(d.slug) || 0;
		const recentViewsDecay = visitsDecay * 0.6 + savesDecay * 0.4;
		const reviewsProxy = Math.log(1 + (savesDecay + visitsDecay));
		const rank = rating * 0.6 + reviewsProxy * 0.2 + recentViewsDecay * 0.2;
		const openNow = isOpenNow(d.current_opening_hours_json, d.utc_offset);
		updates.push({ id: d.id, rank_score: rank, is_open_now: openNow });
	}

	// 4) Batch update
	const chunk = 500;
	for (let i = 0; i < updates.length; i += chunk) {
		const slice = updates.slice(i, i + chunk);
		const { error: upErr } = await supabase.from('destinations').upsert(slice);
		if (upErr) {
			console.error('Update error:', upErr.message);
		}
	}

	// 5) Refresh popularity view and log job
	try { await supabase.rpc('refresh_popularity_view'); } catch {}
	try {
		await supabase.from('jobs_history').insert({
			job_name: 'daily_rank_and_open_now',
			status: 'success',
			duration_ms: Date.now() - start,
			notes: 'Updated rank_score and is_open_now; refreshed popularity_view.'
		});
	} catch {}
}

main().catch(async (e) => {
	console.error('Job failed', e);
	try {
		await supabase.from('jobs_history').insert({
			job_name: 'daily_rank_and_open_now',
			status: 'error',
			duration_ms: 0,
			notes: String(e?.message || e)
		});
	} catch {}
	process.exit(1);
});
