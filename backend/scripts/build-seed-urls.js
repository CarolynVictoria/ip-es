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
 *      4. Build content index and upload to Elasticsearch → funders-grant-finder
 *
 * Usage:
 *  $ node backend/scripts/rebuild-funders.js
 *
 * Prerequisites:
 *  - Ensure .env file is configured.
 *  - Ensure backend/scripts/ has all the required scripts present.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('backend/.env') });

import { execSync } from 'child_process';
import fs from 'fs';
import { Client } from '@elastic/elasticsearch';

// Setup Elasticsearch client
const client = new Client({
	cloud: { id: process.env.ELASTICSEARCH_CLOUD_ID },
	auth: { apiKey: process.env.ELASTICSEARCH_API_KEY },
});

// Define paths to delete
const dataFiles = [
	'backend/data/landing-pages-foundation-list.json',
	'backend/data/landing-pages.foundation-list.cleaned.json',
	'backend/data/funder-issuearea-map.json',
	'backend/data/funder-details-raw.json',
	'backend/data/seed-urls.json',
];

// Define index to delete
const esIndex = 'funders-grant-finder';

async function rebuild() {
	try {
		console.log('🔵 Deleting old data files if they exist...');
		for (const filePath of dataFiles) {
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
				console.log(`🗑️ Deleted ${filePath}`);
			} else {
				console.log(`ℹ️ File not found (ok): ${filePath}`);
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
		execSync('node backend/scripts/clean-funder-urls.js', {
			stdio: 'inherit',
		});

		console.log('3️⃣ Building funder ➔ issue area map...');
		execSync('node backend/scripts/build-funder-issueareas-map.js', {
			stdio: 'inherit',
		});

		console.log('4️⃣ Building content index and uploading to Elasticsearch...');
		execSync('node backend/scripts/build-content-index.js', {
			stdio: 'inherit',
		});

		console.log('✅ Rebuild complete.');
	} catch (error) {
		console.error('❌ Rebuild failed:', error.message);
		process.exit(1);
	}
}

// --- Start ---
rebuild();
