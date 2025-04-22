// test-extractSections.js
// Temporary test version of extractSectionsFromBodyContent for isolated testing

// This is your actual current function
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

	const overviewMatch = normalizedText.match(
		/OVERVIEW[:\s]*(.*?)(?=\s*IP TAKE|\s*PROFILE|$)/s
	);
	const ipTakeMatch = normalizedText.match(
		/IP TAKE[:\s]*(.*?)(?=\s*PROFILE|$)/s
	);
	const profileMatch = normalizedText.match(/PROFILE[:\s]*(.*)/s);

	if (overviewMatch) sections.overview = overviewMatch[1].trim();
	if (ipTakeMatch) sections.ipTake = ipTakeMatch[1].trim();
	if (profileMatch) sections.profile = profileMatch[1].trim();

	// If none of the three sections were found, assign full body to profile
	if (!overviewMatch && !ipTakeMatch && !profileMatch) {
		sections.profile = normalizedText.trim();
	}

	return sections;
}

// --- TEST CASES ---

// 1) Proper sections
const goodBodyContent = `
OVERVIEW
This is the overview section.

IP TAKE
This is the IP Take section.

PROFILE
This is the profile section.
`;

// 2) No section headers, messy body
const messyBodyContent = `
Melinda French Gates is among the world's leading philanthropists. She co-founded the Gates Foundation...
(background info continues without any headings)
`;

console.log('--- Test Case 1: Proper sections ---');
console.log(extractSectionsFromBodyContent(goodBodyContent));

console.log('--- Test Case 2: Messy body content ---');
console.log(extractSectionsFromBodyContent(messyBodyContent));
