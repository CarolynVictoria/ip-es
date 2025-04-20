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
		setResults(data?.results || []); // <-- your backend returns { results: [...] }
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

			{results.length > 0 && (
				<ul className='space-y-4'>
					{results.map((hit) => (
						<li key={hit.id} className='p-4 border rounded bg-white shadow'>
							<h2 className='text-lg font-semibold'>{hit.funderName}</h2>

							{hit.ipTake && (
								<p className='text-gray-700 mt-2'>
									{hit.ipTake.slice(0, 200)}...
								</p>
							)}

							{hit.overview && (
								<p className='text-gray-500 mt-2 italic'>
									{hit.overview.slice(0, 200)}...
								</p>
							)}

							{hit.issueAreas && hit.issueAreas.length > 0 && (
								<div className='mt-2'>
									<span className='text-xs font-medium text-gray-500'>
										Issue Areas:{' '}
									</span>
									{hit.issueAreas.join(', ')}
								</div>
							)}

							{hit.funderUrl && (
								<div className='mt-2'>
									<a
										href={hit.funderUrl}
										className='text-blue-600 underline text-sm'
										target='_blank'
										rel='noopener noreferrer'
									>
										View Profile
									</a>
								</div>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export default App;
