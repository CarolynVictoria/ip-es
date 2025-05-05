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
	const [primaryResults, setPrimaryResults] = useState([]);
	const [secondaryResults, setSecondaryResults] = useState([]);
	const [loading, setLoading] = useState(false);

		const [prioritizeNameMatches, setPrioritizeNameMatches] = useState(true);
		const [includeSecondary, setIncludeSecondary] = useState(false);

	const handleSearch = async (e) => {
		if (e) e.preventDefault();
		if (!query.trim()) return;

		setLoading(true);
		const data = await fetchSearchResults(query, {
			issueAreas: selectedIssueAreas,
			locations: selectedLocations,
		});
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

	const handleIssueAreaChange = (areas) => {
		setSelectedIssueAreas(areas);
	};

	const handleLocationChange = (locations) => {
		setSelectedLocations(locations);
	};

	return (
		<div className='min-h-screen p-6 bg-gray-50'>
			<h1 className='text-2xl font-bold mb-6'>Grant Finder Search</h1>

			<div className='flex flex-col md:flex-row gap-6'>
				{/* Left Sidebar */}
				<div className='md:w-1/4 w-full max-h-screen overflow-y-auto p-2"'>
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
					<SearchInput
						query={query}
						setQuery={setQuery}
						handleSearch={handleSearch}
						handleClear={handleClear}
					/>

					<SearchOptions
						prioritizeNameMatches={prioritizeNameMatches}
						setPrioritizeNameMatches={setPrioritizeNameMatches}
						includeSecondary={includeSecondary}
						setIncludeSecondary={setIncludeSecondary}
					/>

					{/* Results */}
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
							<FunderList results={primaryResults} fetch990={true} />{' '}
							{/* primary */}
						</div>
					)}

					{secondaryResults.length > 0 && (
						<div className='mb-8'>
							<h2 className='text-xl font-bold mb-2'>Other Mentions</h2>
							<FunderList results={secondaryResults} fetch990={false} />{' '}
							{/* secondary */}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default App;
