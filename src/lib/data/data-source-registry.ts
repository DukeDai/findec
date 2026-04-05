/**
 * Data source registry with circuit breaker pattern.
 * Manages multiple data sources, tracks health, and auto-fails over on consecutive failures.
 */

import { Quote, HistoricalPrice, StockSearchResult } from '@/types/stock';
import { FundamentalData } from '@/lib/data/fundamental-data';
import { SupportedSource, defaultDataSourceConfig } from './data-source-config';

export interface MarketDataSource {
  readonly name: SupportedSource;
  getHistoricalData(symbol: string, range: string): Promise<DataPoint[]>;
  getQuote(symbol: string): Promise<Quote>;
  search(query: string): Promise<StockSearchResult[]>;
  getFundamentalData(symbol: string): Promise<FundamentalData>;
  healthCheck(): Promise<boolean>;
}

export interface DataPoint extends HistoricalPrice {
  source: SupportedSource;
  sourceTimestamp: Date;
}

interface CircuitState {
  consecutiveFailures: number;
  isOpen: boolean;
}

export class DataSourceRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataSourceRegistryError';
  }
}

export class DataSourceRegistry {
  private sources: Map<SupportedSource, MarketDataSource> = new Map();
  private circuitStates: Map<SupportedSource, CircuitState> = new Map();
  private sourceOrder: SupportedSource[] = [];
  private threshold: number;
  private fallbackToMock: boolean;
  private activeSource: SupportedSource | null = null;

  constructor(sources: MarketDataSource[], config = defaultDataSourceConfig) {
    this.threshold = config.circuitBreakerThreshold;
    this.fallbackToMock = config.fallbackToMock;

    for (const source of sources) {
      this.sources.set(source.name, source);
      this.circuitStates.set(source.name, { consecutiveFailures: 0, isOpen: false });
      this.sourceOrder.push(source.name);
    }
  }

  async getHistoricalData(symbol: string, range: string): Promise<DataPoint[]> {
    const source = await this.getActiveSource();
    try {
      const data = await source.getHistoricalData(symbol, range);
      this.recordSuccess(source.name);
      return data.map((d) => ({ ...d, source: source.name, sourceTimestamp: new Date() }));
    } catch {
      this.recordFailure(source.name);
      const nextSource = await this.getNextHealthySource(source.name);
      if (!nextSource && this.fallbackToMock) {
        return this.getMockData(symbol, range);
      }
      if (!nextSource) throw new DataSourceRegistryError('All data sources unavailable');
      return this.getHistoricalData(symbol, range);
    }
  }

  async getQuote(symbol: string): Promise<Quote> {
    const source = await this.getActiveSource();
    try {
      const quote = await source.getQuote(symbol);
      this.recordSuccess(source.name);
      return quote;
    } catch {
      this.recordFailure(source.name);
      const nextSource = await this.getNextHealthySource(source.name);
      if (!nextSource && this.fallbackToMock) return this.getMockQuote(symbol);
      if (!nextSource) throw new DataSourceRegistryError('All data sources unavailable');
      return this.getQuote(symbol);
    }
  }

  async search(query: string): Promise<StockSearchResult[]> {
    const source = await this.getActiveSource();
    try {
      const results = await source.search(query);
      this.recordSuccess(source.name);
      return results;
    } catch {
      this.recordFailure(source.name);
      const nextSource = await this.getNextHealthySource(source.name);
      if (!nextSource && this.fallbackToMock) return this.getMockSearchResults();
      if (!nextSource) throw new DataSourceRegistryError('All data sources unavailable');
      return this.search(query);
    }
  }

  async getFundamentalData(symbol: string): Promise<FundamentalData> {
    const source = await this.getActiveSource();
    try {
      const data = await source.getFundamentalData(symbol);
      this.recordSuccess(source.name);
      return data;
    } catch {
      this.recordFailure(source.name);
      const nextSource = await this.getNextHealthySource(source.name);
      if (!nextSource) throw new DataSourceRegistryError('All data sources unavailable');
      return this.getFundamentalData(symbol);
    }
  }

  async getHealthStatus(): Promise<Record<SupportedSource, { healthy: boolean; consecutiveFailures: number }>> {
    const status: Record<string, { healthy: boolean; consecutiveFailures: number }> = {};
    for (const name of this.sourceOrder) {
      const circuit = this.circuitStates.get(name)!;
      const source = this.sources.get(name)!;
      let healthy = !circuit.isOpen;
      if (healthy) {
        try {
          healthy = await Promise.race([
            source.healthCheck(),
            new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
          ]);
        } catch {
          healthy = false;
        }
      }
      status[name] = { healthy, consecutiveFailures: circuit.consecutiveFailures };
    }
    return status as Record<SupportedSource, { healthy: boolean; consecutiveFailures: number }>;
  }

  private async getActiveSource(): Promise<MarketDataSource> {
    if (this.activeSource) {
      const circuit = this.circuitStates.get(this.activeSource);
      if (circuit && !circuit.isOpen) {
        return this.sources.get(this.activeSource)!;
      }
    }
    for (const name of this.sourceOrder) {
      const circuit = this.circuitStates.get(name)!;
      if (!circuit.isOpen) {
        this.activeSource = name;
        return this.sources.get(name)!;
      }
    }
    throw new DataSourceRegistryError('No healthy data source available');
  }

  private async getNextHealthySource(current: SupportedSource): Promise<MarketDataSource | null> {
    const currentIndex = this.sourceOrder.indexOf(current);
    for (let i = currentIndex + 1; i < this.sourceOrder.length; i++) {
      const name = this.sourceOrder[i];
      if (name === 'mock') continue;
      const circuit = this.circuitStates.get(name)!;
      if (!circuit.isOpen) {
        this.activeSource = name;
        return this.sources.get(name)!;
      }
    }
    return null;
  }

  private recordSuccess(sourceName: SupportedSource): void {
    const circuit = this.circuitStates.get(sourceName);
    if (circuit) {
      circuit.consecutiveFailures = 0;
      circuit.isOpen = false;
    }
    if (this.activeSource !== sourceName) {
      this.activeSource = sourceName;
    }
  }

  private recordFailure(sourceName: SupportedSource): void {
    const circuit = this.circuitStates.get(sourceName);
    if (circuit) {
      circuit.consecutiveFailures++;
      if (circuit.consecutiveFailures >= this.threshold) {
        circuit.isOpen = true;
      }
    }
  }

  private getMockData(symbol: string, range: string): DataPoint[] {
    const now = new Date();
    const days = this.rangeToDays(range);
    let basePrice = 150;
    const data: DataPoint[] = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      basePrice = basePrice * (1 + (Math.random() - 0.48) * 0.02);
      data.push({
        date,
        open: basePrice * (1 + (Math.random() - 0.5) * 0.01),
        high: basePrice * (1 + Math.random() * 0.02),
        low: basePrice * (1 - Math.random() * 0.02),
        close: basePrice,
        volume: Math.floor(Math.random() * 10000000),
        source: 'mock',
        sourceTimestamp: now,
      });
    }
    return data;
  }

  private getMockQuote(symbol: string): Quote {
    const mock = this.getMockData(symbol, '1d');
    const latest = mock[mock.length - 1];
    const prev = mock.length > 1 ? mock[mock.length - 2] : latest;
    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      price: latest.close,
      change: latest.close - prev.close,
      changePercent: ((latest.close - prev.close) / prev.close) * 100,
      volume: latest.volume,
      timestamp: new Date(),
    };
  }

  private getMockSearchResults(): StockSearchResult[] {
    return [
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'EQUITY' },
    ];
  }

  private rangeToDays(range: string): number {
    switch (range) {
      case '1d': return 1;
      case '5d': return 5;
      case '1mo': return 30;
      case '3mo': return 90;
      case '6mo': return 180;
      case '1y': return 365;
      case '2y': return 730;
      case '5y': return 1825;
      case 'max': return 3650;
      default: return 30;
    }
  }
}
