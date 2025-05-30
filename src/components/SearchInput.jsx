import { useRef, useEffect } from 'react';

function SearchInput({ query, setQuery, handleSearch, handleClear }) {
	const inputRef = useRef(null);
	const debounceTimeoutRef = useRef(null);

	const handleClearAndFocus = () => {
		handleClear();
		if (inputRef.current) {
			inputRef.current.focus();
		}
	};

	useEffect(() => {
		// Skip debounce if query is empty
		if (!query.trim()) return;

		// Debounce the handleSearch
		debounceTimeoutRef.current = setTimeout(() => {
			handleSearch();
		}, 300); // 300ms delay

		// Clear timeout if query changes quickly
		return () => clearTimeout(debounceTimeoutRef.current);
	}, [query]);

	return (
		<form onSubmit={handleSearch} className='flex gap-2 mb-6'>
			<input
				ref={inputRef}
				type='text'
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder='Start typing...'
				className='flex-1 border border-gray-300 px-4 py-2 rounded shadow-sm'
			/>
			<button
				type='submit'
				className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
			>
				Search
			</button>
			<button
				type='button'
				onClick={handleClearAndFocus}
				className='bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400'
			>
				Clear
			</button>
		</form>
	);
}

export default SearchInput;
