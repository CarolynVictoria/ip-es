// backend/services/searchService.js
// Description: Provides functions for search queries on an Elasticsearch index.
// It includes functions for both standard and semantic search queries.
// It uses the Elasticsearch client to interact with the Elasticsearch service.
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

async function runSearchQuery(
	rawQuery,
	filters = {},
	searchType = 'any', // "any" | "all" | "exact"
	funderNameOnly = false // Only search in funderName if true
) {
	try {
		const cleaned = typeof rawQuery === 'string' ? rawQuery.trim() : '';
		const normalizedQuery = cleaned.replace(/^"|"$/g, '');

		let fields = funderNameOnly
			? ['funderName^10', 'funderName.autocomplete^6', 'funderName.keyword^20']
			: [
					'funderName^10',
					'overview^5',
					'ipTake^4',
					'profile^3',
					'funderName.autocomplete^6',
					'overview.autocomplete^2',
					'ipTake.autocomplete^2',
					'profile.autocomplete^2',
					'funderName.keyword^20',
					'overview.keyword^7',
					'ipTake.keyword^5',
					'profile.keyword^5',
			  ];

		let mustClause = null;
		if (cleaned) {
			if (searchType === 'exact') {
				mustClause = {
					bool: {
						should: funderNameOnly
							? [{ match_phrase: { funderName: normalizedQuery } }]
							: [
									{ match_phrase: { funderName: normalizedQuery } },
									{ match_phrase: { overview: normalizedQuery } },
									{ match_phrase: { ipTake: normalizedQuery } },
									{ match_phrase: { profile: normalizedQuery } },
							  ],
						minimum_should_match: 1,
					},
				};
			} else {
				mustClause = {
					multi_match: {
						query: normalizedQuery,
						type: 'cross_fields',
						operator: searchType === 'all' ? 'and' : 'or',
						fields,
					},
				};
			}
		}

		const filterClauses = [];
		if (filters.issueAreas?.length) {
			filterClauses.push({ terms: { issueAreas: filters.issueAreas } });
		}
		if (filters.locations?.length) {
			filterClauses.push({
				terms: { 'geoLocation.states': filters.locations },
			});
		}

		const esQuery = {
			index: 'funders',
			size: 200,
			_source: [
				'funderName',
				'funderUrl',
				'overview',
				'ipTake',
				'profile',
				'issueAreas',
				'geoLocation.states',
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

			results.push({
				id: hit._id,
				funderName: source.funderName,
				funderUrl: source.funderUrl,
				ipTake: source.ipTake,
				overview: source.overview,
				profile: source.profile,
				issueAreas: source.issueAreas,
				geoLocation: { states: source.geoLocation?.states || [] },
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
			filterClauses.push({ terms: { issueAreas: filters.issueAreas } });
		}
		if (filters.locations?.length) {
			filterClauses.push({
				terms: { 'geoLocation.states': filters.locations },
			});
		}
		if (!hasQuery && filterClauses.length === 0) {
			return { results: [] };
		}

		const esQuery = {
			index: 'funders-semantic',
			size: 200,
			_source: [
				'funderName',
				'funderUrl',
				'overview',
				'ipTake',
				'profile',
				'issueAreas',
				'geoLocation.states',
			],
			query: hasQuery
				? {
						bool: {
							should: [
								{ semantic: { query: cleaned, field: 'overview' } },
								{ semantic: { query: cleaned, field: 'ipTake' } },
								{ semantic: { query: cleaned, field: 'profile' } },
							],
							filter: filterClauses,
						},
				  }
				: { bool: { filter: filterClauses } },
			...(hasQuery ? {} : { sort: [{ 'funderName.keyword': 'asc' }] }),
		};

		const { hits } = await client.search(esQuery);

		const results = [];
		for (const hit of hits.hits) {
			const source = hit._source;
			results.push({
				id: hit._id,
				funderName: source.funderName,
				funderUrl: source.funderUrl,
				ipTake: source.ipTake?.text || '',
				overview: source.overview?.text || '',
				profile: source.profile?.text || '',
				issueAreas: source.issueAreas || [],
				geoLocation: { states: source.geoLocation?.states || [] },
				score: hit._score,
				matchType: 'semantic',
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
