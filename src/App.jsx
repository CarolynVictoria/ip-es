import { useState } from 'react';
import { fetchSearchResults } from './clientApi';
import SearchInput from './components/SearchInput';
import FunderList from './components/FunderList';
import FilterPanel from './components/FilterPanel';
import SearchOptions from './components/SearchOptions';

function App() {
	const [query, setQuery] = useState('');
	const [selectedIssueAreas, setSelectedIssueAreas] = useState([]);
	const [selectedLocations, setSelectedLocations] = useState([]);
	const [results, setResults] = useState([]); // unified results
	const [loading, setLoading] = useState(false);

	const [funderNameOnly, setFunderNameOnly] = useState(true);
	const [matchAll, setMatchAll] = useState(false);

	const handleSearch = async (e) => {
		if (e) e.preventDefault();
		if (
			!query.trim() &&
			selectedIssueAreas.length === 0 &&
			selectedLocations.length === 0
		)
			return;

		setLoading(true);

		// new for match-all logic
		const data = await fetchSearchResults(
			query,
			{
				issueAreas: selectedIssueAreas,
				locations: selectedLocations,
			},
			false, // useSemantic = false
			matchAll // exact match flag
		);
		setResults(data?.results || []);
		setLoading(false);
	};

	const handleClear = () => {
		setQuery('');
		setResults([]);
		setLoading(false);
	};

	const handleIssueAreaChange = (areas) => {
		setSelectedIssueAreas(areas);
	};

	const handleLocationChange = (locations) => {
		setSelectedLocations(locations);
	};

	// Semantic Search
	const [semanticQuery, setSemanticQuery] = useState('');
	const [semanticResults, setSemanticResults] = useState([]);

	const handleSemanticSearch = async (e) => {
		if (e) e.preventDefault();
		if (
			!semanticQuery.trim() &&
			selectedIssueAreas.length === 0 &&
			selectedLocations.length === 0
		)
			return;

		setLoading(true);
		const res = await fetchSearchResults(
			semanticQuery,
			{
				issueAreas: selectedIssueAreas,
				locations: selectedLocations,
			},
			true, // useSemantic = true
			matchAll // exact match flag
		);
		setSemanticResults(res?.results || []);
		console.log('Semantic results:', res?.results);
		setLoading(false);
	};

	const handleSemanticClear = () => {
		setSemanticQuery('');
		setSemanticResults([]);
		setLoading(false);
	};

	return (
		<div className='min-h-screen p-6 bg-gray-50'>
			<h1 className='text-2xl font-bold mb-6'>Grant Finder Search</h1>

			<div className='flex flex-col md:flex-row gap-6'>
				{/* Left Sidebar */}
				<div className='md:w-1/4 w-full max-h-screen overflow-y-auto p-2'>
					<FilterPanel
						selectedIssueAreas={selectedIssueAreas}
						onIssueAreaChange={handleIssueAreaChange}
						selectedLocations={selectedLocations}
						onLocationChange={handleLocationChange}
					/>
				</div>

				{/* Main Content */}
				<div className='md:w-3/4 w-full'>
					{/* Search Input */}
					<label
						htmlFor='search-input'
						className='text-sm font-medium text-gray-700'
					>
						Keyword Search
					</label>
					<SearchInput
						query={query}
						setQuery={setQuery}
						handleSearch={handleSearch}
						handleClear={handleClear}
						id='keyword-search-input' // Give the input a unique id
					/>

					{/* Search Options */}
					<SearchOptions
						funderNameOnly={funderNameOnly}
						setFunderNameOnly={setFunderNameOnly}
						matchAll={matchAll}
						setMatchAll={setMatchAll}
					/>

					{/* Semantic Search Input */}
					<label
						htmlFor='search-input'
						className='text-sm font-medium text-gray-700'
					>
						Smart Search
					</label>
					<SearchInput
						query={semanticQuery}
						setQuery={setSemanticQuery}
						handleSearch={handleSemanticSearch}
						handleClear={handleSemanticClear}
						id='semantic-search-input' // Give the input a unique id
					/>

					{/* Results */}

					{loading && <p>Loading...</p>}

					{!loading && results.length > 0 && (
						<>
							<p className='mb-4 text-gray-700'>
								{results.length} matches found
							</p>

							<div className='mb-8'>
								<h2 className='text-xl font-bold mb-2'>Search Results</h2>
								<FunderList results={results} fetch990={true} />
							</div>
						</>
					)}
					{!loading && results.length === 0 && query && (
						<p>No results found.</p>
					)}
					{!loading && semanticResults.length > 0 && (
						<>
							<p className='mb-4 text-gray-700'>
								{semanticResults.length} semantic matches found
							</p>

							<div className='mb-8'>
								<h2 className='text-xl font-bold mb-2'>
									Semantic Search Results
								</h2>
								<FunderList results={semanticResults} fetch990={true} />
							</div>
						</>
					)}
					{!loading && semanticResults.length === 0 && semanticQuery && (
						<p>No semantic results found.</p>
					)}
				</div>
			</div>
		</div>
	);
}

export default App;
