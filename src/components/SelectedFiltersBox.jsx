import React from 'react';

function SelectedFiltersBox({ selectedFilters, onRemove, filterOptions }) {
	// Helper for value-to-label (and URL) lookup
	const getLabel = (type, value) => {
		const opts = filterOptions[type] || [];
		const found = opts.find((o) => o.value === value);
		return found ? found.label : value;
	};
	const getUrl = (type, value) => {
		const opts = filterOptions[type] || [];
		const found = opts.find((o) => o.value === value);
		return found ? found.filterUrl : null;
	};

	const chips = [];
	Object.entries(selectedFilters).forEach(([type, arr]) =>
		arr.forEach((value) => chips.push({ type, value }))
	);
	if (chips.length === 0) return null;

	return (
		<div className='mb-4 p-3 bg-gray-100 rounded-lg shadow flex flex-wrap gap-2'>
			<span className='font-semibold mr-2'>Selected Filters:</span>
			{chips.map((chip) => {
				const label = getLabel(chip.type, chip.value);
				const url = getUrl(chip.type, chip.value);
				return (
					<span
						key={chip.type + '-' + chip.value}
						className='inline-flex items-center px-2 py-1 bg-blue-200 rounded-full text-sm mr-2'
					>
						{url ? (
							<a
								href={url}
								target='_blank'
								rel='noopener noreferrer'
								className='underline hover:text-blue-700'
							>
								{label}
							</a>
						) : (
							label
						)}
						<button
							type='button'
							onClick={() => onRemove(chip.type, chip.value)}
							className='ml-1 text-gray-600 hover:text-red-600'
							aria-label={`Remove filter ${label}`}
						>
							×
						</button>
					</span>
				);
			})}
		</div>
	);
}

export default SelectedFiltersBox;
