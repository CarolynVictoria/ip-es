import { useState } from 'react';
import { fetchSearchResults } from './clientApi';

function App() {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);

	const handleSearch = async () => {
		if (!query.trim()) return;

		setLoading(true);
		const data = await fetchSearchResults(query);
		setResults(data?.hits || []);
		setLoading(false);
	};

	return (
		<div className='min-h-screen p-6 bg-gray-50'>
			<h1 className='text-2xl font-bold mb-4'>IP Search</h1>

			<div className='flex gap-2 mb-6'>
				<input
					type='text'
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder='Type a keyword...'
					className='flex-1 border border-gray-300 px-4 py-2 rounded shadow-sm'
				/>
				<button
					onClick={handleSearch}
					className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
				>
					Search
				</button>
			</div>

			{loading && <p>Loading...</p>}

			{!loading && results.length === 0 && query && <p>No results found.</p>}

			<ul className='space-y-4'>
				{results.map((hit) => (
					<li key={hit._id} className='p-4 border rounded bg-white shadow'>
						<h2 className='text-lg font-semibold'>{hit._source.title}</h2>
						{hit._source.body_content && (
							<p className='text-gray-600 mt-2 line-clamp-3'>
								{hit._source.body_content.slice(0, 200)}...
							</p>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}

export default App;
