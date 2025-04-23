import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const DEFAULT_EXPANDABLE_LIMIT = 500;

function ExpandableText({
	text = '',
	limit = DEFAULT_EXPANDABLE_LIMIT,
	className = '',
}) {
	const [expanded, setExpanded] = useState(false);

	if (!text) return null;

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
				// Found the end of a sentence
				return text.slice(0, index + 1).trim();
			}

			index++;
		}

		// Fallback: no sentence end found, truncate hard
		return text.slice(0, limit).trim();
	};

	const isLong = text.length > limit;
	const displayed = expanded ? text : getTruncatedText(text, limit);

	return (
		<div className={className}>
			<p className='text-gray-700'>
				{displayed}
				{!expanded && isLong && (
					<span
						className='inline-flex items-center cursor-pointer text-blue-600'
						onClick={() => setExpanded(true)}
					>
						<ChevronDown size={16} className='ml-1' />
					</span>
				)}
			</p>
			{expanded && isLong && (
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
