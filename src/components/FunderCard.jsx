// frontend/src/components/FunderCard.js

import ExpandableText, { DEFAULT_EXPANDABLE_LIMIT } from './ExpandableText';
import { useEffect, useState } from 'react';
import { fetchNonprofitData } from '../clientApi'; // adjust if path differs

function FunderCard({ hit, fetch990 = true }) {
	const sortedIssueAreas = hit.issueAreas
		? [...hit.issueAreas].sort((a, b) => a.localeCompare(b))
		: [];

	const [nonprofitStats, setNonprofitStats] = useState(null);

	useEffect(() => {
		if (fetch990 && hit.funderName) {
			// Adjusted fetch logic to handle relaxed query matching
			fetchNonprofitData(hit.funderName)
				.then(setNonprofitStats)
				.catch((err) => console.error('990 data fetch failed:', err));
		}
	}, [hit.funderName, fetch990]);

	return (
		<li className='border rounded overflow-hidden shadow bg-white'>
			{/* Top Colored Header */}
			<div className='bg-blue-100 px-6 py-3'>
				<h2 className='text-lg uppercase font-semibold text-gray-800'>
					{hit.funderName}
				</h2>
				{typeof hit.score === 'number' && (
					<div className='text-xs text-gray-400 italic mt-1'>
						Relevance score: {hit.score.toFixed(2)}
					</div>
				)}
			</div>

			{/* Card Body */}
			<div className='flex flex-col md:flex-row md:items-start justify-between p-6'>
				<div className='flex-1'>
					{/* Overview Content */}
					{hit.overview && (
						<div className='mt-2'>
							<h3 className='text-sm uppercase font-semibold'>Overview</h3>
							<p className='text-gray-500 italic mt-2'>{hit.overview}</p>
						</div>
					)}
					{/* IP Take Content */}
					{hit.ipTake && (
						<div className='mt-4'>
							<h3 className='text-sm mb-2 uppercase font-semibold'>IP Take</h3>
							<ExpandableText
								text={hit.ipTake}
								limit={DEFAULT_EXPANDABLE_LIMIT}
							/>
						</div>
					)}
					{/* Profile Content */}
					{hit.profile && (
						<div className='mt-4'>
							<h3 className='text-sm mb-2 uppercase font-semibold'>
								Profile Excerpt
							</h3>
							<ExpandableText
								text={hit.profile}
								limit={500} // hardcoded 500 characters for Profile
								showInlineLink={true}
								linkUrl={`https://www.insidephilanthropy.com${hit.funderUrl}`}
							/>
						</div>
					)}
				</div>
				{/* Right Sidebar */}
				<div className='md:ml-6 mt-6 md:mt-0 flex flex-col w-full md:w-[250px] space-y-4'>
					{/* Sidebar Box: Issue Areas */}
					{sortedIssueAreas.length > 0 && (
						<div className='bg-gray-200 p-3 rounded shadow-sm self-start w-full'>
							<h3 className='mb-2 text-sm font-bold text-gray-700 uppercase'>
								Issue Areas
							</h3>
							<div className='flex flex-wrap gap-2'>
								{sortedIssueAreas.map((area, index) => (
									<span
										key={index}
										className='bg-gray-300 text-gray-700 text-[11px] font-medium px-2 py-0.5 rounded-full'
									>
										{area}
									</span>
								))}
							</div>
						</div>
					)}

					{/* 990 Data Card */}
					{fetch990 && nonprofitStats && (
						<div className='bg-green-100 p-3 rounded shadow-sm self-start w-full'>
							<h3 className='mb-2 text-sm font-bold text-gray-700 uppercase'>
								990 Data
							</h3>
							<ul className='text-sm text-gray-700 space-y-1'>
								<li>
									<strong>EIN:</strong> {nonprofitStats.ein || '—'}
								</li>
								<li>
									<strong>City/State:</strong>{' '}
									{nonprofitStats.city
										? `${nonprofitStats.city}, ${nonprofitStats.state}`
										: '—'}
								</li>
								<li>
									<strong>IRS Subsection:</strong>{' '}
									{nonprofitStats.subsectionCode
										? `501(c)(${nonprofitStats.subsectionCode})`
										: '—'}
								</li>
								<li>
									<strong>NTEE Category:</strong>{' '}
									{nonprofitStats.nteeClassification || '—'}
								</li>
								<li>
									<strong>Ruling Date:</strong>{' '}
									{nonprofitStats.rulingDate || '—'}
								</li>
								<li>
									<strong>Total Assets:</strong>{' '}
									{nonprofitStats.totalAssets
										? `$${Number(nonprofitStats.totalAssets).toLocaleString()}`
										: '—'}
								</li>
								<li>
									<strong>Total Giving:</strong>{' '}
									{nonprofitStats.totalGiving
										? `$${Number(nonprofitStats.totalGiving).toLocaleString()}`
										: '—'}
								</li>
								<li className='text-xs text-gray-400 italic'>
									Tax Year: {nonprofitStats.filingYear || 'N/A'}
								</li>
							</ul>
						</div>
					)}
				</div>
			</div>
		</li>
	);
}

export default FunderCard;
