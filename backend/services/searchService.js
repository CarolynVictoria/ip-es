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

async function runSearchQuery(query) {
	try {
		const esQuery = {
			index: 'funders-grant-finder',
			size: 200,
			query: {
				bool: {
					should: [
						{
							multi_match: {
								query: query,
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
						{
							multi_match: {
								query: query,
								type: 'phrase',
								fields: ['funderName', 'ipTake', 'overview', 'profile'],
								boost: 3,
							},
						},
						{
							multi_match: {
								query: query,
								fields: ['funderName', 'ipTake', 'overview', 'profile'],
								boost: 1,
							},
						},
					],
					minimum_should_match: 1,
				},
			},
		};

		const { hits } = await client.search(esQuery);

		const primaryResults = [];
		const secondaryResults = [];

		for (const hit of hits.hits) {
			const source = hit._source;
			const funderNameLower = (source.funderName || '').toLowerCase();
			const queryLower = query.toLowerCase();

			// Determine if the query is in the funderName field (primary)
			if (funderNameLower.includes(queryLower)) {
				primaryResults.push({
					id: hit._id,
					funderName: source.funderName,
					funderUrl: source.funderUrl,
					ipTake: source.ipTake,
					overview: source.overview,
					profile: source.profile, // ✅ Add this
					issueAreas: source.issueAreas,
				});
			} else {
				secondaryResults.push({
					id: hit._id,
					funderName: source.funderName,
					funderUrl: source.funderUrl,
					ipTake: source.ipTake,
					overview: source.overview,
					profile: source.profile, // ✅ Add this
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
