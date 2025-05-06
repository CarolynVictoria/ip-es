import FunderCard from './FunderCard';

function FunderList({ results, fetch990 = true }) {
	return (
		<ul>
			{results.map((hit) => (
				<FunderCard key={hit.id} hit={hit} fetch990={fetch990} />
			))}
		</ul>
	);
}

export default FunderList;
