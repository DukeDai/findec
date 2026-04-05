/**
 * Cache manager with TTL-based expiration for historical data
 * 
 * PERFORMANCE NOTES:
 * - The following Prisma queries could benefit from database indexes:
 *   1. `prisma.stock.findUnique({ where: { symbol } })` - ensure symbol has unique index
 *   2. `prisma.historicalData.findMany({ where: { stockSymbol }, orderBy: { date: 'asc' } })` 
 *      - compound index on (stockSymbol, date) for efficient filtering and sorting
 *   3. `prisma.historicalData.findFirst({ where: { stockSymbol }, orderBy: { createdAt: 'desc' } })`
 *      - index on (stockSymbol, createdAt) for latest record lookups
 *   4. The composite unique key `stockSymbol_date` on HistoricalData is already indexed by Prisma
 */

import { prisma } from '@/lib/prisma';
import { HistoricalPrice } from '@/types/stock';

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttlMs: number;
}

export interface CacheManagerConfig {
  defaultTtlMs: number;
}

export class CacheManager {
  private config: CacheManagerConfig;

  constructor(config?: Partial<CacheManagerConfig>) {
    this.config = {
      defaultTtlMs: 24 * 60 * 60 * 1000,
      ...config,
    };
  }

  /**
   * Get historical data from cache if it exists and is fresh
   */
  async getHistoricalData(
    symbol: string,
    maxAgeMs = this.config.defaultTtlMs
  ): Promise<HistoricalPrice[] | null> {
    const stock = await prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() },
      include: {
        history: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    if (!stock || stock.history.length === 0) {
      return null;
    }

    const latestData = stock.history[0];
    const dataAge = Date.now() - latestData.createdAt.getTime();

    if (dataAge > maxAgeMs) {
      return null;
    }

    const cachedHistory = await prisma.historicalData.findMany({
      where: { stockSymbol: symbol.toUpperCase() },
      orderBy: { date: 'asc' },
    });

    return cachedHistory.map((data) => ({
      date: data.date,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      volume: Number(data.volume),
    }));
  }

  /**
   * Store historical data in cache
   */
  async setHistoricalData(
    symbol: string,
    data: HistoricalPrice[],
    name?: string
  ): Promise<void> {
    const normalizedSymbol = symbol.toUpperCase();
    const now = new Date();

    await prisma.stock.upsert({
      where: { symbol: normalizedSymbol },
      update: { updatedAt: now },
      create: {
        symbol: normalizedSymbol,
        name: name || normalizedSymbol,
      },
    });

    const upsertPromises = data.map((dataPoint) =>
      prisma.historicalData.upsert({
        where: {
          stockSymbol_date: {
            stockSymbol: normalizedSymbol,
            date: dataPoint.date,
          },
        },
        update: {
          open: dataPoint.open,
          high: dataPoint.high,
          low: dataPoint.low,
          close: dataPoint.close,
          volume: BigInt(dataPoint.volume || 0),
          createdAt: now,
        },
        create: {
          stockSymbol: normalizedSymbol,
          date: dataPoint.date,
          open: dataPoint.open,
          high: dataPoint.high,
          low: dataPoint.low,
          close: dataPoint.close,
          volume: BigInt(dataPoint.volume || 0),
        },
      })
    );

    await Promise.all(upsertPromises);
  }

  /**
   * Check if cached data exists and is fresh
   */
  async isFresh(symbol: string, maxAgeMs = this.config.defaultTtlMs): Promise<boolean> {
    const stock = await prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() },
      include: {
        history: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    if (!stock || stock.history.length === 0) {
      return false;
    }

    const latestData = stock.history[0];
    const dataAge = Date.now() - latestData.createdAt.getTime();

    return dataAge <= maxAgeMs;
  }

  /**
   * Invalidate cache for a symbol
   */
  async invalidate(symbol: string): Promise<void> {
    await prisma.historicalData.deleteMany({
      where: { stockSymbol: symbol.toUpperCase() },
    });
  }

  /**
   * Get cache metadata for a symbol
   */
  async getCacheInfo(symbol: string): Promise<{
    exists: boolean;
    lastUpdated: Date | null;
    dataPoints: number;
  }> {
    const stock = await prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() },
      include: {
        _count: {
          select: { history: true },
        },
      },
    });

    if (!stock) {
      return { exists: false, lastUpdated: null, dataPoints: 0 };
    }

    const latestHistory = await prisma.historicalData.findFirst({
      where: { stockSymbol: symbol.toUpperCase() },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return {
      exists: true,
      lastUpdated: latestHistory?.createdAt || null,
      dataPoints: stock._count.history,
    };
  }
}

/**
 * Default cache manager instance
 */
export const defaultCacheManager = new CacheManager();
