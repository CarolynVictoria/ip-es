// backend/scripts/build-funder-issueareas-map.js
// This script reads landing-pages.foundation-list.cleaned.json,
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
		// Ignore google redirect URLs or bad formats
		if (funderUrl.includes('google.com') || funderUrl.includes('http')) {
			return null;
		}

		// Must start with /find-a-grant/
		if (funderUrl.startsWith('/find-a-grant/')) {
			return funderUrl.replace(/\/$/, ''); // remove trailing slash
		}

		return null; // otherwise invalid
	} catch (err) {
		log(`Error normalizing funder URL: ${funderUrl}`);
		return null;
	}
}

// --- Build function ---
async function buildFunderIssueAreasMap() {
	log('Building funder ➔ issue areas map...');

	const inputPath = path.resolve(
		__dirname,
		'../data/landing-pages.foundation-list.cleaned.json'
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

	for (const funder of landingPages) {
		const funderName = funder.funderName?.trim();
		const rawFunderUrl = funder.funderUrl?.trim();
		const issueAreas = funder.issueAreas || [];

		if (!funderName || !rawFunderUrl || issueAreas.length === 0) continue;

		const normalizedFunderUrl = normalizeFunderUrl(rawFunderUrl);

		if (!normalizedFunderUrl) {
			log(`Skipping invalid funder URL: ${rawFunderUrl}`);
			continue;
		}

		if (!funderMap[normalizedFunderUrl]) {
			funderMap[normalizedFunderUrl] = {
				funderName,
				issueAreas: [],
			};
		}

		// Avoid duplicates in issueAreas
		for (const area of issueAreas) {
			if (!funderMap[normalizedFunderUrl].issueAreas.includes(area)) {
				funderMap[normalizedFunderUrl].issueAreas.push(area);
			}
		}
	}

	// --- Check for empty funderMap ---
	if (Object.keys(funderMap).length === 0) {
		log('Fatal error: No funders were mapped. Aborting.');
		process.exit(1);
	}

	fs.writeFileSync(outputPath, JSON.stringify(funderMap, null, 2));

	log(`Funders mapped. Output saved to: ${outputPath}`);
	logStream.end();
}

// --- Execute ---
buildFunderIssueAreasMap().catch((err) => {
	log(`Fatal error: ${err.message}`);
	logStream.end();
});
