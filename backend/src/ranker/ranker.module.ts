import { Module } from '@nestjs/common';
import { RankerService } from './ranker.service';
import { RankerController } from './ranker.controller';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [ListingsModule],
  controllers: [RankerController],
  providers: [RankerService],
  exports: [RankerService],
})
export class RankerModule {}
