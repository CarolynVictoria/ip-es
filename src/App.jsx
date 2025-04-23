import { useState } from 'react';
import { fetchSearchResults } from './clientApi';
import SearchInput from './components/SearchInput';
import FunderList from './components/FunderList';

function App() {
	const [query, setQuery] = useState('');
	const [primaryResults, setPrimaryResults] = useState([]);
	const [secondaryResults, setSecondaryResults] = useState([]);
	const [loading, setLoading] = useState(false);

	const handleSearch = async (e) => {
		if (e) e.preventDefault();
		if (!query.trim()) return;

		setLoading(true);
		const data = await fetchSearchResults(query);
		setPrimaryResults(data?.primaryResults || []);
		setSecondaryResults(data?.secondaryResults || []);
		setLoading(false);
	};

	const handleClear = () => {
		setQuery('');
		setPrimaryResults([]);
		setSecondaryResults([]);
		setLoading(false);
	};

	return (
		<div className='min-h-screen p-6 bg-gray-50'>
			<h1 className='text-2xl font-bold mb-4'>IP Search</h1>

			<SearchInput
				query={query}
				setQuery={setQuery}
				handleSearch={handleSearch}
				handleClear={handleClear}
			/>

			{loading && <p>Loading...</p>}

			{!loading &&
				(primaryResults.length > 0 || secondaryResults.length > 0) && (
					<p className='mb-4 text-gray-700'>
						{primaryResults.length + secondaryResults.length} matches found
					</p>
				)}

			{!loading &&
				primaryResults.length === 0 &&
				secondaryResults.length === 0 &&
				query && <p>No results found.</p>}

			{primaryResults.length > 0 && (
				<div className='mb-8'>
					<h2 className='text-xl font-bold mb-2'>
						Funders Matching Your Search
					</h2>
					<FunderList results={primaryResults} />
				</div>
			)}

			{secondaryResults.length > 0 && (
				<div className='mb-8'>
					<h2 className='text-xl font-bold mb-2'>Other Mentions</h2>
					<FunderList results={secondaryResults} />
				</div>
			)}
		</div>
	);
}

export default App;
