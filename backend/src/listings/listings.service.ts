import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from './listing.entity';
import { PriceHistory } from './price-history.entity';

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    @InjectRepository(Listing)
    private readonly repo: Repository<Listing>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepo: Repository<PriceHistory>,
  ) {}

  async findAll(params: {
    sortBy?: string;
    order?: 'ASC' | 'DESC';
    neighborhood?: string;
    minScore?: number;
    isActive?: boolean;
  }) {
    const qb = this.repo.createQueryBuilder('l');

    if (params.isActive !== undefined) {
      qb.where('l.isActive = :active', { active: params.isActive });
    }

    if (params.neighborhood) {
      qb.andWhere('l.neighborhood ILIKE :n', { n: `%${params.neighborhood}%` });
    }
    if (params.minScore) {
      qb.andWhere('l.scoreOverall >= :s', { s: params.minScore });
    }

    const sortCol = params.sortBy || 'scoreOverall';
    const allowed = [
      'scoreOverall',
      'scoreValue',
      'scoreLocation',
      'scoreAesthetics',
      'priceUsd',
      'totalAreaM2',
      'firstSeen',
      'lastSeen',
    ];
    const col = allowed.includes(sortCol) ? sortCol : 'scoreOverall';
    qb.orderBy(`l.${col}`, params.order || 'DESC', 'NULLS LAST');

    return qb.getMany();
  }

  async findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  async getNeighborhoods(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('l')
      .select('DISTINCT l.neighborhood', 'neighborhood')
      .where('l.neighborhood IS NOT NULL')
      .orderBy('l.neighborhood')
      .getRawMany();
    return rows.map((r) => r.neighborhood);
  }

  async upsert(listing: Partial<Listing>, blueRate?: number) {
    const existing = await this.repo.findOneBy({ id: listing.id });

    if (existing) {
      // Detect listing price change (ARS or USD changed by the landlord)
      const oldArs = Number(existing.priceArs) || 0;
      const newArs = Number(listing.priceArs) || 0;
      const oldUsdNative = Number(existing.priceUsd) || 0;
      const newUsdNative = Number(listing.priceUsd) || 0;

      const arsChanged = newArs > 0 && oldArs > 0 && oldArs !== newArs;
      const usdChanged =
        newUsdNative > 0 && oldUsdNative > 0 && oldUsdNative !== newUsdNative;

      if (arsChanged || usdChanged) {
        // Record old price in history
        await this.priceHistoryRepo.save({
          listingId: existing.id,
          priceArs: existing.priceArs,
          priceUsd: existing.priceUsd,
          blueRate: blueRate || undefined,
        });

        // Compute cumulative USD change from first recorded price
        const firstRecord = await this.priceHistoryRepo.findOne({
          where: { listingId: existing.id },
          order: { recordedAt: 'ASC' },
        });
        const originalUsd = firstRecord
          ? Number(firstRecord.priceUsd)
          : oldUsdNative;
        const currentUsd = Number(listing.priceUsd) || newUsdNative;
        listing.priceChangeUsd = currentUsd - originalUsd;

        this.logger.log(
          `Price change for ${existing.id}: USD ${originalUsd} -> ${currentUsd} (${listing.priceChangeUsd > 0 ? '+' : ''}${listing.priceChangeUsd})`,
        );
      }

      await this.repo.update(existing.id, {
        ...listing,
        lastSeen: new Date(),
      });
      return { isNew: false };
    }

    await this.repo.save({
      ...listing,
      priceChangeUsd: 0,
      firstSeen: new Date(),
      lastSeen: new Date(),
    });
    return { isNew: true };
  }

  async updatePriceUsd(id: string, priceUsd: number) {
    await this.repo.update(id, { priceUsd });
  }

  async reconvertAllArs(blueRate: number, arsToUsd: (ars: number, rate: number) => number) {
    const arsListings = await this.repo
      .createQueryBuilder('l')
      .where('l.priceArs IS NOT NULL')
      .andWhere('l.isActive = true')
      .getMany();

    let updated = 0;
    for (const l of arsListings) {
      const newUsd = arsToUsd(Number(l.priceArs), blueRate);
      const oldUsd = Number(l.priceUsd) || 0;

      // Only update if the rate-based conversion changed meaningfully (>$1 diff)
      if (Math.abs(newUsd - oldUsd) > 1) {
        await this.repo.update(l.id, { priceUsd: newUsd });
        updated++;
      }
    }
    return updated;
  }

  async getPriceHistory(listingId: string) {
    return this.priceHistoryRepo.find({
      where: { listingId },
      order: { recordedAt: 'ASC' },
    });
  }

  async getUnranked() {
    return this.repo.find({
      where: { rankedAt: null as any, isActive: true },
    });
  }

  async updateScores(
    id: string,
    scores: {
      scoreValue: number;
      scoreLocation: number;
      scoreAesthetics: number;
      scoreOverall: number;
      rankingNotes: string;
    },
  ) {
    await this.repo.update(id, { ...scores, rankedAt: new Date() });
  }

  async markInactive(activeIds: string[]) {
    if (activeIds.length === 0) return;
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where('id NOT IN (:...ids)', { ids: activeIds })
      .andWhere('isActive = true')
      .execute();
  }
}