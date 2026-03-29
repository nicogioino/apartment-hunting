import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ListingsModule } from './listings/listings.module';
import { ScraperModule } from './scraper/scraper.module';
import { RankerModule } from './ranker/ranker.module';
import { Listing } from './listings/listing.entity';
import { PriceHistory } from './listings/price-history.entity';
import { ScrapeRun } from './scraper/scrape-run.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'apartment_hunting'),
        entities: [Listing, PriceHistory, ScrapeRun],
        synchronize: true,
      }),
    }),
    ScheduleModule.forRoot(),
    ListingsModule,
    ScraperModule,
    RankerModule,
  ],
})
export class AppModule {}
