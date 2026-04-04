/**
 * DataSource abstraction for Yahoo Finance with mock/cache fallback
 */

import { Quote, HistoricalPrice, StockSearchResult, HistoricalRange, HistoricalInterval } from '@/types/stock';
import { FundamentalData } from '@/lib/yahoo-finance';
import { RateLimiter, yahooFinanceRateLimiter } from './rate-limiter';
import { CacheManager, defaultCacheManager } from './cache-manager';

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance';

export interface DataPoint extends HistoricalPrice {
  source: 'yahoo' | 'mock' | 'cache';
  sourceTimestamp: Date;
}

export interface DataSourceConfig {
  primary: 'yahoo';
  fallback: 'mock' | 'cache';
  mockMode: boolean;
}

interface YahooChartResponse {
  chart: {
    result: YahooChartResult[] | null;
    error: null | { description: string };
  };
}

interface YahooChartResult {
  meta: {
    shortName?: string;
    longName?: string;
  };
  timestamp: number[];
  indicators: {
    quote: Array<{
      open: number[];
      high: number[];
      low: number[];
      close: number[];
      volume: number[];
    }>;
  };
}

interface YahooSearchResponse {
  quotes: YahooSearchResult[];
}

interface YahooSearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
}

interface YahooSummaryResponse {
  quoteSummary: {
    result: YahooSummaryResult[];
    error: null | { description: string };
  }
}

interface YahooSummaryResult {
  assetProfile?: {
    longName?: string;
  }
  summaryDetail?: {
    marketCap?: { raw: number }
    trailingPE?: { raw: number }
    pegRatio?: { raw: number }
    priceToBook?: { raw: number }
    dividendYield?: { raw: number }
    fiftyTwoWeekHigh?: { raw: number }
    fiftyTwoWeekLow?: { raw: number }
    beta?: { raw: number }
    epsTrailing12Months?: { raw: number }
    previousClose?: { raw: number }
  }
  price?: {
    regularMarketPrice?: { raw: number }
    longName?: string;
  }
}

class DataSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataSourceError';
  }
}

export class DataSource {
  private config: DataSourceConfig;
  private rateLimiter: RateLimiter;
  private cacheManager: CacheManager;

  constructor(config?: Partial<DataSourceConfig>) {
    this.config = {
      primary: 'yahoo',
      fallback: 'mock',
      mockMode: false,
      ...config,
    };
    this.rateLimiter = yahooFinanceRateLimiter;
    this.cacheManager = defaultCacheManager;
  }

  async getHistoricalData(symbol: string, range: string): Promise<DataPoint[]> {
    const normalizedSymbol = symbol.toUpperCase();

    if (this.config.mockMode) {
      return this.generateMockData(normalizedSymbol, range);
    }

    try {
      await this.rateLimiter.acquire();

      const url = `${YAHOO_FINANCE_BASE_URL}/chart/${normalizedSymbol}?interval=1d&range=${range}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new DataSourceError(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as YahooChartResponse;

      if (data.chart.error) {
        throw new DataSourceError(`Yahoo Finance API error: ${data.chart.error.description}`);
      }

      if (!data.chart.result || data.chart.result.length === 0) {
        throw new DataSourceError(`No data found for symbol: ${normalizedSymbol}`);
      }

      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];

      if (!timestamps || !quote) {
        throw new DataSourceError(`No historical data available for symbol: ${normalizedSymbol}`);
      }

      const dataPoints: DataPoint[] = [];
      const now = new Date();

      for (let i = 0; i < timestamps.length; i++) {
        const open = quote.open[i];
        const high = quote.high[i];
        const low = quote.low[i];
        const close = quote.close[i];
        const volume = quote.volume[i];

        if (open !== null && high !== null && low !== null && close !== null) {
          dataPoints.push({
            date: new Date(timestamps[i] * 1000),
            open,
            high,
            low,
            close,
            volume: volume || 0,
            source: 'yahoo',
            sourceTimestamp: now,
          });
        }
      }

      await this.cacheManager.setHistoricalData(normalizedSymbol, dataPoints);

      return dataPoints;
    } catch (error) {
      if (this.config.fallback === 'cache') {
        const cachedData = await this.cacheManager.getHistoricalData(normalizedSymbol);
        if (cachedData && cachedData.length > 0) {
          return cachedData.map((d) => ({
            ...d,
            source: 'cache' as const,
            sourceTimestamp: new Date(),
          }));
        }
      }

      if (this.config.fallback === 'mock') {
        return this.generateMockData(normalizedSymbol, range);
      }

      throw error;
    }
  }

  async getQuote(symbol: string): Promise<Quote> {
    const normalizedSymbol = symbol.toUpperCase();

    if (this.config.mockMode) {
      const mockData = this.generateMockData(normalizedSymbol, '1d');
      const latest = mockData[mockData.length - 1];
      const prev = mockData.length > 1 ? mockData[mockData.length - 2] : latest;

      return {
        symbol: normalizedSymbol,
        name: normalizedSymbol,
        price: latest.close,
        change: latest.close - prev.close,
        changePercent: ((latest.close - prev.close) / prev.close) * 100,
        volume: latest.volume,
        timestamp: new Date(),
      };
    }

    try {
      await this.rateLimiter.acquire();

      const url = `${YAHOO_FINANCE_BASE_URL}/chart/${normalizedSymbol}?interval=1d&range=1d`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new DataSourceError(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as YahooChartResponse;

      if (data.chart.error) {
        throw new DataSourceError(`Yahoo Finance API error: ${data.chart.error.description}`);
      }

      if (!data.chart.result || data.chart.result.length === 0) {
        throw new DataSourceError(`No data found for symbol: ${normalizedSymbol}`);
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      const indicators = result.indicators;

      if (!indicators.quote || indicators.quote.length === 0) {
        throw new DataSourceError(`No quote data found for symbol: ${normalizedSymbol}`);
      }

      const quote = indicators.quote[0];
      const timestamp = result.timestamp[result.timestamp.length - 1];
      const close = quote.close[quote.close.length - 1];
      const open = quote.open[0];

      if (close === undefined || close === null) {
        throw new DataSourceError(`No price data available for symbol: ${normalizedSymbol}`);
      }

      const price = close;
      const change = open ? price - open : 0;
      const changePercent = open ? (change / open) * 100 : 0;

      return {
        symbol: normalizedSymbol,
        name: meta.shortName || meta.longName || normalizedSymbol,
        price,
        change,
        changePercent,
        volume: quote.volume[quote.volume.length - 1] || 0,
        timestamp: new Date(timestamp * 1000),
      };
    } catch (error) {
      if (this.config.fallback === 'mock') {
        const mockData = this.generateMockData(normalizedSymbol, '1d');
        const latest = mockData[mockData.length - 1];
        const prev = mockData.length > 1 ? mockData[mockData.length - 2] : latest;

        return {
          symbol: normalizedSymbol,
          name: normalizedSymbol,
          price: latest.close,
          change: latest.close - prev.close,
          changePercent: ((latest.close - prev.close) / prev.close) * 100,
          volume: latest.volume,
          timestamp: new Date(),
        };
      }

      throw error;
    }
  }

  async searchStocks(query: string): Promise<StockSearchResult[]> {
    if (this.config.mockMode) {
      return [
        { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'EQUITY' },
      ];
    }

    try {
      await this.rateLimiter.acquire();

      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=0`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new DataSourceError(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as YahooSearchResponse;

      if (!data.quotes) {
        return [];
      }

      return data.quotes.map((quote) => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.symbol,
        exchange: quote.exchange || '',
        type: quote.quoteType || '',
      }));
    } catch (error) {
      if (this.config.fallback === 'mock') {
        return [
          { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
          { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'EQUITY' },
        ];
      }

      throw error;
    }
  }

  async getFundamentalData(symbol: string): Promise<FundamentalData> {
    const normalizedSymbol = symbol.toUpperCase();

    try {
      await this.rateLimiter.acquire();

      const url = `${YAHOO_FINANCE_BASE_URL}/quoteSummary/${normalizedSymbol}?modules=summaryDetail,assetProfile,price`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new DataSourceError(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as YahooSummaryResponse;

      if (data.quoteSummary.error) {
        throw new DataSourceError(`Yahoo Finance API error: ${data.quoteSummary.error.description}`);
      }

      if (!data.quoteSummary.result || data.quoteSummary.result.length === 0) {
        throw new DataSourceError(`No data found for symbol: ${normalizedSymbol}`);
      }

      const result = data.quoteSummary.result[0];
      const summary = result.summaryDetail;
      const price = result.price;
      const assetProfile = result.assetProfile;

      if (!summary) {
        throw new DataSourceError(`No summary data available for symbol: ${normalizedSymbol}`);
      }

      const name = assetProfile?.longName || price?.longName || normalizedSymbol;
      const priceValue = price?.regularMarketPrice?.raw ?? summary.previousClose?.raw ?? 0;
      const marketCap = summary.marketCap?.raw ?? 0;

      return {
        symbol: normalizedSymbol,
        name,
        price: priceValue,
        marketCap,
        pe: summary.trailingPE?.raw ?? null,
        peg: summary.pegRatio?.raw ?? null,
        pb: summary.priceToBook?.raw ?? null,
        dividendYield: summary.dividendYield?.raw ? summary.dividendYield.raw * 100 : null,
        eps: summary.epsTrailing12Months?.raw ?? null,
        beta: summary.beta?.raw ?? null,
        week52High: summary.fiftyTwoWeekHigh?.raw ?? 0,
        week52Low: summary.fiftyTwoWeekLow?.raw ?? 0,
      };
    } catch (error) {
      throw error;
    }
  }

  async getBenchmarkData(symbol: 'SPY' | 'QQQ', range: string): Promise<DataPoint[]> {
    const normalizedSymbol = symbol.toUpperCase() as 'SPY' | 'QQQ';
    return this.getHistoricalData(normalizedSymbol, range);
  }

  async checkHealth(): Promise<{ yahoo: boolean; fallback: boolean }> {
    let yahooHealthy = false;
    let fallbackHealthy = false;

    try {
      await this.rateLimiter.acquire();
      const url = `${YAHOO_FINANCE_BASE_URL}/chart/AAPL?interval=1d&range=1d`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      yahooHealthy = response.ok;
    } catch {
      yahooHealthy = false;
    }

    if (this.config.fallback === 'cache') {
      try {
        const cacheInfo = await this.cacheManager.getCacheInfo('AAPL');
        fallbackHealthy = cacheInfo.exists;
      } catch {
        fallbackHealthy = false;
      }
    } else {
      fallbackHealthy = true;
    }

    return { yahoo: yahooHealthy, fallback: fallbackHealthy };
  }

  private generateMockData(symbol: string, range: string): DataPoint[] {
    const normalizedSymbol = symbol.toUpperCase();
    const now = new Date();
    const days =
      range === '1d'
        ? 1
        : range === '5d'
          ? 5
          : range === '1mo'
            ? 30
            : range === '3mo'
              ? 90
              : range === '6mo'
                ? 180
                : range === '1y'
                  ? 365
                  : 252;
    const dataPoints = Math.min(days, 252);
    let basePrice = 150;
    const mockData: DataPoint[] = [];

    for (let i = dataPoints; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      basePrice = basePrice * (1 + (Math.random() - 0.48) * 0.02);

      mockData.push({
        date: date,
        open: basePrice * (1 + (Math.random() - 0.5) * 0.01),
        high: basePrice * (1 + Math.random() * 0.02),
        low: basePrice * (1 - Math.random() * 0.02),
        close: basePrice,
        volume: Math.floor(Math.random() * 10000000),
        source: 'mock',
        sourceTimestamp: now,
      });
    }

    return mockData;
  }
}

export function generateMockHistoricalData(symbol: string, range: string): HistoricalPrice[] {
  const days =
    range === '1d' ? 1 :
    range === '5d' ? 5 :
    range === '1mo' ? 30 :
    range === '3mo' ? 90 :
    range === '6mo' ? 180 :
    range === '1y' ? 365 : 252
  const dataPoints = Math.min(days, 252)
  let basePrice = 150
  const mockData: HistoricalPrice[] = []
  const now = new Date()

  for (let i = dataPoints; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    basePrice = basePrice * (1 + (Math.random() - 0.48) * 0.02)

    mockData.push({
      date,
      open: basePrice * (1 + (Math.random() - 0.5) * 0.01),
      high: basePrice * (1 + Math.random() * 0.02),
      low: basePrice * (1 - Math.random() * 0.02),
      close: basePrice,
      volume: Math.floor(Math.random() * 10000000),
    })
  }

  return mockData
}

export const defaultDataSource = new DataSource()
