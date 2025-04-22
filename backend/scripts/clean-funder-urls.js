// File: backend/scripts/clean-funder-urls.js
// This script reads landing-pages.foundation-list.json, cleans funder URLs
// (resolving Google redirect links to their final URLs), and writes the result
// to landing-pages.foundation-list.cleaned.json for downstream processing.

import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const inputPath = path.resolve(
	'backend',
	'data',
	'landing-pages-foundation-list.json'
);
const outputPath = path.resolve(
	'backend',
	'data',
	'landing-pages.foundation-list.cleaned.json'
);

function cleanFunderUrl(url) {
	if (!url) return url;
	try {
		const parsed = new URL(url, 'https://www.staging24.insidephilanthropy.com'); // Support relative URLs too
		if (parsed.hostname === 'www.google.com' && parsed.pathname === '/url') {
			const trueUrl = parsed.searchParams.get('q');
			if (trueUrl) return trueUrl;
		}
		return parsed.pathname + parsed.search; // Always keep relative format
	} catch (err) {
		console.error(`Invalid URL skipped: ${url}`);
		return url;
	}
}

function cleanLandingPages() {
	if (!fs.existsSync(inputPath)) {
		console.error(`Input file not found: ${inputPath}`);
		process.exit(1);
	}

	const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

	// --- Update: We now map funders directly (flat list, not pages with funders)
	const cleanedData = data.map((funder) => ({
		...funder,
		funderUrl: cleanFunderUrl(funder.funderUrl),
	}));

	fs.writeFileSync(outputPath, JSON.stringify(cleanedData, null, 2), 'utf8');
	console.log(`✅ Cleaned file written to: ${outputPath}`);
}

cleanLandingPages();
