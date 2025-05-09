// src/components/SearchOptions.jsx
// shows checkboxes at top of the page
function SearchOptions({
	funderNameOnly,
	setFunderNameOnly,
	matchAll,
	setMatchAll,
}) {
	return (
		<div className='flex items-start gap-6 mt-4 mb-6'>
			<label className='flex items-center space-x-2'>
				<input
					type='checkbox'
					checked={funderNameOnly}
					onChange={(e) => setFunderNameOnly(e.target.checked)}
					className='accent-blue-600'
				/>
				<span>Funder Name Only</span>
			</label>

			<label className='flex items-center space-x-2'>
				<input
					type='checkbox'
					checked={matchAll}
					onChange={(e) => setMatchAll(e.target.checked)}
					className='accent-blue-600'
				/>
				<span>Match all terms</span>
			</label>
		</div>
	);
}

export default SearchOptions;
