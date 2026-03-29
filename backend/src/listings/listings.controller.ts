import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  findAll(
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('neighborhood') neighborhood?: string,
    @Query('minScore') minScore?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.listingsService.findAll({
      sortBy,
      order,
      neighborhood,
      minScore: minScore ? parseFloat(minScore) : undefined,
      isActive: isActive !== undefined ? (isActive === 'false' ? false : true) : true,
    });
  }

  @Get('neighborhoods')
  getNeighborhoods() {
    return this.listingsService.getNeighborhoods();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @Get(':id/price-history')
  getPriceHistory(@Param('id') id: string) {
    return this.listingsService.getPriceHistory(id);
  }
}