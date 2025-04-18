// backend/scripts/crawl-and-index-funders.js

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Client } from '@elastic/elasticsearch';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { issueAreaMap } from '../scripts/data/issueAreaMap.js';

dotenv.config({ path: '../../.env' }); // ✅ CORRECT: two levels up

// --- Elastic Client Setup ---
const client = new Client({
	cloud: {
		id: process.env.ELASTICSEARCH_CLOUD_ID,
	},
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY,
	},
});

// --- Config ---
const FUNDERS_INDEX = 'ip-funders';
const BASE_URL = 'https://www.staging24.insidephilanthropy.com/';

// --- Logging Setup ---
const timestamp = new Date()
	.toISOString()
	.replace(/[-:]/g, '')
	.replace(/\..+/, '');
const logDir = path.resolve('logs');
const logPath = path.join(logDir, `crawl-funders-${timestamp}.log`);
fs.mkdirSync(logDir, { recursive: true });
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(message) {
	const full = `[${new Date().toISOString()}] ${message}`;
	console.log(full);
	logStream.write(full + '\n');
}

// --- Helpers ---
function slugify(text) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

// --- Main Function ---
async function crawlAndIndexFunders() {
	try {
		let totalIndexed = 0;

		for (const [landingPath, issueArea] of Object.entries(issueAreaMap)) {
			const fullUrl = BASE_URL + landingPath;

			log(`🔎 Crawling: ${fullUrl}...`);

			const response = await fetch(fullUrl);
			if (!response.ok) {
				log(`❌ Failed to fetch ${fullUrl}: ${response.status}`);
				continue;
			}

			const html = await response.text();
			const dom = new JSDOM(html);
			const document = dom.window.document;

			const funderLinks = Array.from(
				document.querySelectorAll('.foundation-list a, .foundation-list-link a')
			);

			for (const link of funderLinks) {
				const funderName = link.textContent.trim();
				const funderUrl = link.href;

				const funderDoc = {
					funder_name: funderName,
					funder_url: funderUrl,
					interest_areas: [issueArea],
					overview: '', // Placeholder for now
					ip_take: '', // Placeholder for now
					profile: '', // Placeholder for now
					population_served: [],
					location_mentions: [],
					full_text: '',
					indexed_at: new Date().toISOString(),
				};

				const id = `${slugify(issueArea)}-${slugify(funderName)}`;

				try {
					await client.index({
						index: FUNDERS_INDEX,
						id,
						document: funderDoc,
					});
					log(`✅ Indexed: ${funderName} (${id})`);
					totalIndexed++;
				} catch (indexErr) {
					log(`❌ Error indexing ${funderName}: ${indexErr.message}`);
				}
			}
		}

		log(`🎯 Completed. Total funders indexed: ${totalIndexed}`);
	} catch (err) {
		log(`❌ Crawler failed: ${err.message}`);
	} finally {
		logStream.end();
	}
}

crawlAndIndexFunders();
