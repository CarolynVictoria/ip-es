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

		// Split on + or comma to form compound subqueries
		const subqueries = normalizedQuery
			.split(/\+|,/)
			.map((s) => s.trim())
			.filter(Boolean);

		const mustClauses = subqueries.map((term) => ({
			bool: {
				should: [
					{
						multi_match: {
							query: term,
							type: 'phrase',
							fields: ['funderName^5', 'ipTake^3', 'overview^3', 'profile^3'],
							boost: 10,
						},
					},
					{
						multi_match: {
							query: term,
							type: 'best_fields',
							operator: 'and',
							fields: ['funderName^4', 'ipTake^2', 'overview^2', 'profile^2'],
							boost: 5,
						},
					},
					{
						multi_match: {
							query: term,
							type: 'bool_prefix',
							fields: [
								'funderName.autocomplete',
								'ipTake.autocomplete',
								'overview.autocomplete',
								'profile.autocomplete',
							],
							boost: 2,
						},
					},
				],
				minimum_should_match: 1,
			},
		}));

		const esQuery = {
			index: 'funders-grant-finder',
			size: 200,
			query: {
				bool: {
					must: mustClauses,
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

		for (const hit of hits.hits) {
			const source = hit._source;
			const highlight = hit.highlight || {};

			if (highlight.funderName) {
				primaryResults.push({
					id: hit._id,
					funderName: source.funderName,
					funderUrl: source.funderUrl,
					ipTake: source.ipTake,
					overview: source.overview,
					profile: source.profile,
					issueAreas: source.issueAreas,
				});
			} else {
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

		return { primaryResults, secondaryResults };
	} catch (error) {
		console.error('Error in runSearchQuery:', error.meta?.body?.error || error);
		throw error;
	}
}

export { runSearchQuery };
