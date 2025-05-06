// backend/scripts/build-content-location-index.js
// Reads funder-location-details-raw.json and builds the funders-grant-finder-locations index in Elasticsearch.

import fs from 'fs';
import path from 'path';
import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({
	cloud: { id: process.env.ELASTICSEARCH_CLOUD_ID },
	auth: { apiKey: process.env.ELASTICSEARCH_API_KEY },
});

const indexName = 'funders-grant-finder-locations';
const funderDetailsPath = path.resolve(
	__dirname,
	'../data/funder-location-details-raw.json'
);
const funderDetails = JSON.parse(fs.readFileSync(funderDetailsPath, 'utf8'));

async function buildDocuments() {
	const documents = [];
	let excludedCount = 0;
	const excludedUrls = [];

	for (const record of funderDetails) {
		if (
			record.funderUrl.includes('google.com/url?') ||
			record.funderUrl.includes('/find-a-grant/')
		) {
			excludedCount++;
			excludedUrls.push(record.funderUrl);
			continue;
		}

		documents.push({
			funderName: record.funderName || '',
			funderUrl: record.funderUrl,
			state: Array.isArray(record.state) ? record.state : [],
			overview: record.overview || '',
			ipTake: record.ipTake || '',
			profile: record.profile || '',
		});
	}

	console.log(`Excluded ${excludedCount} funders due to invalid URLs.`);

	if (excludedUrls.length > 0) {
		const logDir = path.resolve(__dirname, '../logs');
		const logPath = path.join(logDir, 'excluded-location-urls.json');
		fs.mkdirSync(logDir, { recursive: true });
		fs.writeFileSync(logPath, JSON.stringify(excludedUrls, null, 2));
		console.log(`Wrote excluded URLs to ${logPath}`);
	}

	return documents;
}

async function createIndexAndUpload() {
	try {
		const exists = await client.indices.exists({ index: indexName });
		if (exists) {
			console.log(`Deleting existing index: ${indexName}`);
			await client.indices.delete({ index: indexName });
		}

		console.log(`Creating new index: ${indexName}`);
		await client.indices.create({
			index: indexName,
			body: {
				settings: {
					analysis: {
						analyzer: {
							autocomplete_analyzer: {
								tokenizer: 'autocomplete_tokenizer',
								filter: ['lowercase'],
							},
						},
						tokenizer: {
							autocomplete_tokenizer: {
								type: 'edge_ngram',
								min_gram: 2,
								max_gram: 15,
								token_chars: ['letter', 'digit'],
							},
						},
					},
				},
				mappings: {
					properties: {
						funderName: {
							type: 'text',
							fields: {
								autocomplete: {
									type: 'text',
									analyzer: 'autocomplete_analyzer',
									search_analyzer: 'standard',
								},
							},
						},
						funderUrl: { type: 'keyword' },
						state: { type: 'keyword' },
						overview: {
							type: 'text',
							fields: {
								autocomplete: {
									type: 'text',
									analyzer: 'autocomplete_analyzer',
									search_analyzer: 'standard',
								},
							},
						},
						ipTake: {
							type: 'text',
							fields: {
								autocomplete: {
									type: 'text',
									analyzer: 'autocomplete_analyzer',
									search_analyzer: 'standard',
								},
							},
						},
						profile: {
							type: 'text',
							fields: {
								autocomplete: {
									type: 'text',
									analyzer: 'autocomplete_analyzer',
									search_analyzer: 'standard',
								},
							},
						},
					},
				},
			},
		});

		const documents = await buildDocuments();
		if (documents.length === 0) {
			console.error('No documents to upload. Aborting.');
			return;
		}

		console.log(`Uploading ${documents.length} documents...`);
		const body = documents.flatMap((doc) => [
			{ index: { _index: indexName } },
			doc,
		]);
		const bulkResponse = await client.bulk({ refresh: true, body });

		if (bulkResponse.errors) {
			console.error('Errors occurred during bulk upload.');
			bulkResponse.items.forEach((item) => {
				if (item.index && item.index.error) {
					console.error(item.index.error);
				}
			});
		} else {
			console.log('Upload completed successfully.');
		}
	} catch (err) {
		console.error('Error during index build/upload:', err);
	}
}

createIndexAndUpload();
