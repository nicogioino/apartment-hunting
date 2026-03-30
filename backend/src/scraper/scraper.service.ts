import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { chromium, type Page } from 'playwright';
import { ListingsService } from '../listings/listings.service';
import { RankerService } from '../ranker/ranker.service';
import { DollarService } from './dollar.service';
import { ScrapeRun } from './scrape-run.entity';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly listingsService: ListingsService,
    private readonly rankerService: RankerService,
    private readonly dollarService: DollarService,
    @InjectRepository(ScrapeRun)
    private readonly scrapeRunRepo: Repository<ScrapeRun>,
  ) {}

  async scrape() {
    const run = await this.scrapeRunRepo.save({
      status: 'running',
      listingsFound: 0,
      newListings: 0,
    });

    const baseUrl = this.config.get(
      'SEARCH_URL',
      'https://www.zonaprop.com.ar/departamentos-alquiler-capital-federal-2-ambientes-hasta-10-anos-menos-2000-dolar.html',
    );

    this.logger.log(`Starting scrape: ${baseUrl}`);

    try {
      const allListings: any[] = [];
      const seenIds = new Set<string>();
      let emptyStreak = 0;

      for (let pageNum = 1; ; pageNum++) {
        const url =
          pageNum === 1
            ? baseUrl
            : baseUrl.replace('.html', `-pagina-${pageNum}.html`);

        this.logger.log(`Scraping page ${pageNum}...`);

        const listings = await this.scrapeSinglePage(url);

        let newOnPage = 0;
        for (const l of listings) {
          if (!seenIds.has(l.id)) {
            seenIds.add(l.id);
            allListings.push(l);
            newOnPage++;
          }
        }

        this.logger.log(
          `Page ${pageNum}: ${listings.length} found, ${newOnPage} new unique`,
        );

        if (listings.length === 0 || newOnPage === 0) {
          emptyStreak++;
          if (emptyStreak >= 3) {
            this.logger.log('3 pages with no new listings, stopping.');
            break;
          }
          continue;
        }

        emptyStreak = 0;

        // Delay between pages
        const delay = 4000 + Math.random() * 4000;
        await new Promise((r) => setTimeout(r, delay));
      }

      // Fetch fresh blue dollar rate
      const blueRate = await this.dollarService.getBlueRate();

      // Fix mislabeled currencies: anything under 10,000 is USD
      for (const raw of allListings) {
        if (raw.priceArs && !raw.priceUsd && raw.priceArs < 10000) {
          raw.priceUsd = raw.priceArs;
          raw.priceArs = null;
        }
      }

      // Convert remaining ARS prices to USD
      for (const raw of allListings) {
        if (raw.priceArs && !raw.priceUsd) {
          raw.priceUsd = this.dollarService.arsToUsd(raw.priceArs, blueRate);
        }
      }

      // Upsert all listings (detects price changes)
      let newCount = 0;
      const activeIds: string[] = [];
      for (const raw of allListings) {
        const { isNew } = await this.listingsService.upsert(raw, blueRate);
        if (isNew) newCount++;
        activeIds.push(raw.id);
      }

      if (activeIds.length > 0) {
        await this.listingsService.markInactive(activeIds);
      }

      // Re-convert ALL existing ARS listings with fresh rate
      const reconverted = await this.listingsService.reconvertAllArs(
        blueRate,
        this.dollarService.arsToUsd,
      );
      if (reconverted > 0) {
        this.logger.log(
          `Re-converted ${reconverted} ARS listings at rate ${blueRate}`,
        );
      }

      await this.scrapeRunRepo.update(run.id, {
        completedAt: new Date(),
        listingsFound: allListings.length,
        newListings: newCount,
        status: 'completed',
      });

      this.logger.log(
        `Scrape complete: ${allListings.length} unique listings, ${newCount} new`,
      );

      // Auto-rank new listings in background
      if (newCount > 0) {
        this.logger.log(`Auto-ranking ${newCount} new listings...`);
        this.rankerService.rankAll().then((result) => {
          this.logger.log(`Auto-ranking done: ${result.ranked} ranked`);
        }).catch((err) => {
          this.logger.warn(`Auto-ranking failed: ${err.message}`);
        });
      }

      return { total: allListings.length, new: newCount };
    } catch (error) {
      await this.scrapeRunRepo.update(run.id, {
        completedAt: new Date(),
        status: `error: ${error.message}`,
      });
      throw error;
    }
  }

  private async scrapeSinglePage(url: string): Promise<any[]> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: 'es-AR',
      viewport: { width: 1440, height: 900 },
    });

    try {
      const page = await context.newPage();
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page
        .waitForSelector('[data-qa="posting PROPERTY"]', { timeout: 15000 })
        .catch(() => {});
      await page.waitForTimeout(1000);

      return await this.extractListings(page);
    } finally {
      await browser.close();
    }
  }

  private async extractListings(page: Page): Promise<any[]> {
    return page.evaluate(() => {
      const listings: any[] = [];
      const cards = document.querySelectorAll('[data-qa="posting PROPERTY"]');

      cards.forEach((card: Element) => {
        try {
          const id = card.getAttribute('data-id') || '';
          if (!id) return;

          const linkEl = card.querySelector('a[href*="/propiedades/"]');
          const href = linkEl?.getAttribute('href') || '';
          const url = href.startsWith('http')
            ? href
            : `https://www.zonaprop.com.ar${href}`;

          const priceEl = card.querySelector('[data-qa="POSTING_CARD_PRICE"]');
          const priceText = priceEl?.textContent?.trim() || '';
          let priceUsd: number | null = null;
          let priceArs: number | null = null;

          if (priceText.startsWith('USD') || priceText.includes('U$S')) {
            const m = priceText.match(/([\d.]+)/);
            if (m) priceUsd = parseFloat(m[1].replace(/\./g, ''));
          } else {
            const m = priceText.match(/([\d.]+)/);
            if (m) priceArs = parseFloat(m[1].replace(/\./g, ''));
          }

          const expEl = card.querySelector('[data-qa="expensas"]');
          const expensesDisplay = expEl?.textContent?.trim() || '';

          const locEl = card.querySelector(
            '[data-qa="POSTING_CARD_LOCATION"]',
          );
          const locationText = locEl?.textContent?.trim() || '';
          const parts = locationText.split(',').map((s) => s.trim());
          const neighborhood = parts[0] || locationText;
          const address = parts.length > 1 ? parts.slice(1).join(', ') : '';

          const featEl = card.querySelector(
            '[data-qa="POSTING_CARD_FEATURES"]',
          );
          const featText = featEl?.textContent?.trim() || '';

          const totalMatch = featText.match(/(\d+)\s*m²\s*tot/);
          const totalAreaM2 = totalMatch ? parseFloat(totalMatch[1]) : null;

          const covMatch = featText.match(/(\d+)\s*m²\s*cub/);
          const coveredAreaM2 = covMatch ? parseFloat(covMatch[1]) : null;

          const ambMatch = featText.match(/(\d+)\s*amb/);
          const rooms = ambMatch ? parseInt(ambMatch[1]) : null;

          const dormMatch = featText.match(/(\d+)\s*dorm/);
          const bedrooms = dormMatch ? parseInt(dormMatch[1]) : null;

          const bathMatch = featText.match(/(\d+)\s*ba[ñn]/);
          const bathrooms = bathMatch ? parseInt(bathMatch[1]) : null;

          const descEl = card.querySelector(
            '[data-qa="POSTING_CARD_DESCRIPTION"]',
          );
          const description = descEl?.textContent?.trim() || '';
          const title = description.slice(0, 120);

          const imgEls = card.querySelectorAll('img[src]');
          const imageUrls: string[] = [];
          imgEls.forEach((img) => {
            const src = img.getAttribute('src') || '';
            if (
              src.includes('zonapropcdn.com/avisos/') ||
              src.includes('imgar.')
            ) {
              imageUrls.push(src.replace('360x266', '720x532'));
            }
          });

          const features = featText
            .split('.')
            .map((s) => s.trim())
            .filter(Boolean);

          listings.push({
            id,
            url,
            title,
            priceUsd,
            priceArs,
            expensesDisplay,
            neighborhood,
            address,
            totalAreaM2,
            coveredAreaM2,
            rooms,
            bedrooms,
            bathrooms,
            description,
            imageUrls,
            features,
            publisherName: '',
          });
        } catch {
          // Skip malformed cards
        }
      });

      return listings;
    });
  }
}
