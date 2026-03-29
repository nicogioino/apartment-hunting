# Apartment Hunter

## Workflow

- All changes go through PRs on feature branches - never commit directly to `main`
- PRs get auto-reviewed by CodeRabbit
- Branch naming: `feat/`, `fix/`, `chore/` prefixes

## Architecture

- **Backend**: NestJS + TypeORM + PostgreSQL (`backend/`)
- **Frontend**: Next.js + Tailwind CSS v4 + shadcn/ui (`frontend/`)
- **Scraping**: Playwright (local only, not deployed)
- **AI Ranking**: OpenRouter API (local only, not deployed)
- **Database**: PostgreSQL (local via Docker, production via Neon)

## Deployment

- **Frontend**: Vercel (free tier) - reads `NEXT_PUBLIC_API_URL` env var
- **Backend**: Railway - backend-only Docker image, no Playwright
- **Database**: Neon (free tier) with `DB_SSL=true`
- Scraping and ranking are LOCAL ONLY - guarded by `NODE_ENV=production` returning 403
- The Dockerfile only builds the backend (no frontend, no Playwright)

## Key Conventions

- Prices under 10,000 are always treated as USD regardless of ZonaProp label
- ARS prices are converted to USD using blue dollar rate from dolarapi.com
- New listings (< 24h) get a green "New" badge in the UI
- After scraping, new listings are auto-sent to ranking
- Ranking only processes unranked listings (never re-ranks existing)
- Frontend API base URL is `''` (empty string = same origin) in production, `http://localhost:3001` for local dev

## Local Development

```bash
# Start PostgreSQL
docker compose up -d

# Backend (port 3001)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev

# Scrape + auto-rank
curl -X POST http://localhost:3001/scraper/run
```

## Environment Variables

Backend `.env` goes in `backend/.env` (gitignored). See `.env.example` for template.

## Do NOT

- Add co-author credits for Claude in commits
- Commit `.env` files or API keys
- Deploy Playwright or ranking to production (Railway)
- Re-rank already ranked listings
