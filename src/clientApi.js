// clientApi.js
async function fetchSearchResults(
	query,
	{ issueAreas = [], locations = [] } = {},
	useSemantic = false,
	searchType = 'any', // <-- updated
	funderNameOnly = false // <-- updated
) {
	try {
		const endpoint = useSemantic ? '/api/search/semantic' : '/api/search';

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
				searchType, // <-- send to backend
				funderNameOnly, // <-- send to backend
			}),
		});

		if (!res.ok) {
			throw new Error(`API Error: ${res.status}`);
		}

		const data = await res.json();

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
