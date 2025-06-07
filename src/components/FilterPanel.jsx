// src/components/FilterPanel.jsx

import unifiedFilterMap from '../data/unifiedFilterMap.json';
import MultiSelectCombobox from './MultiSelectCombobox';

function getOptionsByType(filterMap, type) {
	return filterMap
		.filter((item) => item.filterType === type)
		.map((item) => ({
			value: item.tag,
			label: item.filterName,
			filterUrl: item.filterUrl,
		}));
}

function FilterPanel({
	selectedIssueAreas,
	onIssueAreaChange,
	selectedLocations,
	onLocationChange,
}) {
	const issueAreaOptions = getOptionsByType(unifiedFilterMap, 'issueAreas');
	const locationOptions = getOptionsByType(unifiedFilterMap, 'location');

	return (
		<div className='p-6 bg-white rounded'>
			{/* Filters in a single row */}
			<div className='flex flex-col md:flex-row gap-4'>
				<div className='w-full md:w-1/2'>
					<MultiSelectCombobox
						label='Issue Areas'
						options={issueAreaOptions}
						selected={selectedIssueAreas}
						onChange={onIssueAreaChange}
					/>
				</div>
				<div className='w-full md:w-1/2'>
					<MultiSelectCombobox
						label='Locations'
						options={locationOptions}
						selected={selectedLocations}
						onChange={onLocationChange}
					/>
				</div>
			</div>
		</div>
	);
}

export default FilterPanel;
