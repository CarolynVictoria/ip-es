// backend/scripts/transform-and-index-funder.js
// File: backend/scripts/transform-and-index-funder.js
//
// Purpose:
// Reads documents from 'search-ful-site-crawl' and builds a structured funder index ('ip-structured-funders').
// Extracts OVERRIDE / IP TAKE / PROFILE sections from crawled body_content.
//
// Status:
// NOT USED in current production pipeline. Previously used for direct crawl-based funder indexing.

import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '../.env' });

const sourceIndex = 'search-ful-site-crawl';
const targetIndex = 'ip-structured-funders';

const client = new Client({
	cloud: {
		id: process.env.ELASTICSEARCH_CLOUD_ID,
	},
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY,
	},
});

// --- Logging setup ---
const timestamp = new Date()
	.toISOString()
	.replace(/[-:]/g, '')
	.replace(/\..+/, '');
const logDir = path.resolve('logs');
const logPath = path.join(logDir, `transform-${timestamp}.log`);
fs.mkdirSync(logDir, { recursive: true });
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(message) {
	const full = `[${new Date().toISOString()}] ${message}`;
	console.log(full);
	logStream.write(full + '\n');
}

// --- Transform helpers ---
function extractSection(text, label) {
	const regex = new RegExp(
		`${label.toUpperCase()}:\\s*(.*?)\\s*(?=[A-Z ]{4,}:|$)`,
		's'
	);
	const match = text.match(regex);
	return match ? match[1].trim() : null;
}

function slugify(text) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

async function transformAndIndexBatch() {
	const query = {
		bool: {
			should: [
				{ prefix: { url_path: '/find-a-grant/' } },
				{ prefix: { url_path: '/find-a-grant-places/' } },
			],
			minimum_should_match: 1,
		},
	};

	const result = await client.search({
		index: sourceIndex,
		size: 1000,
		query,
		scroll: '2m',
	});

	let scrollId = result._scroll_id;
	let hits = result.hits?.hits ?? [];
	let count = 0;

	while (hits.length) {
		for (const hit of hits) {
			const doc = hit._source;

			const transformed = {
				title: doc.title,
				slug: slugify(doc.title),
				url: doc.url,
				entity_type: 'funder_profile',
				overview: extractSection(doc.body_content, 'OVERVIEW'),
				ip_take: extractSection(doc.body_content, 'IP TAKE'),
				profile: extractSection(doc.body_content, 'PROFILE'),
				issue_areas: [],
				geo_focus: [],
				population_served: [],
				people: [],
				location: {
					city: '',
					state: '',
					country: '',
				},
				indexed_at: doc.last_crawled_at,
				source_index: sourceIndex,
			};

			const urlPath = doc.url?.path || doc.url_path || '';
			const id = `${slugify(doc.title)}-${slugify(urlPath)}`;

			try {
				await client.index({
					index: targetIndex,
					id,
					document: transformed,
				});
				log(`[${++count}] Indexed: ${transformed.title} (ID: ${id})`);
			} catch (err) {
				log(
					`❌ Failed to index "${transformed.title}" (ID: ${id}): ${err.message}`
				);
			}
		}

		const nextPage = await client.scroll({
			scroll_id: scrollId,
			scroll: '2m',
		});

		scrollId = nextPage._scroll_id;
		hits = nextPage.hits?.hits ?? [];
	}

	log(
		`✅ Completed. Total funder profiles indexed into '${targetIndex}': ${count}`
	);
	logStream.end();
}

transformAndIndexBatch().catch((err) => {
	log(`❌ Script failed: ${err.message}`);
	logStream.end();
});
