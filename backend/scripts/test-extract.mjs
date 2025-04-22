// File: backend/scripts/test-extract.mjs

import { JSDOM } from 'jsdom';
import fs from 'fs/promises';

// --- Load and parse sample HTML ---
async function loadSampleDocument() {
	const html = await fs.readFile('backend/data/sample-funder.html', 'utf-8');
	const dom = new JSDOM(html);
	return dom.window.document;
}

// --- Extraction logic ---
function extractSection(document, headingText) {
	const elements = [...document.querySelectorAll('body *')];

	for (const el of elements) {
		const text = el.textContent.trim();

		if (text.toUpperCase().startsWith(headingText.toUpperCase())) {
			const content = text
				.replace(new RegExp(`^${headingText}:?\s*`, 'i'), '')
				.trim();

			let collectedContent = content.length > 0 ? content : '';

			let next = el.nextElementSibling;
			while (next && !isAnotherHeading(next)) {
				collectedContent += '\n' + next.textContent.trim();
				next = next.nextElementSibling;
			}

			return collectedContent.trim();
		}
	}

	return '';
}

function isAnotherHeading(el) {
	if (!el) return false;
	const text = el.textContent.trim();
	const headings = ['OVERVIEW', 'IP TAKE', 'PROFILE'];
	return headings.some((h) => text.toUpperCase().startsWith(h));
}

// --- Main Test Runner ---
async function main() {
	const document = await loadSampleDocument();

	const overview = extractSection(document, 'OVERVIEW');
	const ipTake = extractSection(document, 'IP TAKE');
	const profile = extractSection(document, 'PROFILE');

	console.log('--- Extracted Sections ---');
	console.log('\nOVERVIEW:\n', overview);
	console.log('\nIP TAKE:\n', ipTake);
	console.log('\nPROFILE:\n', profile);
}

main().catch((err) => {
	console.error('❌ Error:', err.message);
});
