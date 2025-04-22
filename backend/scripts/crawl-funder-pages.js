// backend/scripts/crawl-funder-pages.js
// This script reads funder-issuearea-map.json,
// fetches full body content for each funder profile page from search-ful-site-crawl,
// extracts Overview, IP Take, and Profile sections,
// and saves structured funder details to funder-details-raw.json.

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
	'../data/funder-issuearea-map.json'
);
const outputPath = path.resolve(__dirname, '../data/funder-details-raw.json');

const funderMap = JSON.parse(fs.readFileSync(funderMapPath, 'utf8'));

// updated to strictly match only OVERVIEW, IP TAKE, and PROFILE section names (upper or capitalized)
// updated to fallback to profile if OVERVIEW not found (must be all uppercase)
// updated to remove colons and spaces at the beginning of the content
// updated to remove new lines and carriage returns
// updated to adjust regex for profile default section
// updated: stricter matching of section headers, fallback if "OVERVIEW" missing
function extractSectionsFromBodyContent(bodyContent) {
	const sections = {
		overview: '',
		ipTake: '',
		profile: '',
	};

	if (!bodyContent) return sections;

	// Normalize line endings
	const normalizedText = bodyContent
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n');

	// Step 1: Strictly check if "OVERVIEW" exists (case sensitive)
	if (!normalizedText.includes('OVERVIEW')) {
		// If "OVERVIEW" not found, assign entire content to profile
		sections.profile = normalizedText.trim();
		return sections;
	}

	// Step 2: Extract sections based on strict labels
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

export { extractSectionsFromBodyContent };

async function crawlFunderPages() {
	const funderDetails = [];

	for (const [funderUrl, funderData] of Object.entries(funderMap)) {
		// Skip bad URLs
		if (
			funderUrl.includes('/find-a-grant-places/') ||
			funderUrl.includes('google.com/url?')
		) {
			continue;
		}
		//cvm added 04-21-2025
		const fullFunderUrl = `https://www.staging24.insidephilanthropy.com${funderUrl}`;

		try {
			//cvm added 04-21-2025
			const response = await client.search({
				index: 'search-ful-site-crawl',
				size: 1,
				query: {
					term: {
						url: fullFunderUrl,
					},
				},
			});

			if (response.hits.hits.length > 0) {
				const source = response.hits.hits[0]._source;
				const bodyContent = source.body_content || '';
				const sections = extractSectionsFromBodyContent(bodyContent);

				funderDetails.push({
					funderUrl,
					issueAreas: {
						funderName: funderData.funderName,
						issueAreas: funderData.issueAreas || [],
					},
					overview: sections.overview,
					ipTake: sections.ipTake,
					profile: sections.profile,
					crawledAt: new Date().toISOString(),
				});
			} else {
				console.warn(`No crawled page found for ${funderUrl}`);
			}
		} catch (error) {
			console.error(`Error fetching content for ${funderUrl}:`, error.message);
		}
	}

	fs.writeFileSync(outputPath, JSON.stringify(funderDetails, null, 2));
	console.log(`Crawl complete. Pages saved to: ${outputPath}`);
}

crawlFunderPages();
