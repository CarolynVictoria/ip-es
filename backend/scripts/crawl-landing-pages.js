// backend/scripts/crawl-landing-pages.js
/**
 * Purpose:
 * - Crawls all Issue Area landing pages from Inside Philanthropy (staging environment).
 * - Extracts the list of funders (funder name and funder URL) appearing on each page.
 * - Follows redirects for each funder link.
 * - Associates each funder with its corresponding Issue Area.
 * - Consolidates funders landing at the same final URL.
 * - Outputs a clean JSON file for further processing.
 *
 * Output:
 * - backend/data/landing-pages-foundation-list.json
 *
 * Notes:
 * - Crawling respects HTTP redirects and validates final pages.
 * - No URL fabrication. Only live final URLs are saved.
 * - Fetching is batched for speed (controlled concurrency).
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { JSDOM, VirtualConsole } from 'jsdom';
import dotenv from 'dotenv';

// --- Setup __dirname correctly ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Load environment variables first ---
dotenv.config({ path: '../.env' });

// --- Logging setup ---
const timestamp = new Date()
	.toISOString()
	.replace(/[-:]/g, '')
	.replace(/\..+/, '');
const logDir = path.resolve('backend', 'logs');
fs.mkdirSync(logDir, { recursive: true });
const logPath = path.join(logDir, `crawl-landing-pages-${timestamp}.log`);
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(message) {
	const full = `[${new Date().toISOString()}] ${message}`;
	console.log(full);
	logStream.write(full + '\n');
}

// --- Load Issue Area Map ---
const issueAreaMap = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, 'data', 'issueAreaMap.json'), 'utf-8')
);

// --- Helper to make URL absolute ---
function makeAbsoluteUrl(funderUrl) {
	const trimmed = funderUrl.trim();
	if (trimmed.startsWith('http://')) {
		return trimmed.replace('http://', 'https://');
	}
	if (trimmed.startsWith('https://')) {
		return trimmed;
	}
	if (trimmed.startsWith('/')) {
		return `https://www.staging24.insidephilanthropy.com${trimmed}`;
	}
	log(`⚠️ Unexpected funderUrl format: "${funderUrl}"`);
	return null;
}

// --- Crawl function ---
async function crawlLandingPages() {
	log('🚀 Starting landing page crawl (foundation list only)...');

	const funderMap = {}; // Map: final resolved URL -> { funderName, issueAreas }

	for (const relativePath in issueAreaMap) {
		const issueArea = issueAreaMap[relativePath];
		const landingPageUrl = `https://www.staging24.insidephilanthropy.com/${relativePath}`;

		log(`🌐 Fetching landing page: ${landingPageUrl}`);

		try {
			const response = await fetch(landingPageUrl);
			if (!response.ok) {
				log(
					`❌ Failed to fetch ${landingPageUrl}: ${response.status} ${response.statusText}`
				);
				continue;
			}

			const html = await response.text();

			const virtualConsole = new VirtualConsole();
			virtualConsole.on('error', (error) => {
				// Suppress "Could not parse CSS stylesheet" errors
				if (
					error &&
					error.message &&
					error.message.includes('Could not parse CSS stylesheet')
				) {
					return;
				}
				console.error(error);
			});

			const dom = new JSDOM(html, { virtualConsole });

			const document = dom.window.document;
			const foundationList = document.querySelector('.foundation-list');

			if (!foundationList) {
				log(`⚠️ No .foundation-list found on ${landingPageUrl}`);
				continue;
			}

			const funderElements = [...foundationList.querySelectorAll('h3 a')];

			// --- Batch fetch funder URLs ---
			const batchSize = 10;
			for (let i = 0; i < funderElements.length; i += batchSize) {
				const batch = funderElements.slice(i, i + batchSize);

				const batchPromises = batch.map(async (a) => {
					const funderName = a.textContent.trim();
					const rawHref = a.getAttribute('href');

					if (!funderName || !rawHref) return;

					// Skip unwanted paths
					if (
						rawHref.includes('/find-a-grant-places/') ||
						rawHref.includes('/find-a-grant/major-donors') ||
						rawHref.includes('/find-a-grant/jewish-funders') ||
						rawHref.includes('/find-a-grant/tech-philanthropists') ||
						rawHref.includes('/find-a-grant/glitzy-giving-donors')
					) {
						return;
					}

					const absoluteUrl = makeAbsoluteUrl(rawHref);
					if (!absoluteUrl) return;

					try {
						const funderResponse = await fetch(absoluteUrl, {
							redirect: 'follow',
						});

						if (!funderResponse.ok) {
							log(
								`❌ Funder URL fetch failed: ${absoluteUrl} => ${funderResponse.status} ${funderResponse.statusText}`
							);
							return;
						}

						let finalPath = funderResponse.url.replace(
							'https://www.staging24.insidephilanthropy.com',
							''
						);
						if (!finalPath.startsWith('/')) {
							finalPath = '/' + finalPath;
						}

						// Merge funders landing at the same final URL
						if (!funderMap[finalPath]) {
							funderMap[finalPath] = {
								funderName: funderName,
								funderUrl: finalPath,
								issueAreas: [issueArea],
							};
						} else {
							if (!funderMap[finalPath].issueAreas.includes(issueArea)) {
								funderMap[finalPath].issueAreas.push(issueArea);
							}
						}
					} catch (err) {
						log(`❌ Error fetching funder URL ${absoluteUrl}: ${err.message}`);
					}
				});

				await Promise.allSettled(batchPromises); // Wait for this batch before moving to next
			}
			// --- End batch fetching funders ---
		} catch (err) {
			log(`❌ Error processing landing page ${landingPageUrl}: ${err.message}`);
		}
	}

	// Convert funderMap to array for output
	const foundationResults = Object.values(funderMap);

	// Ensure /backend/data folder exists
	fs.mkdirSync(path.resolve(__dirname, '../data'), { recursive: true });

	const outputPath = path.resolve(
		__dirname,
		'../data/landing-pages-foundation-list.json'
	);

	fs.writeFileSync(outputPath, JSON.stringify(foundationResults, null, 2));

	log(`✅ Crawl complete. Foundation list saved to: ${outputPath}`);
	logStream.end();
}

// --- Execute ---
crawlLandingPages().catch((err) => {
	log(`❌ Fatal error: ${err.message}`);
	logStream.end();
});
