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

	const [searchType, setSearchType] = useState('all'); // "any", "all", or "exact"
	const [funderNameOnly, setFunderNameOnly] = useState(false);

	// temp omit certain issue areas and the lack of locations filter
	const OMIT_ISSUE_AREAS = [
		//'grants-tech-philanthropists',
		//'grants-wall-street-donors',
		//'grants-celebrity-foundations',
		'placeholder',
	];

	function filterOmitted(results) {
		return results.filter((r) => {
			const hasIssueAreas =
				Array.isArray(r.issueAreas) && r.issueAreas.length > 0;
			const states = r.geoLocation?.states || r.state || r.states || [];
			const hasStates = Array.isArray(states) && states.length > 0;
			if (!hasIssueAreas && !hasStates) {
				return false;
			}
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

	// Semantic Search (not currently visible in UI)
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

			{/* Main Content: Stack all vertically */}
			<div className='max-w-7xl mx-auto flex flex-col gap-2'>
				{/* Search Input */}
				<SearchInput
					query={query}
					setQuery={setQuery}
					handleSearch={handleSearch}
					handleClear={handleClear}
					id='keyword-search-input'
				/>
				{/* Search Options */}
				{/* <label
					htmlFor='search-options'
					className='text-sm font-bold text-gray-700'
				>
					Select Search Options:
				</label> */}
				<SearchOptions
					searchType={searchType}
					setSearchType={setSearchType}
					funderNameOnly={funderNameOnly}
					setFunderNameOnly={setFunderNameOnly}
				/>
				{/* Filter Panel in its own box */}
				<div
					className='rounded-md bg-gray-100 p-4 mt-6 mb-4'
				>
					<FilterPanel
						selectedIssueAreas={selectedIssueAreas}
						onIssueAreaChange={handleIssueAreaChange}
						selectedLocations={selectedLocations}
						onLocationChange={handleLocationChange}
					/>
				</div>
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

				{!loading && results.length === 0 && query && <p>No results found.</p>}

				{/* Uncomment to show Semantic Search */}
				{/*
				<label
					htmlFor='semantic-search-input'
					className='text-sm font-medium text-gray-700'
				>
					Smart Search
				</label>
				<SearchInput
					query={semanticQuery}
					setQuery={setSemanticQuery}
					handleSearch={handleSemanticSearch}
					handleClear={handleSemanticClear}
					id='semantic-search-input'
				/>
				{!loading && semanticResults.length > 0 && (
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
				)}
				*/}
			</div>
		</div>
	);
}

export default App;
