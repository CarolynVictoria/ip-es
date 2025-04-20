// backend/scripts/build-funder-issueareas-map.js
// This script reads landing-pages-foundation-list.json,
// maps each funderUrl to its funderName and an array of associated Issue Areas,
// consolidates issue areas when the same funder appears on multiple pages,
// and saves the final result to funder-issuearea-map.json.

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// --- Setup __dirname correctly ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Load environment variables first ---
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// --- Logging setup ---
const timestamp = new Date()
	.toISOString()
	.replace(/[-:]/g, '')
	.replace(/\..+/, '');
const logDir = path.resolve('backend', 'logs');
fs.mkdirSync(logDir, { recursive: true });
const logPath = path.join(logDir, `build-funder-map-${timestamp}.log`);
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(message) {
	const full = `[${new Date().toISOString()}] ${message}`;
	console.log(full);
	logStream.write(full + '\n');
}

// --- URL Normalization helper ---
function normalizeFunderUrl(funderUrl) {
	if (!funderUrl) return funderUrl;

	try {
		const urlObj = new URL(funderUrl);

		// If already contains /find-a-grant/, do nothing
		if (urlObj.pathname.startsWith('/find-a-grant/')) {
			return urlObj.origin + urlObj.pathname.replace(/\/$/, ''); // also remove trailing slash
		}

		// Otherwise insert /find-a-grant/ at the beginning of the path
		let correctedPath =
			'/find-a-grant' +
			(urlObj.pathname.startsWith('/') ? '' : '/') +
			urlObj.pathname;

		// Normalize double slashes if any
		correctedPath = correctedPath.replace(/\/{2,}/g, '/');

		return `${urlObj.origin}${correctedPath.replace(/\/$/, '')}`; // no trailing slash
	} catch (err) {
		log(`❌ Error normalizing funder URL: ${funderUrl}`);
		return funderUrl; // fail safe
	}
}

// --- Build function ---
async function buildFunderIssueAreasMap() {
	log('🚀 Building funder ➔ issue areas map...');

	const inputPath = path.resolve(
		__dirname,
		'../data/landing-pages-foundation-list.json'
	);
	const outputPath = path.resolve(
		__dirname,
		'../data/funder-issuearea-map.json'
	);

	if (!fs.existsSync(inputPath)) {
		throw new Error(`Input file not found: ${inputPath}`);
	}

	const landingPages = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

	const funderMap = {};

	for (const page of landingPages) {
		const issueArea = page.issueArea?.trim();
		if (!issueArea) continue;

		for (const funder of page.funders) {
			const rawFunderUrl = funder.funderUrl?.trim();
			const funderName = funder.funderName?.trim();

			if (!rawFunderUrl || !funderName) continue;

			const normalizedFunderUrl = normalizeFunderUrl(rawFunderUrl);

			if (!funderMap[normalizedFunderUrl]) {
				funderMap[normalizedFunderUrl] = {
					funderName,
					issueAreas: [],
				};
			}

			// Avoid duplicates in issueAreas
			if (!funderMap[normalizedFunderUrl].issueAreas.includes(issueArea)) {
				funderMap[normalizedFunderUrl].issueAreas.push(issueArea);
			}
		}
	}

	fs.writeFileSync(outputPath, JSON.stringify(funderMap, null, 2));

	log(`✅ Funders mapped. Output saved to: ${outputPath}`);
	logStream.end();
}

// --- Execute ---
buildFunderIssueAreasMap().catch((err) => {
	log(`❌ Fatal error: ${err.message}`);
	logStream.end();
});
