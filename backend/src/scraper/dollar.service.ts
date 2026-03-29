import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DollarService {
  private readonly logger = new Logger(DollarService.name);
  private cachedRate: number | null = null;
  private cachedAt: number = 0;
  private readonly TTL = 1000 * 60 * 60; // 1 hour

  async getBlueRate(): Promise<number> {
    if (this.cachedRate !== null && Date.now() - this.cachedAt < this.TTL) {
      return this.cachedRate!;
    }

    const res = await fetch('https://dolarapi.com/v1/dolares/blue');
    if (!res.ok) throw new Error(`DolarAPI error: ${res.status}`);

    const data = await res.json();
    // Use the sell ("venta") rate for converting ARS prices to USD
    this.cachedRate = data.venta;
    this.cachedAt = Date.now();
    this.logger.log(`Blue dollar rate: ${this.cachedRate} ARS/USD`);
    return this.cachedRate!;
  }

  arsToUsd(ars: number, rate: number): number {
    return Math.round((ars / rate) * 100) / 100;
  }
}
