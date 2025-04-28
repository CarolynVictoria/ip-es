import { ISSUE_AREAS, LOCATIONS } from '../data/filterOptions';
import MultiSelectCombobox from './MultiSelectCombobox';

function FilterPanel({
	selectedIssueAreas,
	onIssueAreaChange,
	selectedLocations,
	onLocationChange,
}) {
	return (
		<div className='p-4 bg-white rounded shadow'>
			<h2 className='text-2xl font-bold mb-4'>Filters</h2>

			<MultiSelectCombobox
				label='Issue Areas'
				options={ISSUE_AREAS}
				selected={selectedIssueAreas}
				onChange={onIssueAreaChange}
			/>

			<MultiSelectCombobox
				label='Locations'
				options={LOCATIONS}
				selected={selectedLocations}
				onChange={onLocationChange}
			/>
		</div>
	);
}

export default FilterPanel;
