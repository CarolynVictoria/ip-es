async function fetchSearchResults(query, filters = {}) {
	try {
		const res = await fetch(import.meta.env.VITE_SEARCH_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ query, filters }),
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

export { fetchSearchResults };
