import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { DollarService } from './dollar.service';
import { ScrapeRun } from './scrape-run.entity';
import { ListingsModule } from '../listings/listings.module';
import { RankerModule } from '../ranker/ranker.module';

@Module({
  imports: [TypeOrmModule.forFeature([ScrapeRun]), ListingsModule, RankerModule],
  controllers: [ScraperController],
  providers: [ScraperService, DollarService],
  exports: [ScraperService, DollarService],
})
export class ScraperModule {}
