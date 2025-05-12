// File: /backend/scripts/tag-funders-by-landing-page.js

import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

// replicate __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the repo root .env
dotenv.config({
	path: path.resolve(__dirname, '..', '..', '.env'),
});

// Fail fast if WP credentials are missing
if (!process.env.WP_API_USER || !process.env.WP_API_PASSWORD) {
	throw new Error('Missing WP_API_USER or WP_API_PASSWORD in .env');
}

// Base URL for the WP REST API
const WP_API_BASE =
	process.env.WP_API_BASE || 'https://www.insidephilanthropy.com/wp-json/wp/v2';
if (!WP_API_BASE.includes('insidephilanthropy.com')) {
	throw new Error(
		'WP_API_BASE does not point to production — aborting for safety.'
	);
}

// Ensure data directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Input CSV path
const CSV_PATH = path.join(
	DATA_DIR,
	'grantfinder-issues-landing-pages-assigned-to-tags-data-rerun.csv'
);

// Create Keep-Alive HTTP agents
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// Axios instance for WP with Basic Auth and agents
const wp = axios.create({
	baseURL: WP_API_BASE,
	auth: {
		username: process.env.WP_API_USER,
		password: process.env.WP_API_PASSWORD,
	},
	timeout: 20000,
	httpAgent,
	httpsAgent,
});

// -----------------------------------------------------------------------------
// Utility functions
// -----------------------------------------------------------------------------

async function extractFunderLinks(landingPageUrl) {
	try {
		const { data } = await axios.get(landingPageUrl);
		const $ = cheerio.load(data);
		const links = [];

		const SITE_ORIGIN = new URL(WP_API_BASE).origin;
		$('.foundation-list-link h3.wp-block-heading a').each((_, el) => {
			const href = $(el).attr('href');
			console.log('SITE_ORIGIN:', SITE_ORIGIN, '→ raw href:', href);
			if (href && href.startsWith(`${SITE_ORIGIN}/`)) {
				const cleanHref = href.split('#')[0];
				console.log(`Found funder link: ${cleanHref}`);
				links.push(cleanHref);
			}
		});

		return [...new Set(links)];
	} catch (err) {
		console.error(`Failed to fetch or parse ${landingPageUrl}:`, err.message);
		return [];
	}
}

async function getPostIdByUrl(url) {
	// Follow redirects
	let finalUrl = url;
	try {
		const resp = await axios.get(url, { maxRedirects: 5 });
		finalUrl =
			resp.request.res?.responseUrl ||
			resp.request._redirectable?._currentUrl ||
			url;
	} catch (err) {
		console.warn(`Could not resolve URL ${url}:`, err.message);
	}

	const slug = finalUrl
		.replace(/^https?:\/\/[^^]+\//, '')
		.replace(/\/$/, '')
		.split('/')
		.pop();

	try {
		const res = await wp.get(`/posts?slug=${encodeURIComponent(slug)}`);
		if (Array.isArray(res.data) && res.data.length > 0) {
			return res.data[0].id;
		}
	} catch (err) {
		console.warn(`Failed to resolve post for slug ${slug}:`, err.message);
	}
	return null;
}

async function getTagIdBySlug(slug) {
	try {
		const res = await wp.get(`/tags?slug=${encodeURIComponent(slug)}`);
		if (Array.isArray(res.data) && res.data.length > 0) {
			return res.data[0].id;
		}
	} catch (err) {
		console.warn(`Failed to get tag ID for ${slug}:`, err.message);
	}
	return null;
}

async function addTagToPost(postId, tagId) {
	console.log(`Attempting to tag post ID ${postId} with tag ID ${tagId}`);
	let post;
	try {
		const resp = await wp.get(`/posts/${postId}`);
		post = resp.data;
		const postTitle = post.title?.rendered || '';
		const tags = new Set(post.tags || []);

		if (tags.has(tagId)) {
			console.log(`Post ID ${postId} already has tag ID ${tagId}`);
			return { updated: false, title: postTitle, reason: 'already-tagged' };
		}

		tags.add(tagId);
		await wp.put(`/posts/${postId}`, { tags: Array.from(tags) });
		console.log(`Successfully tagged post ID ${postId} with tag ID ${tagId}`);
		return { updated: true, title: postTitle, reason: null };
	} catch (err) {
		console.error(
			`Failed to update post ID ${postId} with tag ID ${tagId}:`,
			err.message
		);
		return {
			updated: false,
			title: post?.title?.rendered || '',
			reason: err.message,
		};
	}
}

function loadLandingPages(csvPath) {
	const content = fs.readFileSync(csvPath, 'utf-8');
	return parse(content, {
		columns: ['url', 'tag'],
		skip_empty_lines: true,
		trim: true,
	});
}

function logSuccess(filePath, postTitle, postId, tagName, tagId) {
	const line = `"${postTitle.replace(
		/"/g,
		'""'
	)}",${postId},${tagName},${tagId}\n`;
	fs.appendFileSync(filePath, line);
}

function logFailure(filePath, postTitle, identifier, reason, tagName, tagId) {
	const line = `"${postTitle.replace(
		/"/g,
		'""'
	)}",${identifier},${reason},${tagName},${tagId}\n`;
	fs.appendFileSync(filePath, line);
}

// -----------------------------------------------------------------------------
// Main Script
// -----------------------------------------------------------------------------

(async () => {
	// Load all landing pages in sorted order and process them all
	const landingPages = loadLandingPages(CSV_PATH).sort((a, b) =>
		a.url.localeCompare(b.url)
	);

	for (const { url, tag } of landingPages) {
		const tagId = await getTagIdBySlug(tag);

		// prepare per-tag log files
		const linksLogPath = path.join(DATA_DIR, `found-links-${tag}.txt`);
		const successLogPath = path.join(DATA_DIR, `tagging-success-${tag}.csv`);
		const failureLogPath = path.join(DATA_DIR, `tagging-failure-${tag}.csv`);

		if (!fs.existsSync(linksLogPath)) {
			fs.writeFileSync(linksLogPath, 'found_link\n');
		}
		if (!fs.existsSync(successLogPath)) {
			fs.writeFileSync(successLogPath, 'post_title,post_id,tag_name,tag_id\n');
		}
		if (!fs.existsSync(failureLogPath)) {
			fs.writeFileSync(
				failureLogPath,
				'post_title,identifier,reason,tag_name,tag_id\n'
			);
		}

		if (!tagId) {
			console.warn(`Skipping ${url}: tag '${tag}' not found.`);
			logFailure(failureLogPath, '', url, 'tag-not-found', tag, '');
			continue;
		}

		console.log(`Processing landing page: ${url} → tag: ${tag}`);
		const funderUrls = await extractFunderLinks(url);

		for (const funderUrl of funderUrls) {
			fs.appendFileSync(linksLogPath, `${funderUrl}\n`);

			const postId = await getPostIdByUrl(funderUrl);
			if (!postId) {
				logFailure(failureLogPath, '', funderUrl, 'post-not-found', tag, tagId);
				continue;
			}

			const { updated, title, reason } = await addTagToPost(postId, tagId);
			if (updated) {
				logSuccess(successLogPath, title, postId, tag, tagId);
			} else {
				logFailure(
					failureLogPath,
					title,
					postId,
					reason || 'already-tagged-or-update-failed',
					tag,
					tagId
				);
			}
		}
	}
})();
