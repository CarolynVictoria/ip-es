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
	requestTimeout: 120000, // 2 minutes
});

const INDEX = process.env.ELASTICSEARCH_INDEX || 'funders';
const DATA_PATH = path.join(logDir, 'funder-docs.json');
const TAG_TYPE_MAP_PATH = path.resolve(
	__dirname,
	'../../src/data/tagTypeMapping.json'
);

const tagTypeMap = JSON.parse(fs.readFileSync(TAG_TYPE_MAP_PATH, 'utf-8'));

function parseTagsToLocationFields(tags, funderTitle = 'unknown') {
	const issueAreas = [];
	const states = new Set();
	const regions = new Set();

	for (const tag of tags) {
		const type = tagTypeMap[tag];

		if (!type) {
			logger.warn(`Unrecognized tag "${tag}" in funder: ${funderTitle}`);

			continue;
		}

		if (type === 'issueArea') {
			issueAreas.push(tag);
		} else if (type === 'state') {
			states.add(tag);
		} else if (type === 'region') {
			regions.add(tag);
			// infer state from known regions (optional logic)
			if (tag === 'bay-area-grants' || tag === 'southern-california-grants') {
				states.add('california-grants');
			} else if (tag === 'washington-dc-grants') {
				states.add('district-of-columbia');
			}
		}
	}

	return {
		issueAreas,
		geoLocation: {
			states: [...states],
			regions: [...regions],
		},
	};
}

async function bulkIndexFunders() {
	const raw = fs.readFileSync(DATA_PATH, 'utf-8');
	const docs = JSON.parse(raw);

	logger.info(`Read ${docs.length} funder profiles from ${DATA_PATH}`);

	const body = [];

	for (const doc of docs) {
		const { title, url, tags, overview, ipTake, profile } = doc;

		const { issueAreas, geoLocation } = parseTagsToLocationFields(tags, title);

		logger.info(`Indexing: ${title}`);

		body.push({ index: { _index: INDEX } });
		body.push({
			funderName: title,
			funderUrl: url,
			issueAreas,
			geoLocation,
			overview,
			ipTake,
			profile,
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
		console.log(`✅ Indexed ${docs.length} documents.`);
	}
}

bulkIndexFunders().catch((err) => {
	console.error('Fatal error:', err);
	logger.error(err);
	process.exit(1);
});
