import express from 'express';
import {
	runSearchQuery,
	runSemanticSearchQuery,
} from '../services/searchService.js';

const router = express.Router();

// Keyword search
router.post('/', async (req, res) => {
	const { query = '', filters = {} } = req.body;

	console.log('Received filters:', filters);

	if (
		typeof query !== 'string' ||
		(query.trim().length === 0 &&
			!filters.issueAreas?.length &&
			!filters.locations?.length)
	) {
		return res.status(400).json({ error: 'Query or filters required' });
	}

	try {
		const results = await runSearchQuery(query, filters);
		res.json(results);
	} catch (error) {
		console.error('Search error:', error);
		res.status(500).json({ error: 'Error performing search' });
	}
});

// Semantic search
router.post('/semantic', async (req, res) => {
	const { query = '', filters = {} } = req.body;

	console.log('Received filters:', filters);

	try {
		const results = await runSemanticSearchQuery(query, filters);
		res.json(results);
	} catch (error) {
		console.error('Semantic search error:', error);
		res.status(500).json({ error: 'Error performing semantic search' });
	}
});

export default router;
