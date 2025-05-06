// backend/scripts/crawl-location-pages.js
// This script reads funder-location-map.json,
// fetches full body content for each funder profile page from search-ful-site-crawl,
// extracts Overview, IP Take, and Profile sections,
// and saves structured funder details to funder-location-details-raw.json.

import fs from 'fs';
import path from 'path';
import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const cloudId = process.env.ELASTICSEARCH_CLOUD_ID;
const apiKey = process.env.ELASTICSEARCH_API_KEY;

if (!cloudId || !apiKey) {
	console.error(
		'Missing ELASTICSEARCH_CLOUD_ID or ELASTICSEARCH_API_KEY in .env'
	);
	process.exit(1);
}

const client = new Client({
	cloud: { id: cloudId },
	auth: { apiKey },
});

const funderMapPath = path.resolve(
	__dirname,
	'../data/funder-location-map.json'
);
const outputPath = path.resolve(
	__dirname,
	'../data/funder-location-details-raw.json'
);

const funderMap = JSON.parse(fs.readFileSync(funderMapPath, 'utf8'));

function extractSectionsFromBodyContent(bodyContent) {
	const sections = {
		overview: '',
		ipTake: '',
		profile: '',
	};

	if (!bodyContent) return sections;

	const normalizedText = bodyContent
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n');

	if (!normalizedText.includes('OVERVIEW')) {
		sections.profile = normalizedText.trim();
		return sections;
	}

	const overviewMatch = normalizedText.match(
		/OVERVIEW[:\s]*(.*?)(?=\s*(?:IP TAKE|PROFILE)|$)/s
	);
	const ipTakeMatch = normalizedText.match(
		/IP TAKE[:\s]*(.*?)(?=\s*(?:PROFILE)|$)/s
	);
	const profileMatch = normalizedText.match(/PROFILE[:\s]*(.*)/s);

	if (overviewMatch) sections.overview = overviewMatch[1].trim();
	if (ipTakeMatch) sections.ipTake = ipTakeMatch[1].trim();
	if (profileMatch) sections.profile = profileMatch[1].trim();

	return sections;
}

async function crawlLocationFunderPages() {
	const funderDetails = [];
	let processed = 0;

	const total = Object.entries(funderMap).length;
	console.log(`🔍 Starting crawl for ${total} funder URLs...`);

	for (const [funderUrl, locationArray] of Object.entries(funderMap)) {
		const fullUrl = `https://www.staging24.insidephilanthropy.com/${funderUrl}`;
		processed++;

		try {
			const response = await client.search({
				index: 'search-ful-site-crawl',
				size: 1,
				query: {
					term: {
						url: fullUrl,
					},
				},
			});

			if (response.hits.hits.length > 0) {
				const source = response.hits.hits[0]._source;
				const bodyContent = source.body_content || '';
				const sections = extractSectionsFromBodyContent(bodyContent);

				funderDetails.push({
					funderUrl,
					locations: locationArray,
					overview: sections.overview,
					ipTake: sections.ipTake,
					profile: sections.profile,
					crawledAt: new Date().toISOString(),
				});

				console.log(`✅ Found: ${funderUrl} (${processed}/${total})`);
			} else {
				console.warn(`⚠️  Not found: ${funderUrl} (${processed}/${total})`);
			}
		} catch (error) {
			console.error(`❌ Error fetching ${funderUrl}:`, error.message);
		}
	}

	fs.writeFileSync(outputPath, JSON.stringify(funderDetails, null, 2), 'utf8');
	console.log(
		`🎯 Done. ${funderDetails.length} funders written to ${outputPath}`
	);
}

crawlLocationFunderPages();
