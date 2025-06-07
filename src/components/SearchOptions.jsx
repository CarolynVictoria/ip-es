// src/components/SearchOptions.jsx

function SearchOptions({
	searchType,
	setSearchType,
	funderNameOnly,
	setFunderNameOnly,
}) {
	return (
		<>
			{/* Shaded box for radio buttons */}
			<div className='flex flex-col bg-gray-100 p-4 rounded-md shadow-sm'>
				<div className='flex flex-row gap-4'>
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
							value='exact'
							checked={searchType === 'exact'}
							onChange={() => setSearchType('exact')}
							className='accent-blue-600'
						/>
						<span>Exact match</span>
					</label>
				</div>
			</div>
			{/* Checkbox below, visually outside the box */}
			<div className='mt-0 pl-4 mb-0'>
				<label className='flex items-center space-x-2'>
					<input
						type='checkbox'
						checked={funderNameOnly}
						onChange={(e) => setFunderNameOnly(e.target.checked)}
						className='accent-blue-600'
					/>
					<span>Search funder name only</span>
				</label>
			</div>
		</>
	);
}

export default SearchOptions;
