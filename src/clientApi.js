// clientApi.js
import axios from 'axios'; // optional, only needed if you switch to axios later

async function fetchSearchResults(
	query,
	filters = {},
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
			body: JSON.stringify({ query, filters, exactMatch }), // <== added exactMatch
		});

		if (!res.ok) {
			throw new Error(`API Error: ${res.status}`);
		}

		const data = await res.json();
		return data;
	} catch (err) {
		console.error('Search request failed:', err);
		return { hits: { hits: [] } }; // fallback
	}
}

// ProPublica 990 data
async function fetchNonprofitData(ein) {
	const response = await fetch(`/api/nonprofit-data/${ein}`);
	if (!response.ok) throw new Error('Failed to fetch nonprofit data');
	return await response.json();
}

export { fetchSearchResults, fetchNonprofitData };
