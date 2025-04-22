import FunderCard from './FunderCard';

function FunderList({ results }) {
	return (
		<ul className='space-y-4'>
			{results.map((hit) => (
				<FunderCard key={hit.id} hit={hit} />
			))}
		</ul>
	);
}

export default FunderList;
