// backend/scripts/map-funders-to-areas.js
// File: backend/scripts/map-funders-to-areas.js
//
// Purpose: 
// Build a reverse map from funder URL paths to one or more Area slugs (like "arts", "climate").
// Useful for associating funders with topic or location areas based on their appearance in landing pages.
//
// Status: 
// Optional. This script is not used in the current main ingestion flow, but may be helpful for future enrichment.

import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '../.env' });

const client = new Client({
	cloud: {
		id: process.env.ELASTICSEARCH_CLOUD_ID,
	},
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY,
	},
});

const sourceIndex = 'search-ful-site-crawl';
const MAX_DOCS = 8000;

// --- Load slug list and expand paths ---
const slugListPath = path.resolve('scripts/data/area-slugs.json');
const slugs = JSON.parse(fs.readFileSync(slugListPath, 'utf-8'));
const targetPaths = slugs.flatMap((slug) => [
	`/find-a-grant/${slug}`,
	`/find-a-grant-places/${slug}`,
]);

// --- Logging setup ---
const timestamp = new Date()
	.toISOString()
	.replace(/[-:]/g, '')
	.replace(/\..+/, '');
const logDir = path.resolve('logs');
const logFile = path.join(logDir, `map-${timestamp}.log`);
fs.mkdirSync(logDir, { recursive: true });
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(msg) {
	const entry = `[${new Date().toISOString()}] ${msg}`;
	console.log(entry);
	logStream.write(entry + '\n');
}

function extractFunderLinksFromBodyContent(html) {
	const matches = Array.from(
		html.matchAll(/<a [^>]*href=\"([^\"]+)\"[^>]*>([A-Z0-9 .,&'\-]+)<\/a>/g)
	);
	return matches.map((m) => m[1]).filter((href) => href.startsWith('/'));
}

function getAreaFromUrlPath(urlPath) {
	const segments = urlPath.split('/').filter(Boolean);
	return segments.length > 1 ? segments[1] : null;
}

async function main() {
	log(`🔍 Querying up to ${MAX_DOCS} documents from "${sourceIndex}"...`);
	log(`🔎 Matching against ${targetPaths.length} known paths`);

	const reverseMap = {};
	let totalMatched = 0;

	for (let i = 0; i < targetPaths.length; i += 50) {
		const batch = targetPaths.slice(i, i + 50);

		const results = await client.search({
			index: sourceIndex,
			size: MAX_DOCS,
			query: {
				bool: {
					should: batch.map((p) => ({ term: { url_path: p } })),
					minimum_should_match: 1,
				},
			},
			_source: ['url_path', 'body_content'],
		});

		log(`📦 Batch returned ${results.hits.hits.length} documents`);
		totalMatched += results.hits.hits.length;

		for (const hit of results.hits.hits) {
			const urlPath = hit._source?.url_path;
			const body = hit._source?.body_content;

			if (!urlPath || !body) {
				log(`⚠️ ${urlPath || '[no path]'} — missing body_content`);
				continue;
			}

			const funderLinks = extractFunderLinksFromBodyContent(body);
			log(`🔗 ${urlPath} — found ${funderLinks.length} funder links`);

			if (funderLinks.length === 0) continue;

			const area = getAreaFromUrlPath(urlPath);
			if (!area) continue;

			funderLinks.forEach((link) => {
				if (!reverseMap[link]) reverseMap[link] = [];
				if (!reverseMap[link].includes(area)) reverseMap[link].push(area);
			});
		}
	}

	log(`📊 Total documents matched: ${totalMatched}`);

	const outputPath = path.resolve('logs/funder-area-map.json');
	fs.writeFileSync(outputPath, JSON.stringify(reverseMap, null, 2), 'utf-8');

	log(`📊 Total unique funder paths: ${Object.keys(reverseMap).length}`);
	log(`✅ Reverse map saved to ${outputPath}`);
	log(`📝 Log complete: ${logFile}`);
}

main().catch((err) => {
	log(`❌ Error: ${err.message}`);
	process.exit(1);
});
