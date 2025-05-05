// src/components/SearchOptions.jsx
// shows checkboxes at top of the page
function SearchOptions({
	prioritizeNameMatches,
	setPrioritizeNameMatches,
	includeSecondary,
	setIncludeSecondary,
}) {
	return (
		<div className='flex items-start gap-6 mt-4 mb-6'>
			<label className='flex items-center space-x-2'>
				<input
					type='checkbox'
					checked={prioritizeNameMatches}
					onChange={(e) => setPrioritizeNameMatches(e.target.checked)}
					className='accent-blue-600'
				/>
				<span>Prioritize Funder Name Matches</span>
			</label>

			<label className='flex items-center space-x-2'>
				<input
					type='checkbox'
					checked={includeSecondary}
					onChange={(e) => setIncludeSecondary(e.target.checked)}
					className='accent-blue-600'
				/>
				<span>Include Secondary Matches</span>
			</label>
		</div>
	);
}

export default SearchOptions;
