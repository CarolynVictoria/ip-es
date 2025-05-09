// backend/src/routes/nonprofitData.js

import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/:query', async (req, res) => {
	try {
		let { query } = req.params;
		let ein = null;

		// If query is an EIN (all digits, 9 chars), use it directly
		if (/^\d{9}$/.test(query)) {
			ein = query;
		} else {
			// Relaxed query: allow partial matches in funder names
			const searchUrl = `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(
				query
			)}`;
			const searchResp = await axios.get(searchUrl);
			const results = searchResp.data.organizations;

			// Relaxed match: Find the first matching org name, not just an exact one
			if (!results || results.length === 0) {
				return res.status(404).json({ error: 'Organization not found' });
			}

			ein =
				results.find((org) =>
					org.name.toLowerCase().includes(query.toLowerCase())
				)?.ein || results[0].ein; // Use first match or fallback to the first result
		}

		// Now get 990 data
		const orgUrl = `https://projects.propublica.org/nonprofits/api/v2/organizations/${ein}.json`;
		const orgResp = await axios.get(orgUrl);
		const org = orgResp.data.organization;

		if (!org) {
			return res.status(404).json({ error: 'Organization 990 not found' });
		}

		res.json({
			orgName: org.name,
			ein: ein,
			city: org.city || null,
			state: org.state || null,
			subsectionCode: org.subsection_code || null,
			nteeClassification: org.ntee_classification || null,
			rulingDate: org.ruling_date || null,
			totalAssets: org.assets || null,
			totalGiving: org.contributions || null,
			filingYear: org.tax_period || null,
		});
	} catch (error) {
		console.error(
			'Error fetching 990 data:',
			error.response?.status,
			error.message
		);
		res.status(500).json({ error: 'Failed to fetch nonprofit data' });
	}
});

export default router;
