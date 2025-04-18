// backend/scripts/build-content-index.js

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
	console.error(
		'Missing ELASTICSEARCH_CLOUD_ID or ELASTICSEARCH_API_KEY in .env'
	);
	process.exit(1);
}

const client = new Client({
	cloud: { id: cloudId },
	auth: { apiKey },
});

// Define index name
const indexName = 'funders-structured';

// Load funder to issue area map
const funderIssueAreaPath = path.resolve(
	__dirname,
	'../data/funder-issuearea-map.json'
);
const funderIssueArea = JSON.parse(
	fs.readFileSync(funderIssueAreaPath, 'utf8')
);

// added the extractor
function extractSectionsFromBodyContent(bodyContent) {
	const sections = {
		overview: '',
		ipTake: '',
		profile: '',
	};

	if (!bodyContent) {
		return sections;
	}

	const normalizedText = bodyContent
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n');

	const overviewIndex = normalizedText.indexOf('OVERVIEW:');
	const ipTakeIndex = normalizedText.indexOf('IP TAKE:');
	const profileIndex = normalizedText.indexOf('PROFILE:');

	if (overviewIndex !== -1) {
		const start = overviewIndex + 'OVERVIEW:'.length;
		const end = ipTakeIndex !== -1 ? ipTakeIndex : normalizedText.length;
		sections.overview = normalizedText.slice(start, end).trim();
	}

	if (ipTakeIndex !== -1) {
		const start = ipTakeIndex + 'IP TAKE:'.length;
		const end = profileIndex !== -1 ? profileIndex : normalizedText.length;
		sections.ipTake = normalizedText.slice(start, end).trim();
	}

	if (profileIndex !== -1) {
		const start = profileIndex + 'PROFILE:'.length;
		const end = normalizedText.length;
		sections.profile = normalizedText.slice(start, end).trim();
	}

	return sections;
}

// Helper function to create documents
async function buildDocuments() {
	const documents = [];
	let excludedCount = 0;
	const excludedUrls = [];

	for (const [funderUrl, funderData] of Object.entries(funderIssueArea)) {
		// Skip bad URLs
		if (
			funderUrl.includes('/find-a-grant-places/') ||
			funderUrl.includes('google.com/url?')
		) {
			excludedCount++;
			excludedUrls.push(funderUrl);
			continue;
		}

		// Try to find matching crawled document
		let overview = '';
		let ipTake = '';
		let profile = '';

		try {
			const response = await client.search({
				index: 'search-ful-site-crawl',
				size: 1,
				query: {
					term: {
						url: funderUrl,
					},
				},
			});

			if (response.hits.hits.length > 0) {
				const bodyContent = response.hits.hits[0]._source.body_content;
				if (bodyContent) {
					const sections = extractSectionsFromBodyContent(bodyContent);
					overview = sections.overview;
					ipTake = sections.ipTake;
					profile = sections.profile;
				}
			}
		} catch (error) {
			console.error(
				`Error fetching crawled content for ${funderUrl}:`,
				error.message
			);
		}

		documents.push({
			funderName: funderData.funderName,
			funderUrl: funderUrl,
			issueAreas: Array.isArray(funderData.issueAreas)
				? funderData.issueAreas
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
						overview: { type: 'text' }, // <-- NEW
						ipTake: { type: 'text' }, // <-- NEW
						profile: { type: 'text' }, // <-- NEW
					},
				},
			},
		});

		const documents = await buildDocuments();

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
