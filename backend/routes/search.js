import express from 'express';
import { runSearchQuery } from '../services/searchService.js';

const router = express.Router();

router.post('/', async (req, res) => {
	const { query, filters } = req.body;

	if (!query) {
		return res.status(400).json({ error: 'Query is required' });
	}

	try {
		const results = await runSearchQuery(query, filters);
		res.json(results);
	} catch (error) {
		console.error('Search error:', error);
		res.status(500).json({ error: 'Error performing search' });
	}
});

export default router;
