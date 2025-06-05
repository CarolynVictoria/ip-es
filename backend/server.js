import express from 'express';
import cors from 'cors';
import searchRouter from './routes/search.js';
import nonprofitDataRoutes from './routes/nonprofitData.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('[DEBUG] CLOUD ID:', process.env.ELASTICSEARCH_CLOUD_ID);

const app = express();
const PORT = process.env.PORT;
if (!PORT) {
	throw new Error('Missing PORT in .env file');
}

app.use(cors());
app.use(express.json());

app.use('/api/search', searchRouter);

app.use('/api/nonprofit-data', nonprofitDataRoutes);

// Serve static files from the Vite build
app.use(express.static(path.join(__dirname, '../dist')));

// For any other route, send back index.html (for React Router)
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
	console.log(`Backend server running on port ${PORT}`);
});
