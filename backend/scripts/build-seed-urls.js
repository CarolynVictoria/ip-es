// backend/scripts/build-seed-urls.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Corrected paths
const inputPath = path.resolve(
	__dirname,
	'../data/landing-pages.foundation-list.cleaned.json'
);
const outputPath = path.resolve(__dirname, '../data/seed-urls.json');

// Load the cleaned foundation list
const landingPagesData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// Build the seed URL list
const seedUrls = [];

landingPagesData.forEach((page) => {
	page.funders.forEach((funder) => {
		if (funder.funderUrl && funder.funderUrl.startsWith('http')) {
			seedUrls.push(funder.funderUrl);
		}
	});
});

// Save the seed URLs
fs.writeFileSync(outputPath, JSON.stringify(seedUrls, null, 2));

console.log(`✅ Seed URLs written to ${outputPath}`);
