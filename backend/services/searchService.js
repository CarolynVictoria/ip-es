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

async function runSearchQuery(rawQuery) {
	try {
		const cleaned = rawQuery.trim();
		const isQuoted = /^".*"$/.test(cleaned);
		const normalizedQuery = cleaned.replace(/^"|"$/g, '');

		const subqueries = normalizedQuery
			.split(/\+|,/)
			.map((s) => s.trim())
			.filter(Boolean);

		const mustClause = {
			multi_match: {
				query: normalizedQuery,
				type: 'cross_fields',
				operator: 'and',
				fields: [
					'funderName^10',
					'overview^5',
					'ipTake^4',
					'profile^3',
					'funderName.autocomplete^2',
					'overview.autocomplete^2',
					'ipTake.autocomplete^2',
					'profile.autocomplete^2',
				],
			},
		};

		const phraseClause =
			isQuoted || normalizedQuery.includes(' ')
				? [
						{
							match_phrase: {
								funderName: {
									query: normalizedQuery,
									boost: 8,
								},
							},
						},
				  ]
				: [];

		const esQuery = {
			index: 'funders-grant-finder',
			size: 200,
			query: {
				bool: {
					must: [mustClause],
				},
			},
			highlight: {
				fields: {
					funderName: {},
				},
			},
		};

		const { hits } = await client.search(esQuery);

		const primaryResults = [];
		const secondaryResults = [];

		const forbiddenIssueAreas = [
			'Celebrity',
			'Wall Street Donors',
			'Tech Philanthropists',
		];

		for (const hit of hits.hits) {
			const source = hit._source;
			const highlight = hit.highlight || {};

			const hasOnlyForbiddenIssueAreas =
				source.issueAreas &&
				source.issueAreas.length > 0 &&
				source.issueAreas.every((area) => forbiddenIssueAreas.includes(area));

			if (highlight.funderName) {
				if (!hasOnlyForbiddenIssueAreas) {
					primaryResults.push({
						id: hit._id,
						funderName: source.funderName,
						funderUrl: source.funderUrl,
						ipTake: source.ipTake,
						overview: source.overview,
						profile: source.profile,
						issueAreas: source.issueAreas,
					});
				}
			} else {
				if (!hasOnlyForbiddenIssueAreas) {
					secondaryResults.push({
						id: hit._id,
						funderName: source.funderName,
						funderUrl: source.funderUrl,
						ipTake: source.ipTake,
						overview: source.overview,
						profile: source.profile,
						issueAreas: source.issueAreas,
					});
				}
			}
		}

		return { primaryResults, secondaryResults };
	} catch (error) {
		console.error('Error in runSearchQuery:', error.meta?.body?.error || error);
		throw error;
	}
}

async function runSemanticSearchQuery(rawQuery) {
	try {
		const cleaned = rawQuery.trim();
		if (!cleaned) return { primaryResults: [], secondaryResults: [] };

		const esQuery = {
			index: 'funders-grant-finder-semantic',
			size: 100,
			query: {
				bool: {
					should: [
						{ semantic: { query: cleaned, field: 'overview' } },
						{ semantic: { query: cleaned, field: 'ipTake' } },
						{ semantic: { query: cleaned, field: 'profile' } },
					],
				},
			},
		};

		const { hits } = await client.search(esQuery);

		const primaryResults = hits.hits.map((hit) => ({
			id: hit._id,
			funderName: hit._source.funderName,
			funderUrl: hit._source.funderUrl,
			ipTake: hit._source.ipTake?.text || '',
			overview: hit._source.overview?.text || '',
			profile: hit._source.profile?.text || '',
			issueAreas: hit._source.issueAreas || [],
			score: hit._score,
		}));

		return { primaryResults, secondaryResults: [] };
	} catch (error) {
		console.error(
			'Error in runSemanticSearchQuery:',
			error.meta?.body?.error || error
		);
		throw error;
	}
}

export { runSearchQuery, runSemanticSearchQuery };
