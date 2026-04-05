import { Quote, HistoricalPrice, StockSearchResult } from '@/types/stock';
import { FundamentalData } from '@/lib/data/fundamental-data';
import { DataSourceRegistry, DataPoint } from './data-source-registry';
import { loadDataSourceConfig } from './data-source-config';
import { YahooFinanceSource } from './sources/yahoo-finance-source';
import { FinnhubSource } from './sources/finnhub-source';
import { PolygonSource } from './sources/polygon-source';
import { RateLimiter, yahooFinanceRateLimiter } from './rate-limiter';
import { defaultCacheManager } from './cache-manager';

let _registry: DataSourceRegistry | null = null;

function buildRegistry(): DataSourceRegistry {
  const config = loadDataSourceConfig();
  const rateLimiter: RateLimiter = yahooFinanceRateLimiter;
  const cacheAdapter = {
    setHistoricalData: async (symbol: string, data: DataPoint[]) => {
      await defaultCacheManager.setHistoricalData(symbol, data.map(({ date, open, high, low, close, volume }) => ({ date, open, high, low, close, volume })));
    },
    getHistoricalData: async (symbol: string): Promise<DataPoint[]> => {
      const cached = await defaultCacheManager.getHistoricalData(symbol);
      if (!cached) return [];
      const now = new Date();
      return cached.map((d) => ({ ...d, source: 'yahoo' as const, sourceTimestamp: now }));
    },
  };

  const sources = [];

  for (const name of config.sources) {
    switch (name) {
      case 'yahoo':
        sources.push(new YahooFinanceSource(rateLimiter, cacheAdapter));
        break;
      case 'finnhub':
        sources.push(new FinnhubSource(config.finnhubApiKey));
        break;
      case 'polygon':
        sources.push(new PolygonSource(config.polygonApiKey));
        break;
      case 'mock':
        break;
    }
  }

  return new DataSourceRegistry(sources, config);
}

export interface DataSource {
  getHistoricalData(symbol: string, range: string): Promise<DataPoint[]>;
  getQuote(symbol: string): Promise<Quote>;
  searchStocks(query: string): Promise<StockSearchResult[]>;
  getFundamentalData(symbol: string): Promise<FundamentalData>;
  getBenchmarkData(symbol: 'SPY' | 'QQQ', range: string): Promise<DataPoint[]>;
  checkHealth(): Promise<{ yahoo: boolean; finnhub: boolean; polygon: boolean; fallback: boolean }>;
}

class DataSourceImpl implements DataSource {
  private get registry(): DataSourceRegistry {
    if (!_registry) {
      _registry = buildRegistry();
    }
    return _registry;
  }

  async getHistoricalData(symbol: string, range: string): Promise<DataPoint[]> {
    return this.registry.getHistoricalData(symbol, range);
  }

  async getQuote(symbol: string): Promise<Quote> {
    return this.registry.getQuote(symbol);
  }

  async searchStocks(query: string): Promise<StockSearchResult[]> {
    return this.registry.search(query);
  }

  async getFundamentalData(symbol: string): Promise<FundamentalData> {
    return this.registry.getFundamentalData(symbol);
  }

  async getBenchmarkData(symbol: 'SPY' | 'QQQ', range: string): Promise<DataPoint[]> {
    return this.registry.getHistoricalData(symbol, range);
  }

  async checkHealth(): Promise<{ yahoo: boolean; finnhub: boolean; polygon: boolean; fallback: boolean }> {
    const status = await this.registry.getHealthStatus();
    return {
      yahoo: status.yahoo?.healthy ?? false,
      finnhub: status.finnhub?.healthy ?? false,
      polygon: status.polygon?.healthy ?? false,
      fallback: loadDataSourceConfig().fallbackToMock,
    };
  }
}

export const defaultDataSource: DataSource = new DataSourceImpl();

export function generateMockHistoricalData(symbol: string, range: string): HistoricalPrice[] {
  const days =
    range === '1d' ? 1 :
    range === '5d' ? 5 :
    range === '1mo' ? 30 :
    range === '3mo' ? 90 :
    range === '6mo' ? 180 :
    range === '1y' ? 365 : 252;
  const dataPoints = Math.min(days, 252);
  let basePrice = 150;
  const mockData: HistoricalPrice[] = [];
  const now = new Date();

  for (let i = dataPoints; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    basePrice = basePrice * (1 + (Math.random() - 0.48) * 0.02);
    mockData.push({
      date,
      open: basePrice * (1 + (Math.random() - 0.5) * 0.01),
      high: basePrice * (1 + Math.random() * 0.02),
      low: basePrice * (1 - Math.random() * 0.02),
      close: basePrice,
      volume: Math.floor(Math.random() * 10000000),
    });
  }
  return mockData;
}

export type { DataPoint } from './data-source-registry';
export { DataSourceRegistry, DataSourceRegistryError } from './data-source-registry';
export { defaultDataSourceConfig, loadDataSourceConfig } from './data-source-config';
export type { SupportedSource } from './data-source-config';
