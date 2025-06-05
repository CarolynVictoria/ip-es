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

	const [searchType, setSearchType] = useState('any'); // "any", "all", or "exact"
	const [funderNameOnly, setFunderNameOnly] = useState(false);

	// temp omit certain issue areas and the lack of locations filter
	const OMIT_ISSUE_AREAS = [
		//'grants-tech-philanthropists',
		//'grants-wall-street-donors',
		//'grants-celebrity-foundations',
		'placeholder',
	];
	// omit issue areas not properly formatted for first prototype
	function filterOmitted(results) {
		return results.filter((r) => {
			// Omit if BOTH issueAreas and geoLocation.states are empty/missing
			const hasIssueAreas =
				Array.isArray(r.issueAreas) && r.issueAreas.length > 0;
			const states = r.geoLocation?.states || r.state || r.states || [];
			const hasStates = Array.isArray(states) && states.length > 0;
			if (!hasIssueAreas && !hasStates) {
				return false;
			}
			// Exclude if ALL issueAreas are omitted (and there is at least one issueArea)
			if (hasIssueAreas) {
				const allOmitted = r.issueAreas.every((tag) =>
					OMIT_ISSUE_AREAS.includes(tag)
				);
				if (allOmitted) {
					return false;
				}
			}
			return true;
		});
	}

	const handleSearch = async (e) => {
		if (e) e.preventDefault();
		if (
			!query.trim() &&
			selectedIssueAreas.length === 0 &&
			selectedLocations.length === 0
		)
			return;

		setLoading(true);

		console.log('Search type:', searchType);

		// search options logic
		const data = await fetchSearchResults(
			query,
			{
				issueAreas: selectedIssueAreas,
				locations: selectedLocations,
			},
			false, // useSemantic
			searchType,
			funderNameOnly
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
			true, // useSemantic
			searchType,
			funderNameOnly
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
						className='text-sm font-bold text-gray-700'
					>
						What are you looking for?
					</label>
					<SearchInput
						query={query}
						setQuery={setQuery}
						handleSearch={handleSearch}
						handleClear={handleClear}
						id='keyword-search-input' // Give the input a unique id
					/>
					{/* Search Options */}
					<label
						htmlFor='search-options'
						className='text-sm font-bold text-gray-700'
					>
						Search Options:
					</label>
					<SearchOptions
						searchType={searchType}
						setSearchType={setSearchType}
						funderNameOnly={funderNameOnly}
						setFunderNameOnly={setFunderNameOnly}
					/>

					{/* Semantic Search Input
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
					/> */}
					{/* Results */}
					{loading && <p>Loading...</p>}
					{!loading &&
						results.length > 0 &&
						(() => {
							const filteredResults = filterOmitted(results);
							return (
								<>
									<p className='mb-4 text-gray-700'>
										{filteredResults.length} matches found
									</p>
									<div className='mb-8'>
										<h2 className='text-xl font-bold mb-2'>Search Results</h2>
										<FunderList results={filteredResults} fetch990={true} />
									</div>
								</>
							);
						})()}

					{!loading && results.length === 0 && query && (
						<p>No results found.</p>
					)}
					{/* {!loading && semanticResults.length > 0 && (
						<>
							<p className='mb-4 text-gray-700'>
								{semanticResults.length} semantic matches found
							</p>

							<div className='mb-8'>
								<h2 className='text-xl font-bold mb-2'>
									Semantic Search Results
								</h2>
								<FunderList
									results={filterOmitted(semanticResults)}
									fetch990={true}
								/>
							</div>
						</>
					)}
					{!loading && semanticResults.length === 0 && semanticQuery && (
						<p>No semantic results found.</p>
					)} */}
				</div>
			</div>
		</div>
	);
}

export default App;
