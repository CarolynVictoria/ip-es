import express from 'express';
import { runSearchQuery } from '../services/searchService.js';
const router = express.Router();

router.post('/', async (req, res) => {
	const { query, filters } = req.body;
	const results = await runSearchQuery(query, filters);
	res.json(results);
});

export default router;
