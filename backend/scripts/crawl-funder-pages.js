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
import { JSDOM, VirtualConsole } from 'jsdom';

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

// --- Helper to make URL absolute ---
function makeAbsoluteUrl(funderUrl) {
	const trimmed = funderUrl.trim();
	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		return trimmed; // already absolute
	}
	if (trimmed.startsWith('/')) {
		return `https://www.staging24.insidephilanthropy.com${trimmed}`;
	}
	log(`⚠️ Unexpected funderUrl format: "${funderUrl}"`);
	return null;
}

// --- Crawl function ---
// --- Crawl function ---
async function crawlFunderPages() {
	log('🚀 Starting funder pages crawl...');

	const results = [];
	const totalFunders = Object.keys(funderMap).length; // Get the total number of funders

	let currentIndex = 0; // Variable to track the current funder being crawled

	for (const funderUrl in funderMap) {
		const issueAreas = funderMap[funderUrl];

		// --- SKIP unwanted URLs before processing ---
		// ONLY process URLs under /find-a-grant/ and exclude /find-a-grant-places/
		// ALSO exclude specific unwanted landing pages
		if (
			funderUrl.includes('/find-a-grant-places/') ||
			funderUrl.includes('/find-a-grant/major-donors') ||
			funderUrl.includes('/find-a-grant/jewish-funders') ||
			funderUrl.includes('/find-a-grant/tech-philanthropists') ||
			funderUrl.includes('/find-a-grant/glitzy')
		) {
			log(`⚠️ Skipping funder path: ${funderUrl}`);
			continue;
		}

		// Make the URL absolute only after validation
		const url = makeAbsoluteUrl(funderUrl);

		if (!url) {
			log(`⚠️ Skipping invalid URL: ${funderUrl}`);
			continue;
		}

		currentIndex++; // Increment for each funder

		// Print the progress for each funder fetched
		log(`🌐 Fetching (${currentIndex} / ${totalFunders}): ${url}`);

		try {
			const response = await fetch(url);

			if (!response.ok) {
				log(
					`❌ Failed to fetch ${url}: ${response.status} ${response.statusText}`
				);
				continue;
			}

			const html = await response.text();
			const virtualConsole = new VirtualConsole();
			virtualConsole.sendTo(console, { omitJSDOMErrors: true });

			const dom = new JSDOM(html, { virtualConsole });
			const document = dom.window.document;

			// Extract sections
			let overview = extractSection(document, 'OVERVIEW');
			let ipTake = extractSection(document, 'IP TAKE');
			let profile = extractSection(document, 'PROFILE');

			// If all sections are missing, put everything into 'PROFILE'
			if (!overview && !ipTake && !profile) {
				const fullContent = document.body.textContent.trim();
				results.push({
					funderUrl,
					issueAreas,
					overview: '', // Blank because it’s not found
					ipTake: '', // Blank because it’s not found
					profile: fullContent, // Entire content goes here
					crawledAt: new Date().toISOString(),
				});
			} else {
				// Otherwise, save the regular sections as normal
				results.push({
					funderUrl,
					issueAreas,
					overview,
					ipTake,
					profile,
					crawledAt: new Date().toISOString(),
				});
			}
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
	const elements = [...document.querySelectorAll('body *')];

	for (const el of elements) {
		// Clean the text content
		const text = el.textContent.trim();

		// Check if the element's text matches the heading we are looking for
		if (text.toUpperCase().startsWith(headingText.toUpperCase())) {
			// Extract the content immediately after the heading
			// Remove the headingText label (e.g. "OVERVIEW: ", "IP TAKE:", etc.)
			const content = text
				.replace(new RegExp(`^${headingText}:?\\s*`, 'i'), '') // Remove "OVERVIEW:", "IP TAKE:", etc.
				.trim();

			let collectedContent = content.length > 0 ? content : '';

			// Case 2: the content is in the next sibling elements
			let next = el.nextElementSibling;
			while (next && !isAnotherHeading(next)) {
				// Append the content of each following element
				collectedContent += next.textContent.trim() + '\n';
				next = next.nextElementSibling;
			}

			return collectedContent.trim();
		}
	}

	return ''; // Return empty string if no section found
}

// Helper to detect if an element is another heading marker
function isAnotherHeading(el) {
	if (!el) return false;
	const text = el.textContent.trim();
	const headings = ['OVERVIEW', 'IP TAKE', 'PROFILE'];
	return headings.some((h) => text.toUpperCase().startsWith(h));
}

// --- Execute ---
crawlFunderPages().catch((err) => {
	log(`❌ Fatal error: ${err.message}`);
	logStream.end();
});
