// unified-data-crawl-funders.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { load } from 'cheerio';
import pino from 'pino';
import dotenv from 'dotenv';
import readline from 'readline';

// --- Setup __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load .env ---
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// --- Read and parse the unified filter map as array ---
const rawMapArr = JSON.parse(
	fs.readFileSync(
		path.join(__dirname, '../../src/data/unifiedFilterMap.json'),
		'utf-8'
	)
);

// Convert unifiedFilterMap array to object
const unifiedFilterMap = Object.fromEntries(
	rawMapArr.map((obj) => [obj.tag, obj])
);

// --- Logging ---
const logDir = path.resolve(__dirname, '../output');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logger = pino(pino.destination(path.join(logDir, 'crawl.log')));

// --- Config ---
const BASE_URL = 'https://www.insidephilanthropy.com';
const MAX_PROFILES = 10000; // for testing, set to Infinity for full crawl
const OUTPUT_PATH = path.join(logDir, 'funder-docs.jsonl');

// --- Utilities ---
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Fetch funder profile URLs ---
async function getFunderProfileUrls(limit = 10000) {
	const urls = [];
	let page = 1;

	while (true) {
		const tagUrl = `${BASE_URL}/tag/funder-profile/page/${page}/`;
		logger.info(`Crawling archive page ${page}`);
		console.log(`Crawling archive page ${page}`);

		try {
			const res = await axios.get(tagUrl, {
				headers: { 'User-Agent': 'InsidePhilanthropy-FunderCrawler/1.0' },
			});

			const $ = load(res.data);
			const posts = $('h2.entry-title a')
				.map((_, el) => $(el).attr('href'))
				.get();

			if (posts.length === 0) {
				console.log(`No posts found on page ${page}, stopping.`);
				break;
			}

			for (const url of posts) {
				if (!urls.includes(url)) urls.push(url);
				if (urls.length >= limit) break;
			}
		} catch (err) {
			if (err.response && err.response.status === 404) {
				console.log(`Reached last page at /page/${page}/`);
				break;
			} else {
				throw err;
			}
		}

		if (urls.length >= limit) break;
		page++;
		await delay(1000);
	}

	return urls;
}

// --- Extract tags from article ---
function extractTags($) {
	const articleClass = $('article').attr('class') || '';
	return articleClass
		.split(/\s+/)
		.filter((cls) => cls.startsWith('tag-'))
		.map((tag) => tag.replace('tag-', ''));
}

// Map tags to unified filter names (refactored)
const seenUnmappedTags = new Set();
function mapTagsToFilters(tags, filterMap) {
	const issueAreas = new Set();
	const places = new Set();

	for (const tag of tags) {
		if (filterMap[tag]) {
			const { filterType, filterName } = filterMap[tag];
			if (filterType === 'issueAreas') issueAreas.add(filterName);
			if (filterType === 'location') places.add(filterName);
		} else if (!seenUnmappedTags.has(tag)) {
			logger.warn(`Unmapped tag: ${tag}`);
			seenUnmappedTags.add(tag);
		}
	}
	return {
		issueAreas: Array.from(issueAreas),
		places: Array.from(places),
	};
}

// --- Extract content sections ---
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

// --- Generate JSON array after crawl ---
async function writeFinalJson() {
	const input = fs.createReadStream(OUTPUT_PATH);
	const rl = readline.createInterface({ input, crlfDelay: Infinity });
	const allDocs = [];

	for await (const line of rl) {
		try {
			allDocs.push(JSON.parse(line));
		} catch (err) {
			logger.error(`Invalid JSONL line: ${line}`);
		}
	}

	const finalPath = path.join(logDir, 'funder-docs.json');
	fs.writeFileSync(finalPath, JSON.stringify(allDocs, null, 2));
	logger.info(`Wrote final JSON array to ${finalPath}`);
	console.log(`Wrote JSON array to ${finalPath}`);
}

// --- Main crawl function ---
async function crawlFunders() {
	const funderUrls = await getFunderProfileUrls(MAX_PROFILES);
	logger.info(`Discovered ${funderUrls.length} funder profiles.`);
	console.log(`Discovered ${funderUrls.length} funder profiles to crawl...`);

	const stream = fs.createWriteStream(OUTPUT_PATH, { flags: 'w' });

	for (let i = 0; i < funderUrls.length; i++) {
		const url = funderUrls[i];

		try {
			logger.info(`Fetching funder profile: ${url}`);
			console.log(`Fetching ${i + 1} of ${funderUrls.length}: ${url}`);

			const res = await axios.get(url, {
				headers: { 'User-Agent': 'InsidePhilanthropy-FunderCrawler/1.0' },
			});

			const $ = load(res.data);
			const title = $('h1.entry-title').text().trim();
			const tags = extractTags($);
			const filterData = mapTagsToFilters(tags, unifiedFilterMap);
			const bodyText = $('article .entry-content')
				.text()
				.replace(/\r\n?/g, '\n')
				.trim();

			const sections = extractSectionsFromBodyContent(bodyText);

			const entry = {
				title,
				url,
				tags,
				overview: sections.overview,
				ipTake: sections.ipTake,
				profile: sections.profile,
				issueAreas: filterData.issueAreas,
				places: filterData.places,
			};

			stream.write(JSON.stringify(entry) + '\n');
		} catch (err) {
			const message = `Error fetching ${url}: ${err.message}`;
			console.error(message);
			logger.error(message);
			continue; // skip and continue instead of exiting
		}

		await delay(1000);
	}

	stream.end();
	logger.info(`Saved profiles to ${OUTPUT_PATH}`);
	console.log(`Saved all profiles to ${OUTPUT_PATH}`);

	await writeFinalJson();
}

crawlFunders().catch((err) => {
	console.error('Fatal error:', err);
	logger.error(err);
	process.exit(1);
});
