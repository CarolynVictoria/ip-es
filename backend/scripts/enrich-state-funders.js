// enrich-state-funders.js
import dotenv from 'dotenv';
import { Client } from '@elastic/elasticsearch';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const esClient = new Client({
	cloud: {
		id: process.env.ELASTICSEARCH_CLOUD_ID,
	},
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY,
	},
});

const crawlIndex = 'search-ful-site-crawl';
const funderIndex = 'funders';
const logFile = path.resolve(__dirname, 'enrich-log.jsonl');

const stateList = [
	'Alabama',
	'Alaska',
	'Arizona',
	'Arkansas',
	'California',
	'Colorado',
	'Connecticut',
	'Delaware',
	'Florida',
	'Georgia',
	//'Hawaii',
	'Idaho',
	'Illinois',
	'Indiana',
	'Iowa',
	'Kansas',
	'Kentucky',
	'Louisiana',
	'Maine',
	'Maryland',
	'Massachusetts',
	'Michigan',
	'Minnesota',
	'Mississippi',
	'Missouri',
	'Montana',
	'Nebraska',
	'Nevada',
	'New Hampshire',
	'New Jersey',
	'New Mexico',
	'New York',
	'North Carolina',
	'North Dakota',
	'Ohio',
	'Oklahoma',
	'Oregon',
	'Pennsylvania',
	'Rhode Island',
	'South Carolina',
	'South Dakota',
	'Tennessee',
	'Texas',
	'Utah',
	'Vermont',
	'Virginia and West Virginia',
	'Washington',
	'Washington, D.C.',
	'Wisconsin',
	'Wyoming',
];

const TARGETS = stateList.map((name) => ({
	slug: name
		.toLowerCase()
		.replace(/[^a-z]/g, '-')
		.replace(/--+/g, '-'),
	display: name,
}));

function normalizeFunderName(name) {
	return name
		.replace(/[^\w\s]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function appendLog(entry) {
	fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
}

async function enrichFunders() {
	for (const { slug, display } of TARGETS) {
		const basePaths =
			display === 'California'
				? [
						'find-a-grant-places/fundraising-bay-area-grants',
						'find-a-grant-places/fundraising-los-angeles-grants',
				  ]
				: display === 'Illinois'
				? ['fundraising-in-chicago']
				: display === 'Massachusetts'
				? ['grants-in-boston-fundraising']
				: display === 'Pennsylvania'
				? ['fundraising-in-philadelphia']
				: display === 'New York'
				? ['fundraising-in-new-york-city']
				: display === 'Virginia and West Virginia'
				? ['/virginia-grants']
				: display === 'Washington, D.C.'
				? ['washington-dc-grants']
				: [`find-a-grant-places/${slug}-grants`];

		for (const basePath of basePaths) {
			console.log(`\n=== Processing state: ${display} (${basePath}) ===`);

			const crawlHits = await esClient.search({
				index: crawlIndex,
				size: 1,
				query: {
					bool: {
						must: [{ wildcard: { additional_urls: `*${basePath}` } }],
						must_not: [{ wildcard: { additional_urls: `*${basePath}/*` } }],
					},
				},
				_source: ['headings'],
			});

			if (crawlHits.hits.total.valueOf() === 0) {
				console.log(
					`❌ No crawl doc found for landing page: *${basePath} (excluding deeper paths)*`
				);
				continue;
			} else {
				console.log(`✅ Found crawl doc for: ${basePath}`);
			}

			const headings = crawlHits.hits.hits[0]._source.headings || [];
			if (headings.length < 4) {
				console.log(
					`⚠️  Skipping: Insufficient headings for ${basePath} (found ${headings.length})`
				);
				continue;
			}

			const funderNames = headings.slice(3);
			console.log(`🔍 Checking ${funderNames.length} funder names...`);

			for (const name of funderNames) {
				const normalizedName = normalizeFunderName(name);
				let funderDoc = null;

				let response = await esClient.search({
					index: funderIndex,
					size: 1,
					query: {
						match_phrase: {
							funderName: {
								query: normalizedName,
							},
						},
					},
				});

				if (response.hits?.hits?.length === 0) {
					response = await esClient.search({
						index: funderIndex,
						size: 1,
						query: {
							match: {
								funderName: {
									query: normalizedName,
									fuzziness: 'AUTO',
								},
							},
						},
					});
				}

				if (
					!response.hits ||
					response.hits.total.valueOf() === 0 ||
					!response.hits.hits.length
				) {
					console.log(`   ❌ No match found in funders index for: ${name}`);
					appendLog({ state: display, funderName: name, status: 'not_found' });
					continue;
				}

				funderDoc = response.hits.hits[0];
				const funderId = funderDoc._id;
				const source = funderDoc._source;
				const statesRaw = source.geoLocation?.states || [];
				const flatStates = Array.from(
					new Set(
						[]
							.concat(...statesRaw)
							.map((s) => (typeof s === 'string' ? s.trim() : ''))
							.filter(Boolean)
					)
				);

				if (flatStates.includes(display)) {
					console.log(`   ⚠️  Skipped (already contains state): ${name}`);
					appendLog({
						state: display,
						funderName: name,
						status: 'skipped',
						id: funderId,
					});
					continue;
				}

				const updatedStates = [...flatStates, display];

				await esClient.update({
					index: funderIndex,
					id: funderId,
					doc: {
						geoLocation: {
							...source.geoLocation,
							states: updatedStates,
						},
					},
				});

				console.log(
					`   ✅ Updated: ${name} (state: ${display}, id: ${funderId})`
				);
				appendLog({
					state: display,
					funderName: name,
					status: 'updated',
					id: funderId,
				});
			}
		}
	}
}

enrichFunders().catch(console.error);
