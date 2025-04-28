import ExpandableText, { DEFAULT_EXPANDABLE_LIMIT } from './ExpandableText';

function FunderCard({ hit }) {
	const sortedIssueAreas = hit.issueAreas
		? [...hit.issueAreas].sort((a, b) => a.localeCompare(b))
		: [];

	return (
		<li className='border rounded overflow-hidden shadow bg-white'>
			{/* Top Colored Header */}
			<div className='bg-blue-100 px-6 py-3'>
				<h2 className='text-lg uppercase font-semibold text-gray-800'>
					{hit.funderName}
				</h2>
			</div>

			{/* Card Body */}
			<div className='flex flex-col md:flex-row md:items-start justify-between p-6'>
				<div className='flex-1'>
					{hit.overview && (
						<div className='mt-2'>
							<h3 className='text-sm uppercase font-semibold'>Overview</h3>
							<p className='text-gray-500 italic mt-2'>{hit.overview}</p>
						</div>
					)}

					{hit.ipTake && (
						<div className='mt-4'>
							<h3 className='text-sm mb-2 uppercase font-semibold'>IP Take</h3>
							<ExpandableText
								text={hit.ipTake}
								limit={DEFAULT_EXPANDABLE_LIMIT}
							/>
						</div>
					)}

					{hit.profile && (
						<div className='mt-4'>
							<h3 className='text-sm mb-2 uppercase font-semibold'>Profile</h3>
							<ExpandableText
								text={hit.profile}
								limit={DEFAULT_EXPANDABLE_LIMIT}
							/>
						</div>
					)}

					{hit.funderUrl && (
						<div className='mt-4'>
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
				</div>

				{/* Issue Areas Infobox */}
				{sortedIssueAreas.length > 0 && (
					<div className='md:ml-6 mt-6 md:mt-0 bg-gray-100 p-3 rounded shadow-sm self-start w-full md:w-[250px]'>
						<h3 className='mb-2 text-sm font-semibold text-gray-700 uppercase'>
							Issue Areas
						</h3>
						<div className='flex flex-wrap gap-2'>
							{sortedIssueAreas.map((area, index) => (
								<span
									key={index}
									className='bg-gray-200 text-gray-700 text-[11px] font-medium px-2 py-0.5 rounded-full'
								>
									{area}
								</span>
							))}
						</div>
					</div>
				)}
			</div>
		</li>
	);
}

export default FunderCard;
