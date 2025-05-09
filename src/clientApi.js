// clientApi.js

// clientApi.js

async function fetchSearchResults(
	query,
	{ issueAreas = [], locations = [] } = {},
	useSemantic = false,
	exactMatch = false
) {
	try {
		const endpoint = useSemantic
			? '/api/search/semantic'
			: import.meta.env.VITE_SEARCH_API_URL;

		const res = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				query,
				filters: {
					issueAreas,
					locations,
				},
				exactMatch,
			}),
		});

		if (!res.ok) {
			throw new Error(`API Error: ${res.status}`);
		}

		const data = await res.json();

		// ✅ Directly return the `results` array
		return { results: data.results || [] };
	} catch (err) {
		console.error('Search request failed:', err);
		return { results: [] };
	}
}

// ProPublica 990 data
async function fetchNonprofitData(ein) {
	const response = await fetch(`/api/nonprofit-data/${ein}`);
	if (!response.ok) throw new Error('Failed to fetch nonprofit data');
	return await response.json();
}

export { fetchSearchResults, fetchNonprofitData };
