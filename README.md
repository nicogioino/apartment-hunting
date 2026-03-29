# Apartment Hunter

Scrapes apartment listings from [ZonaProp](https://www.zonaprop.com.ar), ranks them using AI, and displays results in a searchable dark-themed UI.

## Features

- **Scraper**: Playwright-based scraper that navigates ZonaProp search results, extracting price, location, size, description, and images
- **AI Ranking**: Scores each listing on value (m²/$), location quality, and aesthetics using OpenRouter (free models)
- **Currency Conversion**: Auto-converts ARS prices to USD using the blue dollar rate from [dolarapi.com](https://dolarapi.com)
- **Price Tracking**: Records price changes over time with a visual timeline per listing
- **UI**: Dark-themed Next.js frontend with sorting, filtering by neighborhood, and expandable listing cards

## Tech Stack

- **Backend**: NestJS + TypeORM + PostgreSQL
- **Frontend**: Next.js + Tailwind CSS + shadcn/ui
- **Scraping**: Playwright (Chromium)
- **AI**: OpenRouter API (configurable model)
- **Infrastructure**: Docker (PostgreSQL)

## Setup

```bash
# 1. Copy env and add your OpenRouter API key
cp .env.example .env

# 2. Start PostgreSQL
docker compose up -d

# 3. Install dependencies
cd backend && npm install && npx playwright install chromium
cd ../frontend && npm install

# 4. Start backend (port 3001)
cd backend && npm run dev

# 5. Start frontend (port 3000)
cd frontend && npm run dev
```

## Usage

1. Open http://localhost:3000
2. Click **Scrape** to fetch listings from ZonaProp (~700 listings, takes ~5 min)
3. Click **Rank** to score listings with AI (requires OpenRouter API key)
4. Sort by score, price, size, or location. Filter by neighborhood.
5. Click a listing to expand details, images, and price history.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/listings` | List all active listings (supports `sortBy`, `order`, `neighborhood`, `minScore` query params) |
| GET | `/listings/neighborhoods` | List all neighborhoods |
| GET | `/listings/:id` | Get single listing |
| GET | `/listings/:id/price-history` | Get price change history |
| POST | `/scraper/run` | Trigger a scrape |
| POST | `/scraper/convert-prices` | Re-convert ARS prices with latest dollar rate |
| POST | `/ranker/run` | Rank all unranked listings |

## Configuration

Edit `.env` to customize:

- `SEARCH_URL` — ZonaProp search URL to scrape (change filters here)
- `OPENROUTER_MODEL` — AI model for ranking (default: `meta-llama/llama-3.3-70b-instruct:free`)
- Free model alternatives: `google/gemma-3-27b-it:free`, `deepseek/deepseek-chat-v3-0324:free`, `qwen/qwen3-235b-a22b:free`
