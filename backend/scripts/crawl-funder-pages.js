// backend/scripts/crawl-funder-pages.js
// This script reads funder URLs from funder-issuearea-map.json,
// crawls each live funder page on the staging site,
// extracts the OVERVIEW, IP TAKE, and PROFILE sections,
// and saves the structured results to funder-details-raw.json for later processing.

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

// Setup __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '../.env' });

// --- Logging setup ---
const timestamp = new Date()
	.toISOString()
	.replace(/[-:]/g, '')
	.replace(/\..+/, '');
const logDir = path.resolve('backend', 'logs');
const logPath = path.join(logDir, `crawl-funders-${timestamp}.log`);
fs.mkdirSync(logDir, { recursive: true });
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(message) {
	const full = `[${new Date().toISOString()}] ${message}`;
	console.log(full);
	logStream.write(full + '\n');
}

// --- Load the funder-to-issue-area association map ---
const funderMap = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, '../data/funder-issuearea-map.json'),
		'utf-8'
	)
);

// --- Crawl function ---
async function crawlFunderPages() {
	log('🚀 Starting funder pages crawl...');

	const results = [];

	for (const funderUrl in funderMap) {
		const issueAreas = funderMap[funderUrl];
		const url = `https://www.staging24.insidephilanthropy.com${funderUrl}`;

		log(`🌐 Fetching: ${url}`);

		try {
			const response = await fetch(url);

			if (!response.ok) {
				log(
					`❌ Failed to fetch ${url}: ${response.status} ${response.statusText}`
				);
				continue;
			}

			const html = await response.text();
			const dom = new JSDOM(html);
			const document = dom.window.document;

			const overview = extractSection(document, 'OVERVIEW');
			const ipTake = extractSection(document, 'IP TAKE');
			const profile = extractSection(document, 'PROFILE');

			results.push({
				funderUrl,
				issueAreas,
				overview,
				ipTake,
				profile,
				crawledAt: new Date().toISOString(),
			});
		} catch (err) {
			log(`❌ Error fetching ${url}: ${err.message}`);
		}
	}

	// Save results
	const outputPath = path.resolve(__dirname, '../data/funder-details-raw.json');
	fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

	log(`✅ Crawl complete. Pages saved to: ${outputPath}`);
	logStream.end();
}

// --- Helper function ---
function extractSection(document, headingText) {
	const headings = [...document.querySelectorAll('h2, h3, h4')];
	for (const heading of headings) {
		if (
			heading.textContent
				.trim()
				.toUpperCase()
				.startsWith(headingText.toUpperCase())
		) {
			let content = '';
			let next = heading.nextElementSibling;
			while (next && !['H2', 'H3', 'H4'].includes(next.tagName)) {
				content += next.textContent.trim() + '\n';
				next = next.nextElementSibling;
			}
			return content.trim();
		}
	}
	return null;
}

// --- Execute ---
crawlFunderPages().catch((err) => {
	log(`❌ Fatal error: ${err.message}`);
	logStream.end();
});
