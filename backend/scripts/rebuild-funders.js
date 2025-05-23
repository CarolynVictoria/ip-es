// backend/scripts/rebuild-funders.js

/**
 * Script: rebuild-funders.js
 * ------------------------------------------
 * Purpose:
 *  - Safely rebuilds the full funders dataset after source corrections.
 *  - Deletes previous outputs if they exist.
 *  - Deletes Elasticsearch index 'funders-grant-finder' if it exists.
 *  - Runs the necessary scripts in order:
 *      1. Crawl landing pages → landing-pages-foundation-list.json
 *      2. Clean funder URLs → landing-pages.foundation-list.cleaned.json
 *      3. Build funder ➔ issue area map → funder-issuearea-map.json
 *      4. Crawl funder profile pages → funder-details-raw.json
 *      5. Build content index and upload to Elasticsearch → funders-grant-finder
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { Client } from '@elastic/elasticsearch';

// --- Setup __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load environment variables (before anything else) ---
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// --- Setup Elasticsearch client ---
const client = new Client({
	cloud: { id: process.env.ELASTICSEARCH_CLOUD_ID },
	auth: { apiKey: process.env.ELASTICSEARCH_API_KEY },
});

// --- Config ---
const dataFiles = [
	path.resolve(__dirname, '../data/landing-pages-foundation-list.json'),
	path.resolve(__dirname, '../data/landing-pages.foundation-list.cleaned.json'),
	path.resolve(__dirname, '../data/funder-issuearea-map.json'),
	path.resolve(__dirname, '../data/funder-details-raw.json'),
	path.resolve(__dirname, '../data/seed-urls.json'),
];
const esIndex = 'funders-grant-finder';

// --- Rebuild function ---
async function rebuild() {
	try {
		console.log('🔵 Deleting old data files if they exist...');
		for (const filePath of dataFiles) {
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
				console.log(`🗑️ Deleted ${path.basename(filePath)}`);
			} else {
				console.log(`ℹ️ File not found (ok): ${path.basename(filePath)}`);
			}
		}

		console.log(`🔵 Checking if index '${esIndex}' exists...`);
		const exists = await client.indices.exists({ index: esIndex });
		if (exists) {
			console.log(`🗑️ Deleting existing index '${esIndex}'...`);
			await client.indices.delete({ index: esIndex });
		} else {
			console.log(`ℹ️ Index '${esIndex}' not found (ok)`);
		}

		console.log('🚀 Running scripts to rebuild funder data...');

		console.log('1️⃣ Crawling landing pages...');
		execSync('node backend/scripts/crawl-landing-pages.js', {
			stdio: 'inherit',
		});

		console.log('2️⃣ Cleaning funder URLs...');
		execSync('node backend/scripts/clean-funder-urls.js', { stdio: 'inherit' });

		console.log('3️⃣ Building funder ➔ issue area map...');
		execSync('node backend/scripts/build-funder-issueareas-map.js', {
			stdio: 'inherit',
		});

		console.log('4️⃣ Crawling funder profile pages...');
		execSync('node backend/scripts/crawl-funder-pages.js', {
			stdio: 'inherit',
		});

		console.log('5️⃣ Building content index and uploading to Elasticsearch...');
		execSync('node backend/scripts/build-content-index.js', {
			stdio: 'inherit',
		});

		console.log('✅ Rebuild complete.');
	} catch (error) {
		console.error('❌ Rebuild failed:', error.message);
		process.exit(1);
	}
}

// --- Start the rebuild ---
rebuild();
