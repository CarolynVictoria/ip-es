function FunderCard({ hit }) {
	return (
		<li className='p-4 border rounded bg-white shadow'>
			<h2 className='text-lg font-semibold'>{hit.funderName}</h2>

			{hit.ipTake && (
				<p className='text-gray-700 mt-2'>{hit.ipTake.slice(0, 200)}...</p>
			)}

			{hit.overview && (
				<p className='text-gray-500 mt-2 italic'>
					{hit.overview.slice(0, 200)}...
				</p>
			)}

			{hit.issueAreas && hit.issueAreas.length > 0 && (
				<div className='mt-2'>
					<span className='text-xs font-medium text-gray-500'>
						Issue Areas:{' '}
					</span>
					{hit.issueAreas.join(', ')}
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
						View Profile
					</a>
				</div>
			)}
		</li>
	);
}

export default FunderCard;
