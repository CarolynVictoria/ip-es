import ExpandableText, { DEFAULT_EXPANDABLE_LIMIT } from './ExpandableText';

function FunderCard({ hit }) {
	return (
		<li className='p-4 border rounded bg-white shadow'>
			<h2 className='text-lg font-semibold'>{hit.funderName}</h2>

			{hit.issueAreas?.length > 0 && (
				<div className='mt-3'>
					<h3 className='mb-2 text-sm font-semibold'>Issue Areas</h3>
					<ExpandableText
						text={hit.issueAreas.join(', ')}
						limit={DEFAULT_EXPANDABLE_LIMIT}
					/>
				</div>
			)}

			{hit.overview && (
				<div className='mt-3'>
					<h3 className='text-sm font-semibold'>Overview</h3>
					<p className='text-gray-500 italic mt-2'>{hit.overview}</p>
				</div>
			)}

			{hit.ipTake && (
				<div className='mt-3'>
					<h3 className='text-sm mb-2 font-semibold'>IP Take</h3>
					<ExpandableText text={hit.ipTake} limit={DEFAULT_EXPANDABLE_LIMIT} />
				</div>
			)}

			{hit.profile && (
				<div className='mt-4'>
					<h3 className='text-sm mb-2 font-semibold'>Profile</h3>
					<ExpandableText text={hit.profile} limit={DEFAULT_EXPANDABLE_LIMIT} />
				</div>
			)}

			{hit.funderUrl && (
				<div className='mt-2'>
					<a
						href={hit.funderUrl}
						className='text-blue-600 underline text-sm'
						target='_blank'
						rel='noopener noreferrer'
					>
						Visit Funder Page
					</a>
				</div>
			)}
		</li>
	);
}

export default FunderCard;
