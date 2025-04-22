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
			index: 'funders-grant-finder', // <-- updated index name
			size: 10,
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

		return {
			results: hits.hits.map((hit) => ({
				id: hit._id,
				funderName: hit._source.funderName,
				funderUrl: hit._source.funderUrl,
				ipTake: hit._source.ipTake,
				overview: hit._source.overview,
				issueAreas: hit._source.issueAreas,
			})),
		};
	} catch (error) {
		console.error('Error in runSearchQuery:', error.meta?.body?.error || error);
		throw error;
	}
}

export { runSearchQuery };
