import FunderCard from './FunderCard';

function FunderList({ results, fetch990 = true }) {
	// Step 1: Calculate the top score
	const topScore =
		results && results.length > 0 && typeof results[0].score === 'number'
			? results[0].score
			: 1; // Prevent divide by zero

	return (
		<ul>
			{results.map((hit) => (
				// Step 2: Pass topScore as a prop
				<FunderCard
					key={hit.id || hit._id}
					hit={hit}
					fetch990={fetch990}
					topScore={topScore}
				/>
			))}
		</ul>
	);
}

export default FunderList;
