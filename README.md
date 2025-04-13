# ip-es

A prototype Elasticsearch-powered search interface for Inside Philanthropy.

This project uses:
- **React + Vite** for the frontend
- **Node.js + Express** for the backend
- **Elastic Cloud** (Standard level) for indexing and querying funder profiles

## 🔍 Features

- Search-as-you-type with relevance boosting
- Custom filters for funder discovery
- Transforms and indexes crawled funder profile pages
- Logging and enrichment logic in Node.js

## 📁 Project Structure

├── README.md
├── backend
│   ├── logs
│   │   └── transform-20250413T134255.log
│   ├── routes
│   │   └── search.js
│   ├── scripts
│   │   └── transform-and-index-funder.js
│   ├── server.js
│   └── services
│       └── searchService.js
├── index.html
├── package-lock.json
├── package.json
├── pages
├── postcss.config.js
├── public
├── src
│   ├── App.jsx
│   ├── clientApi.js
│   ├── components
│   ├── index.css
│   ├── main.jsx
│   └── styles
├── tailwind.config.js
└── vite.config.js

# ─────────────────────────
# Backend Configuration
# ─────────────────────────
PORT=5505
ELASTICSEARCH_HOST=https://your-cluster-id.us-central1.gcp.cloud.es.io
ELASTICSEARCH_INDEX=search-ful-site-crawl
ELASTICSEARCH_API_KEY=your-api-key-here

# ─────────────────────────
# Frontend (Vite) Configuration
# ─────────────────────────
VITE_SEARCH_API_URL=/api/search

📄 License
MIT © 2025 CarolynVictoria