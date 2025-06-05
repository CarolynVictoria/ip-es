// src/components/SearchOptions.jsx

function SearchOptions({
	searchType,
	setSearchType,
	funderNameOnly,
	setFunderNameOnly,
}) {
	return (
		//	<div className='flex flex-col gap-2 mt-4 mb-6'>
		<div className='flex flex-col gap-2 mt-4 mb-6 bg-gray-100 p-4 rounded-md shadow-sm'>
			{/* Radios in a row */}
			<div className='flex flex-row gap-4'>
				<label className='flex items-center space-x-2'>
					<input
						type='radio'
						name='searchType'
						value='any'
						checked={searchType === 'any'}
						onChange={() => setSearchType('any')}
						className='accent-blue-600'
					/>
					<span>Any terms</span>
				</label>
				<label className='flex items-center space-x-2'>
					<input
						type='radio'
						name='searchType'
						value='all'
						checked={searchType === 'all'}
						onChange={() => setSearchType('all')}
						className='accent-blue-600'
					/>
					<span>All terms</span>
				</label>
				<label className='flex items-center space-x-2'>
					<input
						type='radio'
						name='searchType'
						value='exact'
						checked={searchType === 'exact'}
						onChange={() => setSearchType('exact')}
						className='accent-blue-600'
					/>
					<span>Exact match</span>
				</label>
			</div>
			{/* Checkbox underneath */}
			<div>
				<label className='flex items-center space-x-2'>
					<input
						type='checkbox'
						checked={funderNameOnly}
						onChange={(e) => setFunderNameOnly(e.target.checked)}
						className='accent-blue-600'
					/>
					<span>Search Funder Names Only</span>
				</label>
			</div>
		</div>
	);
}

export default SearchOptions;
