// backend/scripts/crawl-landing-pages-foundation-list.js

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
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
const logPath = path.join(logDir, `crawl-landing-foundations-${timestamp}.log`);
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

// --- Crawl function ---
async function crawlLandingPages() {
	log('🚀 Starting landing page crawl (foundation list only)...');

	const foundationResults = [];

	for (const relativePath in issueAreaMap) {
		const issueArea = issueAreaMap[relativePath];
		const url = `https://www.staging24.insidephilanthropy.com/${relativePath}`;

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

			const foundationList = document.querySelector('.foundation-list');

			if (!foundationList) {
				log(`⚠️ No .foundation-list found on ${url}`);
				continue;
			}

			const funders = [...foundationList.querySelectorAll('h3 a')]
				.map((a) => ({
					funderName: a.textContent.trim(),
					funderUrl: a.href,
				}))
				.filter((f) => f.funderName && f.funderUrl);

			foundationResults.push({
				issueArea,
				pageUrl: url,
				funders,
			});
		} catch (err) {
			log(`❌ Error processing ${url}: ${err.message}`);
		}
	}

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
