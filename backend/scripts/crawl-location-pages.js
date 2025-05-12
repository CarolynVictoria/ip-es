// enrich-state-funders.js XXX MUST REPLACE FROM GITHUB!!!
import dotenv from 'dotenv';
import { Client } from '@elastic/elasticsearch';
import path from 'path';
import { fileURLToPath } from 'url';

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

const TARGETS = [
	{ slug: 'alabama', display: 'Alabama' },
	{ slug: 'alaska', display: 'Alaska' },
];

async function enrichFunders() {
	for (const { slug, display } of TARGETS) {
		const basePath = `find-a-grant-places/${slug}-grants`;
		console.log(`\n=== Processing state: ${display} (${basePath}) ===`);

		const crawlHits = await esClient.search({
			index: crawlIndex,
			size: 1,
			query: {
				bool: {
					must: [
						{
							wildcard: {
								additional_urls: `*${basePath}`,
							},
						},
					],
					must_not: [
						{
							wildcard: {
								additional_urls: `*${basePath}/*`,
							},
						},
					],
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
			const { hits } = await esClient.search({
				index: funderIndex,
				size: 1,
				query: {
					term: { 'funderName.keyword': name },
				},
			});

			if (hits.total.valueOf() === 0) {
				console.log(`   ❌ No match found in funders index for: ${name}`);
				continue;
			}

			const funderDoc = hits.hits[0];
			const funderId = funderDoc._id;
			const source = funderDoc._source;
			const states = source.geoLocation?.states || [];

			if (states.includes(display)) {
				console.log(`   ⚠️  Skipped (already contains state): ${name}`);
				continue;
			}

			const updatedStates = [...states, display];

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
		}
	}
}

enrichFunders().catch(console.error);
