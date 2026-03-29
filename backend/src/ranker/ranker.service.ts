import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ListingsService } from '../listings/listings.service';
import { Listing } from '../listings/listing.entity';

interface ListingScore {
  id: string;
  scoreValue: number;
  scoreLocation: number;
  scoreAesthetics: number;
  scoreOverall: number;
  notes: string;
}

@Injectable()
export class RankerService {
  private readonly logger = new Logger(RankerService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly listingsService: ListingsService,
  ) {}

  async rankAll() {
    const unranked = await this.listingsService.getUnranked();
    this.logger.log(`Found ${unranked.length} unranked listings`);

    if (unranked.length === 0) return { ranked: 0 };

    const batchSize = 10;
    let ranked = 0;

    for (let i = 0; i < unranked.length; i += batchSize) {
      const batch = unranked.slice(i, i + batchSize);
      this.logger.log(
        `Ranking batch ${Math.floor(i / batchSize) + 1} (${batch.length} listings)`,
      );

      try {
        const scores = await this.rankBatch(batch);

        for (const score of scores) {
          await this.listingsService.updateScores(score.id, {
            scoreValue: score.scoreValue,
            scoreLocation: score.scoreLocation,
            scoreAesthetics: score.scoreAesthetics,
            scoreOverall: score.scoreOverall,
            rankingNotes: score.notes,
          });
          ranked++;
        }
      } catch (error) {
        this.logger.warn(
          `Batch ${Math.floor(i / batchSize) + 1} failed, skipping: ${error.message}`,
        );
      }
    }

    this.logger.log(`Ranked ${ranked} listings`);
    return { ranked };
  }

  private async rankBatch(listings: Listing[]): Promise<ListingScore[]> {
    const listingSummaries = listings.map((l) => ({
      id: l.id,
      price_usd: l.priceUsd,
      price_ars: l.priceArs,
      expenses: l.expensesDisplay,
      neighborhood: l.neighborhood,
      address: l.address,
      total_m2: l.totalAreaM2,
      covered_m2: l.coveredAreaM2,
      rooms: l.rooms,
      bathrooms: l.bathrooms,
      title: l.title,
      description: l.description?.slice(0, 500),
      features: l.features,
    }));

    const prompt = `You are an apartment hunting assistant evaluating rental listings in Buenos Aires, Argentina.

Score each listing on three criteria (1-10 scale):

1. **Value (m²/price)**: How good is the space-to-price ratio? A larger apartment for less money scores higher. Consider both total and covered area. Prices may be in USD or ARS (Argentine Pesos). Use ~1,200 ARS/USD as approximate exchange rate. Average 2-ambientes in CABA rent for ~$800-1500 USD.

2. **Location**: Rate the neighborhood quality for living in Buenos Aires. Top neighborhoods: Palermo, Belgrano, Recoleta, Nuñez, Colegiales. Good: Caballito, Villa Urquiza, Almagro, Villa Crespo. Average: Flores, Boedo, San Telmo. Consider safety, amenities, transport access.

3. **Aesthetics**: Based on the description, features, and any available info, rate how nice the apartment likely is. Consider: modern finishes, natural light, balcony, good floor, amenities (pool, gym, laundry), building quality.

**Overall score** = weighted average: Value 40%, Location 30%, Aesthetics 30%.

Return ONLY a JSON array, no markdown fences, no explanation outside the JSON:
[{"id": "...", "scoreValue": N, "scoreLocation": N, "scoreAesthetics": N, "scoreOverall": N, "notes": "Brief 1-2 sentence summary of pros/cons"}]

Here are the listings to evaluate:

${JSON.stringify(listingSummaries, null, 2)}`;

    const apiKey = this.config.get('OPENROUTER_API_KEY');
    const model = this.config.get(
      'OPENROUTER_MODEL',
      'meta-llama/llama-3.3-70b-instruct:free',
    );

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';

    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in response');

      let parsed: any[];
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // Try to fix common JSON issues: missing braces, trailing commas
        const fixed = jsonMatch[0]
          .replace(/,\s*]/g, ']')
          .replace(/,\s*}/g, '}');
        parsed = JSON.parse(fixed);
      }

      const scores: ListingScore[] = parsed
        .filter((s: any) => s && s.id)
        .map((s: any) => ({
          id: String(s.id),
          scoreValue: Math.min(10, Math.max(1, Number(s.scoreValue) || 5)),
          scoreLocation: Math.min(10, Math.max(1, Number(s.scoreLocation) || 5)),
          scoreAesthetics: Math.min(10, Math.max(1, Number(s.scoreAesthetics) || 5)),
          scoreOverall: Math.min(10, Math.max(1, Number(s.scoreOverall) || 5)),
          notes: s.notes || '',
        }));

      return scores;
    } catch (error) {
      this.logger.error(`Failed to parse ranking response: ${text}`);
      throw error;
    }
  }
}
