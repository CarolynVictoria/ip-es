// backend/scripts/crawl-location-funders.js
// This script extracts funder profile URLs from pages under /find-a-grant-places/*grants*/
// and builds a map of funder URL path to US state and profile content, including funderName.

import fs from 'fs';
import path from 'path';
import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({
	cloud: {
		id: process.env.ELASTICSEARCH_CLOUD_ID,
	},
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY,
	},
});

const outputFilePath = path.resolve(
	__dirname,
	'../data/funder-location-details-raw.json'
);
const indexName = 'search-ful-site-crawl';
const limit = 9500;

function extractStateFromUrlPath(urlPath) {
	const match = urlPath.match(
		/^\/find-a-grant-places\/([^\/]*grants)(?:\/[^\/]+)+$/
	);
	if (!match) return null;
	const stateGrantsSlug = match[1];
	const base = stateGrantsSlug.replace(/-grants$/, '');
	if (base.startsWith('california-')) return 'California';
	if (stateGrantsSlug === 'washington-dc-grants') return 'Washington DC';
	return base
		.replace(/-/g, ' ')
		.split(' ')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

function extractSectionsFromBodyContent(bodyContent) {
	const sections = { overview: '', ipTake: '', profile: '' };
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

async function crawlLocationFunders() {
	const funderDetails = [];

	const response = await client.search({
		index: indexName,
		size: limit,
		query: {
			wildcard: {
				url_path: {
					value: '/find-a-grant-places/*grants*/*',
				},
			},
		},
		_source: ['url_path', 'body_content', 'title'],
	});

	for (const hit of response.hits.hits) {
		const { url_path: urlPath, body_content: bodyContent, title } = hit._source;
		if (!urlPath) continue;

		const stateName = extractStateFromUrlPath(urlPath);
		if (!stateName) continue;

		const sections = extractSectionsFromBodyContent(bodyContent);

		funderDetails.push({
			funderUrl: urlPath.replace(/^\//, ''),
			funderName: title?.replace(/ \| Inside Philanthropy$/, '') || '',
			state: [stateName],
			overview: sections.overview,
			ipTake: sections.ipTake,
			profile: sections.profile,
			crawledAt: new Date().toISOString(),
		});
	}

	fs.writeFileSync(
		outputFilePath,
		JSON.stringify(funderDetails, null, 2),
		'utf8'
	);
	console.log(
		`✔ Done. ${funderDetails.length} funders written to ${outputFilePath}`
	);
}

crawlLocationFunders();
