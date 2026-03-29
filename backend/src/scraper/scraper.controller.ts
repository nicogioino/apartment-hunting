import { Controller, Post, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScraperService } from './scraper.service';
import { DollarService } from './dollar.service';
import { ListingsService } from '../listings/listings.service';

@Controller('scraper')
export class ScraperController {
  constructor(
    private readonly config: ConfigService,
    private readonly scraperService: ScraperService,
    private readonly dollarService: DollarService,
    private readonly listingsService: ListingsService,
  ) {}

  private guardLocal() {
    if (this.config.get('NODE_ENV') === 'production') {
      throw new ForbiddenException('Scraping is only available locally');
    }
  }

  @Post('run')
  async runScrape() {
    this.guardLocal();
    return this.scraperService.scrape();
  }

  @Post('convert-prices')
  async convertPrices() {
    this.guardLocal();
    const rate = await this.dollarService.getBlueRate();
    const all = await this.listingsService.findAll({});
    let converted = 0;

    for (const listing of all) {
      if (!listing.priceUsd && listing.priceArs) {
        const usd = this.dollarService.arsToUsd(
          Number(listing.priceArs),
          rate,
        );
        await this.listingsService.updatePriceUsd(listing.id, usd);
        converted++;
      }
    }

    return { rate, converted };
  }
}
