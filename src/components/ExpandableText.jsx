import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'lucide-react';

export const DEFAULT_EXPANDABLE_LIMIT = 500;

function ExpandableText({
	text = '',
	limit = DEFAULT_EXPANDABLE_LIMIT,
	className = '',
	showInlineLink = false,
	linkUrl = '',
	linkText = 'Open full profile',
}) {
	const [expanded, setExpanded] = useState(false);

	// Ensure it's a usable string
	if (typeof text !== 'string' || text.trim() === '') return null;

	const getTruncatedText = (text, limit) => {
		if (text.length <= limit) return text;

		const sentenceEndings = ['.', '!', '?'];
		let index = limit;

		while (index < text.length) {
			const char = text[index];
			const nextChar = text[index + 1] || '';

			if (
				sentenceEndings.includes(char) &&
				(nextChar === ' ' || nextChar === '\n' || nextChar === '')
			) {
				return text.slice(0, index + 1).trim();
			}

			index++;
		}

		return text.slice(0, limit).trim(); // fallback if no sentence ending found
	};

	const preview = getTruncatedText(text, limit);
	const isLong = text.length > limit;
	const displayed = expanded || !isLong ? text : preview;

	return (
		<div className={className}>
			<p className='text-gray-700'>
				{displayed}
				{showInlineLink && linkUrl && (
					<>
						{' '}
						<a
							href={linkUrl}
							target='_blank'
							rel='noopener noreferrer'
							className='text-blue-600'
						>
							{linkText}{' '}
							<Link size={16} className='inline ml-1 text-blue-600' />
						</a>
					</>
				)}
				{!showInlineLink && !expanded && isLong && (
					<span
						className='inline-flex items-center cursor-pointer text-blue-600'
						onClick={() => setExpanded(true)}
					>
						<ChevronDown size={16} className='ml-1' />
					</span>
				)}
			</p>

			{!showInlineLink && expanded && isLong && (
				<button
					onClick={() => setExpanded(false)}
					className='text-blue-600 text-sm mt-1 flex items-center underline'
				>
					Show less <ChevronUp size={16} className='ml-1' />
				</button>
			)}
		</div>
	);
}

export default ExpandableText;
