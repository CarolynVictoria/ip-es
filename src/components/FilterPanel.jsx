// src/components/FilterPanel.jsx

import unifiedFilterMap from '../data/unifiedFilterMap.json';
import MultiSelectCombobox from './MultiSelectCombobox';

function getOptionsByType(filterMap, type) {
	return filterMap
		.filter(
			(item) =>
				// Canonical types are "issueAreas" and "location"
				item.filterType === type
		)
		.map((item) => ({
			value: item.tag, // Use tag as value - matches what is sent as filter
			label: item.filterName, // Display name
			filterUrl: item.filterUrl, // Used for UI infobox chicklets
		}));
}

function FilterPanel({
	selectedIssueAreas,
	onIssueAreaChange,
	selectedLocations,
	onLocationChange,
}) {
	// These arrays will be rebuilt each render from the canonical JSON
	const issueAreaOptions = getOptionsByType(unifiedFilterMap, 'issueAreas');
	const locationOptions = getOptionsByType(unifiedFilterMap, 'location');

	return (
		<div className='p-4 bg-white rounded shadow'>
			<h2 className='text-2xl font-bold mb-4'>Filters</h2>

			<MultiSelectCombobox
				label='Issue Areas'
				options={issueAreaOptions}
				selected={selectedIssueAreas}
				onChange={onIssueAreaChange}
			/>

			<MultiSelectCombobox
				label='Locations'
				options={locationOptions}
				selected={selectedLocations}
				onChange={onLocationChange}
			/>
		</div>
	);
}

export default FilterPanel;
