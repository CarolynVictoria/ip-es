// unified-data-bulk-index-funders.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pino from 'pino';
import { Client } from '@elastic/elasticsearch';

// --- Setup __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load .env ---
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// --- Logging ---
const logDir = path.resolve(__dirname, '../output');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logger = pino(pino.destination(path.join(logDir, 'index.log')));

// --- Setup Elasticsearch client ---
const client = new Client({
	cloud: { id: process.env.ELASTICSEARCH_CLOUD_ID },
	auth: { apiKey: process.env.ELASTICSEARCH_API_KEY },
	requestTimeout: 120000,
});

const INDEX = process.env.ELASTICSEARCH_INDEX || 'funders';
const DATA_PATH = path.join(logDir, 'funder-docs.json');

// -- Maps raw "places" to geoLocation.states (can expand as needed) --
function buildGeoLocationFromDoc(doc) {
	return {
		states: Array.isArray(doc.places) ? doc.places : [],
		// You can expand this function if you want to set countries/regions/cities
	};
}

// -- Main indexer --
async function bulkIndexFunders() {
	const raw = fs.readFileSync(DATA_PATH, 'utf-8');
	const docs = JSON.parse(raw);

	logger.info(`Read ${docs.length} funder profiles from ${DATA_PATH}`);

	const body = [];

	for (const doc of docs) {
		const {
			title,
			url,
			overview = '',
			ipTake = '',
			profile = '',
			issueAreas = [],
		} = doc;

		const geoLocation = buildGeoLocationFromDoc(doc);

		logger.info(`Indexing: ${title}`);

		body.push({ index: { _index: INDEX } });
		body.push({
			funderName: title,
			funderUrl: url,
			overview,
			ipTake,
			profile,
			issueAreas,
			geoLocation,
		});
	}

	const resp = await client.bulk({ refresh: true, body });

	if (resp.errors) {
		resp.items.forEach((item, i) => {
			if (item.index && item.index.error) {
				logger.error(`Error indexing doc ${i}: ${item.index.error.reason}`);
			}
		});
		console.error('Some documents failed to index.');
	} else {
		logger.info(`Successfully indexed ${docs.length} documents to ${INDEX}`);
		console.log(`Indexed ${docs.length} documents.`);
	}
}

bulkIndexFunders().catch((err) => {
	console.error('Fatal error:', err);
	logger.error(err);
	process.exit(1);
});
