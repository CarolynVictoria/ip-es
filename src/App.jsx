import { useState } from 'react';
import { fetchSearchResults } from './clientApi';
import SearchInput from './components/SearchInput';
import FunderList from './components/FunderList';

function App() {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);

	const handleSearch = async (e) => {
		if (e) e.preventDefault(); // prevent form submit reload
		if (!query.trim()) return;

		setLoading(true);
		const data = await fetchSearchResults(query);
		setResults(data?.results || []);
		setLoading(false);
	};

	const handleClear = () => {
		setQuery('');
		setResults([]);
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

			{!loading && results.length > 0 && (
				<p className='mb-4 text-gray-700'>{results.length} matches found</p>
			)}

			{!loading && results.length === 0 && query && <p>No results found.</p>}

			{results.length > 0 && <FunderList results={results} />}
		</div>
	);
}

export default App;
