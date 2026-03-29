import { Controller, Post, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RankerService } from './ranker.service';

@Controller('ranker')
export class RankerController {
  constructor(
    private readonly config: ConfigService,
    private readonly rankerService: RankerService,
  ) {}

  @Post('run')
  async runRank() {
    if (this.config.get('NODE_ENV') === 'production') {
      throw new ForbiddenException('Ranking is only available locally');
    }
    return this.rankerService.rankAll();
  }
}
