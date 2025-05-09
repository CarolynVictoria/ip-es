import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({
	cloud: {
		id: process.env.ELASTICSEARCH_CLOUD_ID,
	},
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY,
	},
});

// temp avoid major donor profiles
const forbiddenIssueAreas = [
	'Celebrity',
	'Wall Street Donors',
	'Tech Philanthropists',
];

// cvm added 5/6/2025 to process filters
function getIndexName(useSemantic, filters) {
	const hasLocationFilter =
		filters.locations &&
		Array.isArray(filters.locations) &&
		filters.locations.length > 0;

	if (useSemantic) {
		return hasLocationFilter
			? 'funders-grant-finder-places-semantic'
			: 'funders-grant-finder-semantic';
	} else {
		return hasLocationFilter
			? 'funders-grant-finder-places'
			: 'funders-grant-finder';
	}
}

async function runSearchQuery(rawQuery, filters = {}) {
	try {
		const cleaned = typeof rawQuery === 'string' ? rawQuery.trim() : '';
		const normalizedQuery = cleaned.replace(/^"|"$/g, '');

		const subqueries = normalizedQuery
			.split(/\+|,/)
			.map((s) => s.trim())
			.filter(Boolean);

		const mustClause = cleaned
			? {
					multi_match: {
						query: normalizedQuery,
						type: 'cross_fields',
						operator: 'and',
						fields: [
							'funderName^10', // Fundraising priority, boost the funderName field
							'overview^5', // Decrease weight on these fields
							'ipTake^4',
							'profile^3',
							'funderName.autocomplete^6', // Increase weight on autocomplete matches
							'overview.autocomplete^2', // Keep autocomplete boosts but lower
							'ipTake.autocomplete^2',
							'profile.autocomplete^2',
						],
					},
			  }
			: null;

		const filterClauses = [];

		if (filters.issueAreas?.length) {
			filterClauses.push({ terms: { issueAreas: filters.issueAreas } });
		}
		if (filters.locations?.length) {
			filterClauses.push({ terms: { state: filters.locations } });
		}

		const esQuery = {
			index: getIndexName(false, filters),
			size: 200,
			_source: [
				'funderName',
				'funderUrl',
				'overview',
				'ipTake',
				'profile',
				'issueAreas',
				'state',
			],
			query: {
				bool: {
					...(mustClause ? { must: [mustClause] } : {}),
					filter: filterClauses,
				},
			},
			...(mustClause ? {} : { sort: [{ 'funderName.keyword': 'asc' }] }),
			highlight: {
				fields: {
					funderName: {},
				},
			},
		};

		console.log(
			'Final ES Query (runSearchQuery):',
			JSON.stringify(esQuery, null, 2)
		);

		const { hits } = await client.search(esQuery);

		const results = [];

		for (const hit of hits.hits) {
			const source = hit._source;
			const highlight = hit.highlight || {};

			// Apply the forbidden issue areas filter
			const hasOnlyForbiddenIssueAreas =
				source.issueAreas &&
				source.issueAreas.length > 0 &&
				source.issueAreas.every((area) => forbiddenIssueAreas.includes(area));

			if (hasOnlyForbiddenIssueAreas) continue;

			results.push({
				id: hit._id,
				funderName: source.funderName,
				funderUrl: source.funderUrl,
				ipTake: source.ipTake,
				overview: source.overview,
				profile: source.profile,
				issueAreas: source.issueAreas,
				state: source.state, // retain state for UI
				matchType: highlight.funderName ? 'exact' : 'mention',
				score: hit._score,
			});
		}

		return { results };
	} catch (error) {
		console.error('Error in runSearchQuery:', error.meta?.body?.error || error);
		throw error;
	}
}

async function runSemanticSearchQuery(rawQuery, filters = {}) {
	try {
		const cleaned = typeof rawQuery === 'string' ? rawQuery.trim() : '';
		const hasQuery = cleaned.length > 0;

		const filterClauses = [];

		if (filters.issueAreas?.length) {
			filterClauses.push({
				terms: { issueAreas: filters.issueAreas },
			});
		}

		if (filters.locations?.length) {
			filterClauses.push({
				terms: { state: filters.locations },
			});
		}

		if (!hasQuery && filterClauses.length === 0) {
			return { results: [] };
		}

		const esQuery = {
			index: getIndexName(true, filters),
			size: 200,
			_source: [
				'funderName',
				'funderUrl',
				'overview',
				'ipTake',
				'profile',
				'issueAreas',
				'state',
			],
			query: hasQuery
				? {
						bool: {
							should: [
								{
									semantic: {
										query: cleaned,
										field: 'overview',
									},
								},
								{
									semantic: {
										query: cleaned,
										field: 'ipTake',
									},
								},
								{
									semantic: {
										query: cleaned,
										field: 'profile',
									},
								},
							],
							filter: filterClauses,
						},
				  }
				: {
						bool: {
							filter: filterClauses,
						},
				  },
			...(hasQuery ? {} : { sort: [{ 'funderName.keyword': 'asc' }] }),
		};

		console.log(
			'Final ES Query (runSemanticSearchQuery):',
			JSON.stringify(esQuery, null, 2)
		);

		const { hits } = await client.search(esQuery);

		const results = [];

		for (const hit of hits.hits) {
			const source = hit._source;

			// Apply the forbidden issue areas filter
			const hasOnlyForbiddenIssueAreas =
				source.issueAreas &&
				source.issueAreas.length > 0 &&
				source.issueAreas.every((area) => forbiddenIssueAreas.includes(area));

			if (hasOnlyForbiddenIssueAreas) continue;

			results.push({
				id: hit._id,
				funderName: source.funderName,
				funderUrl: source.funderUrl,
				ipTake: source.ipTake?.text || '',
				overview: source.overview?.text || '',
				profile: source.profile?.text || '',
				issueAreas: source.issueAreas || [],
				state: source.state || [],
				score: hit._score,
				matchType: 'semantic', // Optional if you want to differentiate in UI
			});
		}

		return { results };
	} catch (error) {
		console.error(
			'Error in runSemanticSearchQuery:',
			error.meta?.body?.error || error
		);
		throw error;
	}
}

export { runSearchQuery, runSemanticSearchQuery };
