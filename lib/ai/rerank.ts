import { openai, OPENAI_MODEL } from '@/lib/openai';

export async function rerankResults(query: string, results: any[], topN = 20): Promise<any[]> {
	if (!openai || !results?.length) return results;
	const slice = results.slice(0, topN);
	try {
		const prompt = `Re-rank the following destinations for the query: "${query}".
Return ONLY a JSON array of indices in best-to-worst order (0-based indices into the provided list).
Consider city/category alignment, relevance, quality (rating, michelin), and style cues in names.

Items:\n${slice.map((r, i) => `${i}. ${r.name || ''} • ${r.city || ''} • ${r.category || ''} • rating:${r.rating || ''} • michelin:${r.michelin_stars || 0}`).join('\n')}`;

		const resp = await openai.chat.completions.create({
			model: OPENAI_MODEL,
			messages: [
				{ role: 'system', content: 'You re-rank lists concisely. Output only valid JSON.' },
				{ role: 'user', content: prompt }
			],
			temperature: 0.2,
			max_tokens: 150,
		});
		const text = resp.choices?.[0]?.message?.content || '';
		const jsonMatch = text.match(/\[[\s\S]*\]/);
		if (!jsonMatch) return results;
		const order: number[] = JSON.parse(jsonMatch[0]);
		const ordered = order
			.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < slice.length)
			.map((idx) => slice[idx]);
		return ordered.concat(results.slice(topN));
	} catch {
		return results;
	}
}
