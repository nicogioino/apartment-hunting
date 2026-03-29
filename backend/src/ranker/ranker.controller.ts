import { Controller, Post } from '@nestjs/common';
import { RankerService } from './ranker.service';

@Controller('ranker')
export class RankerController {
  constructor(private readonly rankerService: RankerService) {}

  @Post('run')
  async runRank() {
    return this.rankerService.rankAll();
  }
}
