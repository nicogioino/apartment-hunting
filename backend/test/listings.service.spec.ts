import 'reflect-metadata';

import { FindOperator } from 'typeorm';
import { ListingsService } from '../src/listings/listings.service';

function createService({
  repo = {},
  priceHistoryRepo = {},
}: {
  repo?: Record<string, unknown>;
  priceHistoryRepo?: Record<string, unknown>;
} = {}) {
  return new ListingsService(repo as any, priceHistoryRepo as any);
}

describe('ListingsService', () => {
  it('saves new listings with first-seen metadata', async () => {
    let savedListing: any;
    const repo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (listing) => {
        savedListing = listing;
        return listing;
      }),
    };

    const service = createService({ repo });
    const result = await service.upsert({ id: 'listing-1', priceUsd: 850 });

    expect(result).toEqual({ isNew: true });
    expect(savedListing).toMatchObject({
      id: 'listing-1',
      priceUsd: 850,
      priceChangeUsd: 0,
    });
    expect(savedListing.firstSeen).toBeInstanceOf(Date);
    expect(savedListing.lastSeen).toBeInstanceOf(Date);
  });

  it('records price history and cumulative USD change for existing listings', async () => {
    const existing = {
      id: 'listing-1',
      priceArs: null,
      priceUsd: 1000,
    };
    let savedHistory: any;
    let updatedListing: any;
    const repo = {
      findOneBy: jest.fn().mockResolvedValue(existing),
      update: jest.fn(async (id, update) => {
        updatedListing = { id, update };
      }),
    };
    const priceHistoryRepo = {
      save: jest.fn(async (history) => {
        savedHistory = history;
        return history;
      }),
      findOne: jest.fn().mockResolvedValue({ listingId: existing.id, priceUsd: 900 }),
    };

    const service = createService({ repo, priceHistoryRepo });
    const result = await service.upsert({ id: existing.id, priceUsd: 1100 }, 1400);

    expect(result).toEqual({ isNew: false });
    expect(savedHistory).toEqual({
      listingId: existing.id,
      priceArs: existing.priceArs,
      priceUsd: existing.priceUsd,
      blueRate: 1400,
    });
    expect(updatedListing.id).toBe(existing.id);
    expect(updatedListing.update.priceChangeUsd).toBe(200);
    expect(updatedListing.update.missedScrapes).toBe(0);
    expect(updatedListing.update.isActive).toBe(true);
    expect(updatedListing.update.lastSeen).toBeInstanceOf(Date);
  });

  it('reconverts only active ARS listings with meaningful USD changes', async () => {
    const updated: any[] = [];
    const queryBuilder = {
      where: jest.fn(() => queryBuilder),
      andWhere: jest.fn(() => queryBuilder),
      getMany: jest.fn().mockResolvedValue([
        { id: 'unchanged', priceArs: 100.5, priceUsd: 100 },
        { id: 'changed', priceArs: 105, priceUsd: 100 },
      ]),
    };
    const repo = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      update: jest.fn(async (id, update) => {
        updated.push({ id, update });
      }),
    };

    const service = createService({ repo });
    const count = await service.reconvertAllArs(1400, (ars) => Number(ars));

    expect(count).toBe(1);
    expect(queryBuilder.where).toHaveBeenCalledWith('l.priceArs IS NOT NULL');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('l.isActive = true');
    expect(updated).toEqual([{ id: 'changed', update: { priceUsd: 105 } }]);
  });

  it('queries only active listings with no ranking timestamp', async () => {
    let findOptions: any;
    const repo = {
      find: jest.fn(async (options) => {
        findOptions = options;
        return [];
      }),
    };

    const service = createService({ repo });
    await service.getUnranked();

    expect(findOptions.where.isActive).toBe(true);
    expect(findOptions.where.rankedAt).toBeInstanceOf(FindOperator);
    expect(findOptions.where.rankedAt.type).toBe('isNull');
  });
});
