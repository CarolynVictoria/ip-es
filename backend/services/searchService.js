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

async function runSearchQuery(query, filters) {
	try {
		const esQuery = {
			index: 'funders-structured',
			size: 10,
			query: {
				match_phrase_prefix: {
					funderName: {
						query: query,
						slop: 2,
					},
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
		console.error('Error in runSearchQuery:', error);
		throw error;
	}
}

export { runSearchQuery };
