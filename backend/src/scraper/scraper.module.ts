import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { DollarService } from './dollar.service';
import { ScrapeRun } from './scrape-run.entity';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [TypeOrmModule.forFeature([ScrapeRun]), ListingsModule],
  controllers: [ScraperController],
  providers: [ScraperService, DollarService],
  exports: [ScraperService, DollarService],
})
export class ScraperModule {}
