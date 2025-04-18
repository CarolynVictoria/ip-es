// backend/scripts/build-funder-issue-map.js
// This script builds a map of funders to issue areas based on the content of landing pages.
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Client } from '@elastic/elasticsearch';
import { JSDOM } from 'jsdom';
import { issueAreaMap } from '../data/issueAreaMap.js';

dotenv.config({ path: '../.env' });

// --- Client Setup ---
const client = new Client({
	cloud: {
		id: process.env.ELASTICSEARCH_CLOUD_ID,
	},
	auth: {
		apiKey: process.env.ELASTICSEARCH_API_KEY,
	},
});

// --- Logging Setup ---
const timestamp = new Date()
	.toISOString()
	.replace(/[-:]/g, '')
	.replace(/\..+/, '');
const logDir = path.resolve('logs');
const logPath = path.join(logDir, `build-map-${timestamp}.log`);
fs.mkdirSync(logDir, { recursive: true });
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(message) {
	const full = `[${new Date().toISOString()}] ${message}`;
	console.log(full);
	logStream.write(full + '\n');
}

// --- Output Map ---
const funderIssueMap = {}; // { '/funder-path': ['Dance', 'Climate'] }

// --- Helper Functions ---
function normalizePath(url) {
	try {
		const u = new URL(url.startsWith('http') ? url : `https://dummy.com${url}`);
		return u.pathname.replace(/^\/+|\/+$/g, '');
	} catch {
		return url.replace(/^\/+|\/+$/g, '');
	}
}

// --- Main Logic ---
async function buildFunderIssueMap() {
	const landingPagePaths = Object.keys(issueAreaMap);

	log(`🔍 Found ${landingPagePaths.length} Issue Area landing pages to scan.`);

	for (const path of landingPagePaths) {
		try {
			const result = await client.search({
				index: process.env.ELASTICSEARCH_INDEX,
				size: 1,
				query: {
					match: { url_path: `/${path}` },
				},
			});

			if (result.hits.total.value === 0) {
				log(`⚠️ No document found for: /${path}`);
				continue;
			}

			const doc = result.hits.hits[0]._source;
			const html = doc.html_content || doc.body_content || '';

			const dom = new JSDOM(html);
			const foundationList =
				dom.window.document.querySelector('.foundation-list');

			if (!foundationList) {
				log(`⚠️ No .foundation-list found for: /${path}`);
				continue;
			}

			const links = foundationList.querySelectorAll('h3 a');

			links.forEach((a) => {
				const funderPath = normalizePath(a.getAttribute('href'));
				const issueArea = issueAreaMap[path];

				if (!funderIssueMap[funderPath]) {
					funderIssueMap[funderPath] = [];
				}
				if (!funderIssueMap[funderPath].includes(issueArea)) {
					funderIssueMap[funderPath].push(issueArea);
				}
			});

			log(`✅ Processed ${links.length} funders on /${path}`);
		} catch (err) {
			log(`❌ Error processing /${path}: ${err.message}`);
		}
	}

	// Write output
	const outputPath = path.resolve(
		'backend/scripts/data/funder-issue-areas.json'
	);
	fs.writeFileSync(outputPath, JSON.stringify(funderIssueMap, null, 2));
	log(
		`✅ Funder-Issue Area map written to /backend/scripts/data/funder-issue-areas.json`
	);
	logStream.end();
}

buildFunderIssueMap().catch((err) => {
	log(`❌ Script failed: ${err.message}`);
	logStream.end();
});
