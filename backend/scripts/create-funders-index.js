// backend/scripts/create-funders-index.js
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '../../.env' });

import { Client } from '@elastic/elasticsearch';

// --- Client Setup ---
const client = new Client({
	cloud: {
		id: process.env.ELASTICSEARCH_CLOUD_ID,
	},
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY,
	},
});

// --- Logging Setup ---
const timestamp = new Date()
	.toISOString()
	.replace(/[-:]/g, '')
	.replace(/\..+/, '');
const logDir = path.resolve('logs');
const logPath = path.join(logDir, `create-index-${timestamp}.log`);
fs.mkdirSync(logDir, { recursive: true });
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(message) {
	const full = `[${new Date().toISOString()}] ${message}`;
	console.log(full);
	logStream.write(full + '\n');
}

// --- Index Settings ---
const fundersIndex = 'ip-funders'; // Name your index here

const mappings = {
	mappings: {
		properties: {
			funder_name: { type: 'text' },
			funder_url: { type: 'keyword' },
			interest_areas: { type: 'keyword' },
			overview: { type: 'text' },
			ip_take: { type: 'text' },
			profile: { type: 'text' },
			population_served: { type: 'keyword' },
			location_mentions: { type: 'text' }, // extracted mentions, if any
			full_text: { type: 'text' }, // optional: for concatenated searchable blob
			indexed_at: { type: 'date' }, // indexing timestamp
		},
	},
	settings: {
		analysis: {
			analyzer: {
				default: {
					type: 'standard',
				},
			},
		},
	},
};

// --- Create Index Logic ---
async function createFundersIndex() {
	try {
		const exists = await client.indices.exists({ index: fundersIndex });

		if (exists) {
			log(`ℹ️ Index '${fundersIndex}' already exists. Skipping creation.`);
			return;
		}

		await client.indices.create({
			index: fundersIndex,
			...mappings,
		});

		log(`✅ Successfully created index '${fundersIndex}' with mappings.`);
	} catch (err) {
		log(`❌ Error creating index '${fundersIndex}': ${err.message}`);
	} finally {
		logStream.end();
	}
}

createFundersIndex();
