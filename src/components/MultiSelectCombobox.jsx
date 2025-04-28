import { useState } from 'react';
import { Combobox } from '@headlessui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

function MultiSelectCombobox({ label, options, selected, onChange }) {
	const [query, setQuery] = useState('');
	const [accordionOpen, setAccordionOpen] = useState(false);

	const filteredOptions =
		query === ''
			? []
			: options.filter((option) =>
					option.toLowerCase().includes(query.toLowerCase())
			  );

	const handleSelect = (option) => {
		if (selected.includes(option)) {
			onChange(selected.filter((item) => item !== option));
		} else {
			onChange([...selected, option]);
		}
		setQuery(''); // Clear typing field after selecting
	};

	const handleInputChange = (e) => {
		setQuery(e.target.value);
	};

	return (
		<div className='mb-6 relative'>
			{/* Label */}
			<div className='flex items-center justify-between mb-2'>
				<h3 className='text-md font-semibold'>{label}</h3>
			</div>

			{/* Selected Pills */}
			<div className='flex flex-wrap gap-1 mb-2'>
				{selected.map((item) => (
					<span
						key={item}
						className='flex items-center bg-blue-100 text-blue-800 text-sm rounded-full px-2 py-1'
					>
						{item}
						<button
							type='button'
							onClick={() => handleSelect(item)}
							className='ml-1 text-blue-600 hover:text-blue-800'
						>
							×
						</button>
					</span>
				))}
			</div>

			{/* Search Input */}
			<Combobox as='div'>
				<div className='relative'>
					<input
						type='text'
						className='w-full border border-gray-300 rounded px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
						placeholder={`Type to search ${label.toLowerCase()}...`}
						onChange={handleInputChange}
						value={query}
					/>

					{/* Only render dropdown when query is NOT empty */}
					{query && filteredOptions.length > 0 && (
						<ul className='absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm'>
							{filteredOptions.map((option) => (
								<li
									key={option}
									onClick={() => handleSelect(option)}
									className='cursor-pointer text-gray-700 hover:bg-blue-100 rounded px-2 py-1'
								>
									{option}
								</li>
							))}
						</ul>
					)}
				</div>
			</Combobox>

			{/* Accordion Toggle Button */}
			<button
				type='button'
				onClick={() => setAccordionOpen((prev) => !prev)}
				className='flex items-center text-blue-600 hover:text-blue-800 mt-4'
			>
				{accordionOpen ? (
					<>
						<ChevronUp size={18} className='mr-1' />
						Hide All {label}
					</>
				) : (
					<>
						<ChevronDown size={18} className='mr-1' />
						Show All {label}
					</>
				)}
			</button>

			{/* Accordion Content */}
			<div
				className={`transition-all duration-300 ease-in-out mt-2 rounded ${
					accordionOpen
						? 'max-h-64 overflow-y-auto border p-3 bg-gray-50'
						: 'max-h-0 overflow-hidden'
				}`}
			>
				<ul className='text-sm space-y-2'>
					{options.map((option) => (
						<li
							key={option}
							onClick={() => handleSelect(option)}
							className='cursor-pointer text-gray-700 hover:bg-blue-100 rounded px-2 py-1'
						>
							{option}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

export default MultiSelectCombobox;
