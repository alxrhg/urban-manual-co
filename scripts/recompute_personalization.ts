import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string;
const supabase = createClient(url, key);

type SaveRow = { user_id: string; destination_slug: string; created_at: string };

type VisitRow = { user_id: string; destination_slug: string; visited_at: string };

type DestinationRow = { slug: string; city: string | null; category: string | null; tags?: string[] | null };

function expDecay(days: number, halfLifeDays = 30): number {
	const lambda = Math.log(2) / halfLifeDays;
	return Math.exp(-lambda * Math.max(days, 0));
}

function increment(map: Map<string, number>, key: string, weight: number) {
	if (!key) return;
	map.set(key, (map.get(key) || 0) + weight);
}

function topN(map: Map<string, number>, n = 8): Array<{ key: string; score: number }> {
	return Array.from(map.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, n)
		.map(([key, score]) => ({ key, score }));
}

async function main() {
	const start = Date.now();
	const sinceIso = new Date(Date.now() - 180 * 86400000).toISOString();

	// Pull recent saves and visits
	const [{ data: saves }, { data: visits }] = await Promise.all([
		supabase.from('saved_places').select('user_id, destination_slug, created_at').gte('created_at', sinceIso),
		supabase.from('visited_places').select('user_id, destination_slug, visited_at').gte('visited_at', sinceIso),
	]);

	const byUser: Record<string, { saves: SaveRow[]; visits: VisitRow[] }> = {};
	(saves || []).forEach((s: any) => {
		byUser[s.user_id] = byUser[s.user_id] || { saves: [], visits: [] };
		byUser[s.user_id].saves.push(s as SaveRow);
	});
	(visits || []).forEach((v: any) => {
		byUser[v.user_id] = byUser[v.user_id] || { saves: [], visits: [] };
		byUser[v.user_id].visits.push(v as VisitRow);
	});

	const users = Object.keys(byUser);
	if (users.length === 0) return;

	// Preload destination metadata for involved slugs
	const slugs = Array.from(new Set([...(saves || []).map((s: any) => s.destination_slug), ...(visits || []).map((v: any) => v.destination_slug)]));
	const destBatches: Record<string, DestinationRow> = {};
	const chunk = 500;
	for (let i = 0; i < slugs.length; i += chunk) {
		const part = slugs.slice(i, i + chunk);
		const { data } = await supabase.from('destinations').select('slug, city, category, tags').in('slug', part);
		(data || []).forEach((d: any) => { destBatches[d.slug] = d as DestinationRow; });
	}

	const upserts: any[] = [];
	const nowMs = Date.now();
	for (const userId of users) {
		const cities = new Map<string, number>();
		const categories = new Map<string, number>();
		const tags = new Map<string, number>();

		(byUser[userId].saves || []).forEach((s) => {
			const dest = destBatches[s.destination_slug];
			const ageDays = (nowMs - new Date(s.created_at).getTime()) / 86400000;
			const w = expDecay(ageDays, 45) * 1.25; // slight boost for saves
			if (dest) {
				increment(cities, (dest.city || '').toLowerCase(), w);
				increment(categories, (dest.category || '').toLowerCase(), w);
				(dest.tags || []).forEach((t) => increment(tags, String(t).toLowerCase(), w * 0.6));
			}
		});
		(byUser[userId].visits || []).forEach((v) => {
			const dest = destBatches[v.destination_slug];
			const ageDays = (nowMs - new Date(v.visited_at).getTime()) / 86400000;
			const w = expDecay(ageDays, 30);
			if (dest) {
				increment(cities, (dest.city || '').toLowerCase(), w);
				increment(categories, (dest.category || '').toLowerCase(), w);
				(dest.tags || []).forEach((t) => increment(tags, String(t).toLowerCase(), w * 0.5));
			}
		});

		const cache = {
			cities: topN(cities, 6),
			categories: topN(categories, 6),
			tags: topN(tags, 10),
			updated_at: new Date().toISOString(),
			version: 1,
		};
		const ttl = new Date(Date.now() + 7 * 86400000).toISOString();
		upserts.push({ user_id: userId, cache, ttl });
	}

	for (let i = 0; i < upserts.length; i += 300) {
		const batch = upserts.slice(i, i + 300);
		await supabase.from('personalization_scores').upsert(batch, { onConflict: 'user_id' });
	}

	await supabase.from('jobs_history').insert({
		job_name: 'recompute_personalization',
		status: 'success',
		duration_ms: Date.now() - start,
		notes: `Updated ${upserts.length} users.`,
	});
}

main().catch(async (e) => {
	console.error(e);
	try { await supabase.from('jobs_history').insert({ job_name: 'recompute_personalization', status: 'error', duration_ms: 0, notes: String(e?.message || e) }); } catch {}
	process.exit(1);
});
