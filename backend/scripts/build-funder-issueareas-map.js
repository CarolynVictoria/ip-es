// backend/scripts/build-funder-issueareas-map.js

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
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
const logPath = path.join(logDir, `build-funder-map-${timestamp}.log`);
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(message) {
	const full = `[${new Date().toISOString()}] ${message}`;
	console.log(full);
	logStream.write(full + '\n');
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
		const issueArea = page.issueArea;

		for (const funder of page.funders) {
			const funderUrl = funder.funderUrl;
			const funderName = funder.funderName;

			if (!funderUrl || !funderName) continue;

			if (!funderMap[funderUrl]) {
				funderMap[funderUrl] = {
					funderName,
					issueAreas: [],
				};
			}

			if (!funderMap[funderUrl].issueAreas.includes(issueArea)) {
				funderMap[funderUrl].issueAreas.push(issueArea);
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
