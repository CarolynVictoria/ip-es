import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log(
	'[DEBUG] ELASTICSEARCH_CLOUD_ID:',
	process.env.ELASTICSEARCH_CLOUD_ID
);
console.log(
	'[DEBUG] ELASTICSEARCH_API_KEY:',
	process.env.ELASTICSEARCH_API_KEY
);

const client = new Client({
	cloud: {
		id: process.env.ELASTICSEARCH_CLOUD_ID,
	},
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY,
	},
});

async function runSearchQuery(query, filters = {}) {
	try {
		const response = await client.search({
			index: process.env.ELASTICSEARCH_INDEX,
			query: {
				multi_match: {
					query,
					type: 'bool_prefix',
					fields: ['title', 'title._2gram', 'title._3gram', 'body_content'],
				},
			},
		});

		return response.hits;
	} catch (error) {
		console.error('Elasticsearch query error:', error);
		return { hits: [] };
	}
}

export { runSearchQuery };
