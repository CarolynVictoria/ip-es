// backend/scripts/build-content-index.js
// This script reads cleaned funder-to-IssueArea mappings from funder-issuearea-map.json,
// fetches full body content for each funder from the crawled content index (search-ful-site-crawl),
// extracts Overview, IP Take, and Profile sections,
// and builds a new structured index 'funders-grant-finder' in Elasticsearch.
// It skips invalid or irrelevant URLs and logs them separately.

import fs from 'fs';
import path from 'path';
import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Setup Elasticsearch client
const cloudId = process.env.ELASTICSEARCH_CLOUD_ID;
const apiKey = process.env.ELASTICSEARCH_API_KEY;

if (!cloudId || !apiKey) {
	console.error('Missing ELASTICSEARCH_CLOUD_ID or ELASTICSEARCH_API_KEY in .env');
	process.exit(1);
}

const client = new Client({
	cloud: { id: cloudId },
	auth: { apiKey },
});

// Define index name
const indexName = 'funders-grant-finder';

// Load funder to issue area map
// replaced with new code cvm 04-21-2024
const funderDetailsPath = path.resolve(
	__dirname,
	'../data/funder-details-raw.json'
);
const funderDetails = JSON.parse(fs.readFileSync(funderDetailsPath, 'utf8'));

// Helper function to create documents
async function buildDocuments() {
	const documents = [];
	let excludedCount = 0;
	const excludedUrls = [];

	// replace with new code cvm 04-21-2024
	for (const record of funderDetails) {
		// Skip bad URLs
		if (
			record.funderUrl.includes('/find-a-grant-places/') ||
			record.funderUrl.includes('google.com/url?')
		) {
			excludedCount++;
			excludedUrls.push(record.funderUrl);
			continue;
		}

		const overview = record.overview || '';
		const ipTake = record.ipTake || '';
		const profile = record.profile || '';

		if (!overview && !ipTake && !profile) {
			console.warn(`Warning: All content fields missing for ${record.funderUrl}`);
		}

		documents.push({
			funderName: record.issueAreas?.funderName || '',
			funderUrl: record.funderUrl,
			issueAreas: Array.isArray(record.issueAreas?.issueAreas)
				? record.issueAreas.issueAreas
				: [],
			overview,
			ipTake,
			profile,
		});
	}

	console.log(`Excluded ${excludedCount} funders due to bad URLs.`);

	// Write excluded URLs to a log file
	if (excludedUrls.length > 0) {
		const logDir = path.resolve(__dirname, '../logs');
		const logPath = path.join(logDir, 'excluded-funder-urls.json');

		fs.mkdirSync(logDir, { recursive: true });
		fs.writeFileSync(logPath, JSON.stringify(excludedUrls, null, 2));
		console.log(`Wrote excluded URLs to ${logPath}`);
	}

	return documents;
}

async function createIndexAndUpload() {
	try {
		// Delete index if it already exists
		const exists = await client.indices.exists({ index: indexName });
		if (exists) {
			console.log(`Deleting existing index: ${indexName}`);
			await client.indices.delete({ index: indexName });
		}

		// Create new index
		console.log(`Creating new index: ${indexName}`);
		await client.indices.create({
			index: indexName,
			body: {
				mappings: {
					properties: {
						funderName: { type: 'text' },
						funderUrl: { type: 'keyword' },
						issueAreas: { type: 'keyword' },
						overview: { type: 'text' },
						ipTake: { type: 'text' },
						profile: { type: 'text' },
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
	} catch (error) {
		console.error('Error building index:', error);
	}
}

// Start the script
createIndexAndUpload();
