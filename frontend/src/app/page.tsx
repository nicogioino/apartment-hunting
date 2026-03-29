'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const API = 'http://localhost:3001';

interface Listing {
  id: string;
  url: string;
  title: string;
  priceUsd: number | null;
  priceArs: number | null;
  priceChangeUsd: number | null;
  expensesDisplay: string;
  neighborhood: string;
  address: string;
  totalAreaM2: number | null;
  coveredAreaM2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  description: string;
  imageUrls: string[];
  features: string[];
  scoreValue: number | null;
  scoreLocation: number | null;
  scoreAesthetics: number | null;
  scoreOverall: number | null;
  rankingNotes: string | null;
  firstSeen: string;
  lastSeen: string;
  isActive: boolean;
}

type SortKey =
  | 'scoreOverall'
  | 'scoreValue'
  | 'scoreLocation'
  | 'scoreAesthetics'
  | 'priceUsd'
  | 'totalAreaM2';

function ScorePill({ label, score }: { label: string; score: number | null }) {
  if (score === null) return null;
  const n = Number(score);
  const variant = n >= 7 ? 'default' : n >= 5 ? 'secondary' : 'destructive';
  return (
    <Badge variant={variant} className="text-[11px] font-mono">
      {label} {n.toFixed(1)}
    </Badge>
  );
}

function PriceChange({
  priceUsd,
  priceChangeUsd,
}: {
  priceUsd: number | null;
  priceChangeUsd: number | null;
}) {
  if (!priceChangeUsd || Number(priceChangeUsd) === 0) return null;
  const change = Number(priceChangeUsd);
  const currentUsd = Number(priceUsd) || 0;
  const originalUsd = currentUsd - change;
  const pct = originalUsd > 0 ? (change / originalUsd) * 100 : 0;
  const down = change < 0;
  return (
    <span
      className={`text-xs font-medium ${down ? 'text-emerald-400' : 'text-red-400'}`}
    >
      {down ? '↓' : '↑'} ${Math.abs(change).toLocaleString()} ({pct > 0 ? '+' : ''}
      {pct.toFixed(1)}%)
    </span>
  );
}

function formatUsd(n: number) {
  return Number.isInteger(n) ? n.toLocaleString() : Math.round(n).toLocaleString();
}

interface PriceRecord {
  id: number;
  listingId: string;
  priceArs: number | null;
  priceUsd: number | null;
  blueRate: number | null;
  recordedAt: string;
}

function ListingDetail({ listing }: { listing: Listing }) {
  const [history, setHistory] = useState<PriceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    setLoadingHistory(true);
    fetch(`${API}/listings/${listing.id}/price-history`)
      .then((r) => r.json())
      .then((data) => {
        setHistory(data);
        setLoadingHistory(false);
      })
      .catch(() => setLoadingHistory(false));
  }, [listing.id]);

  // Build full timeline: history entries + current price
  const timeline = [
    ...history.map((h) => ({
      date: new Date(h.recordedAt),
      usd: Number(h.priceUsd) || null,
      ars: Number(h.priceArs) || null,
      rate: Number(h.blueRate) || null,
    })),
    {
      date: new Date(listing.lastSeen || listing.firstSeen),
      usd: Number(listing.priceUsd) || null,
      ars: Number(listing.priceArs) || null,
      rate: null as number | null,
    },
  ];

  return (
    <div
      className="border-t border-border px-4 py-4 space-y-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Two-column layout: info + price history */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
        {/* Left: description, features, images */}
        <div className="space-y-3">
          {listing.rankingNotes && (
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                AI Analysis
              </p>
              <p className="text-sm">{listing.rankingNotes}</p>
            </div>
          )}

          {listing.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {listing.description}
            </p>
          )}

          {listing.features?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {listing.features.map((f, i) => (
                <Badge key={i} variant="outline" className="text-[11px]">
                  {f}
                </Badge>
              ))}
            </div>
          )}

          {listing.imageUrls?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pt-1">
              {listing.imageUrls.slice(1, 8).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="h-28 rounded-md object-cover"
                />
              ))}
            </div>
          )}

          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-primary hover:underline"
          >
            View on ZonaProp →
          </a>
        </div>

        {/* Right: price history */}
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Price History
          </p>
          {loadingHistory ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : timeline.length <= 1 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                No price changes recorded yet.
              </p>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Current</span>
                <span className="font-medium tabular-nums">
                  {listing.priceUsd
                    ? `USD ${formatUsd(Number(listing.priceUsd))}`
                    : '—'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                First seen {new Date(listing.firstSeen).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {timeline.map((entry, i) => {
                const isLast = i === timeline.length - 1;
                const prev = i > 0 ? timeline[i - 1] : null;
                const diff =
                  prev && entry.usd && prev.usd
                    ? entry.usd - prev.usd
                    : null;

                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center w-3 self-stretch">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                          isLast
                            ? 'bg-primary'
                            : 'bg-muted-foreground/40'
                        }`}
                      />
                      {!isLast && (
                        <div className="w-px flex-1 bg-border mt-0.5" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 flex items-baseline justify-between gap-2 pb-2">
                      <span className="text-muted-foreground tabular-nums">
                        {entry.date.toLocaleDateString()}
                      </span>
                      <div className="text-right">
                        <span
                          className={`font-medium tabular-nums ${isLast ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          {entry.usd
                            ? `USD ${formatUsd(entry.usd)}`
                            : '—'}
                        </span>
                        {diff !== null && diff !== 0 && (
                          <span
                            className={`ml-1.5 ${diff < 0 ? 'text-emerald-400' : 'text-red-400'}`}
                          >
                            {diff < 0 ? '↓' : '↑'}
                            {Math.abs(diff).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('scoreOverall');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [filterNeighborhood, setFilterNeighborhood] = useState('');
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchListings = async () => {
    setLoading(true);
    const params = new URLSearchParams({ sortBy, order: sortOrder });
    if (filterNeighborhood) params.set('neighborhood', filterNeighborhood);
    const res = await fetch(`${API}/listings?${params}`);
    const data = await res.json();
    setListings(data);
    setLoading(false);
  };

  const fetchNeighborhoods = async () => {
    const res = await fetch(`${API}/listings/neighborhoods`);
    setNeighborhoods(await res.json());
  };

  useEffect(() => {
    fetchListings();
    fetchNeighborhoods();
  }, [sortBy, sortOrder, filterNeighborhood]);

  const runScrape = async () => {
    setScraping(true);
    await fetch(`${API}/scraper/run`, { method: 'POST' });
    setScraping(false);
    fetchListings();
    fetchNeighborhoods();
  };

  const runRank = async () => {
    setRanking(true);
    await fetch(`${API}/ranker/run`, { method: 'POST' });
    setRanking(false);
    fetchListings();
  };

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'scoreOverall', label: 'Overall Score' },
    { key: 'scoreValue', label: 'Value (m²/$)' },
    { key: 'scoreLocation', label: 'Location' },
    { key: 'scoreAesthetics', label: 'Aesthetics' },
    { key: 'priceUsd', label: 'Price' },
    { key: 'totalAreaM2', label: 'Size' },
  ];

  const selectClass =
    'h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer';

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Apartment Hunter
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {listings.length} listings from ZonaProp
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runScrape} disabled={scraping} variant="outline">
            {scraping ? 'Scraping…' : 'Scrape'}
          </Button>
          <Button onClick={runRank} disabled={ranking}>
            {ranking ? 'Ranking…' : 'Rank'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap items-end">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
            Sort by
          </label>
          <div className="flex">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className={selectClass + ' rounded-r-none border-r-0'}
            >
              {sortOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
              className="h-9 px-2.5 rounded-lg rounded-l-none border border-border bg-card text-sm text-muted-foreground hover:text-foreground transition-colors"
              title={sortOrder === 'DESC' ? 'Descending' : 'Ascending'}
            >
              {sortOrder === 'DESC' ? '↓' : '↑'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
            Neighborhood
          </label>
          <select
            value={filterNeighborhood}
            onChange={(e) => setFilterNeighborhood(e.target.value)}
            className={selectClass}
          >
            <option value="">All neighborhoods</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Listings */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground">
          Loading…
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No listings yet. Click &ldquo;Scrape&rdquo; to fetch apartments.
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l, idx) => (
            <Card
              key={l.id}
              className="overflow-hidden transition-colors hover:border-muted-foreground/25 cursor-pointer"
              onClick={() =>
                setExpanded(expanded === l.id ? null : l.id)
              }
            >
              <CardContent className="p-0">
                <div className="flex">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12 shrink-0 bg-muted/50 text-muted-foreground font-mono text-sm">
                    {idx + 1}
                  </div>

                  {/* Thumbnail */}
                  {l.imageUrls?.[0] && (
                    <div className="w-44 h-[120px] shrink-0 bg-muted">
                      <img
                        src={l.imageUrls[0]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-sm truncate leading-tight">
                          {l.title || l.address || 'Apartment'}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {l.neighborhood}
                          {l.address ? ` · ${l.address}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-base tabular-nums">
                          {l.priceUsd
                            ? `USD ${formatUsd(Number(l.priceUsd))}`
                            : l.priceArs
                              ? `$ ${Number(l.priceArs).toLocaleString()}`
                              : '—'}
                        </p>
                        <PriceChange
                          priceUsd={l.priceUsd}
                          priceChangeUsd={l.priceChangeUsd}
                        />
                        {l.expensesDisplay && (
                          <p className="text-[11px] text-muted-foreground">
                            {l.expensesDisplay}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground tabular-nums">
                      {l.totalAreaM2 && <span>{l.totalAreaM2} m² tot</span>}
                      {l.coveredAreaM2 && (
                        <span>{l.coveredAreaM2} m² cub</span>
                      )}
                      {l.rooms && <span>{l.rooms} amb</span>}
                      {l.bathrooms && <span>{l.bathrooms} baño(s)</span>}
                      {l.priceUsd && l.totalAreaM2 && (
                        <span className="text-primary font-medium">
                          USD{' '}
                          {Math.round(
                            Number(l.priceUsd) / Number(l.totalAreaM2),
                          )}
                          /m²
                        </span>
                      )}
                    </div>

                    {/* Scores */}
                    <div className="flex gap-1.5 mt-2">
                      <ScorePill label="Overall" score={l.scoreOverall} />
                      <ScorePill label="Value" score={l.scoreValue} />
                      <ScorePill label="Location" score={l.scoreLocation} />
                      <ScorePill
                        label="Aesthetics"
                        score={l.scoreAesthetics}
                      />
                    </div>
                  </div>
                </div>

                {expanded === l.id && <ListingDetail listing={l} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
