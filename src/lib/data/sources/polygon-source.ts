import { Quote, StockSearchResult } from '@/types/stock';
import { FundamentalData } from '@/lib/data/fundamental-data';
import { MarketDataSource, DataPoint } from '../data-source-registry';
import { defaultDataSourceConfig } from '../data-source-config';

class PolygonSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolygonSourceError';
  }
}

export class PolygonSource implements MarketDataSource {
  readonly name = 'polygon' as const;
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io/v2';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || defaultDataSourceConfig.polygonApiKey || '';
  }

  async getHistoricalData(symbol: string, range: string): Promise<DataPoint[]> {
    if (!this.apiKey) throw new PolygonSourceError('POLYGON_API_KEY not configured');

    const multiplier = 1;
    const timespan = 'day';
    const to = new Date().toISOString().split('T')[0];
    const from = this.calcFromDate(range);
    const url = `${this.baseUrl}/aggs/ticker/${symbol.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&apiKey=${this.apiKey}`;

    const response = await fetch(url);
    if (!response.ok) throw new PolygonSourceError(`HTTP error! status: ${response.status}`);

    const data = (await response.json()) as PolygonAggResponse;
    if (data.status !== 'OK' || !data.results) {
      throw new PolygonSourceError(`No data for symbol: ${symbol}`);
    }

    const now = new Date();
    return data.results.map((r) => ({
      date: new Date(r.t),
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
      source: 'polygon' as const,
      sourceTimestamp: now,
    }));
  }

  async getQuote(symbol: string): Promise<Quote> {
    if (!this.apiKey) throw new PolygonSourceError('POLYGON_API_KEY not configured');

    const url = `${this.baseUrl}/snapshot/locale/us/markets/stocks/tickers/${symbol.toUpperCase()}?apiKey=${this.apiKey}`;
    const response = await fetch(url);

    if (!response.ok) throw new PolygonSourceError(`HTTP error! status: ${response.status}`);

    const data = (await response.json()) as PolygonSnapshotResponse;
    const ticker = data.ticker;

    return {
      symbol: symbol.toUpperCase(),
      name: ticker?.name || symbol.toUpperCase(),
      price: ticker?.lastTrade?.p || 0,
      change: ticker?.lastTrade?.p ? ticker.lastTrade.p - (ticker.prevDay?.c || ticker.lastTrade.p) : 0,
      changePercent: ticker?.todaysChangeEscaped || 0,
      volume: ticker?.day?.v || 0,
      timestamp: new Date(),
    };
  }

  async search(query: string): Promise<StockSearchResult[]> {
    if (!this.apiKey) throw new PolygonSourceError('POLYGON_API_KEY not configured');

    const url = `${this.baseUrl}/reference/tickers?search=${encodeURIComponent(query)}&market=stocks&active=true&apiKey=${this.apiKey}`;
    const response = await fetch(url);

    if (!response.ok) throw new PolygonSourceError(`HTTP error! status: ${response.status}`);

    const data = (await response.json()) as PolygonTickerSearchResponse;
    return (data.tickers || []).map((t) => ({
      symbol: t.ticker,
      name: t.name,
      exchange: t.primary_exchange || '',
      type: t.type || 'EQUITY',
    }));
  }

  async getFundamentalData(symbol: string): Promise<FundamentalData> {
    if (!this.apiKey) throw new PolygonSourceError('POLYGON_API_KEY not configured');

    const url = `${this.baseUrl}/reference/tickers/${symbol.toUpperCase()}?apiKey=${this.apiKey}`;
    const response = await fetch(url);

    if (!response.ok) throw new PolygonSourceError(`HTTP error! status: ${response.status}`);

    const data = (await response.json()) as PolygonTickerResponse;

    return {
      symbol: data.ticker,
      name: data.name || symbol.toUpperCase(),
      price: 0,
      marketCap: data.market_cap ? parseFloat(data.market_cap) : 0,
      pe: null,
      peg: null,
      pb: null,
      dividendYield: data.dividend_yield ? data.dividend_yield * 100 : null,
      eps: null,
      beta: null,
      week52High: data.fifty_two_week?.high || 0,
      week52Low: data.fifty_two_week?.low || 0,
    };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await fetch(`${this.baseUrl}/reference/tickers?search=AAPL&market=stocks&active=true&apiKey=${this.apiKey}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private calcFromDate(range: string): string {
    const to = new Date();
    const from = new Date();
    switch (range) {
      case '1d': from.setDate(to.getDate() - 1); break;
      case '5d': from.setDate(to.getDate() - 5); break;
      case '1mo': from.setMonth(to.getMonth() - 1); break;
      case '3mo': from.setMonth(to.getMonth() - 3); break;
      case '6mo': from.setMonth(to.getMonth() - 6); break;
      case '1y': from.setFullYear(to.getFullYear() - 1); break;
      case '2y': from.setFullYear(to.getFullYear() - 2); break;
      case '5y': from.setFullYear(to.getFullYear() - 5); break;
      default: from.setMonth(to.getMonth() - 1);
    }
    return from.toISOString().split('T')[0];
  }
}

interface PolygonAggResult {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface PolygonAggResponse {
  status: string;
  results?: PolygonAggResult[];
}

interface PolygonSnapshotResponse {
  ticker?: {
    lastTrade?: { p: number };
    prevDay?: { c: number };
    todaysChangeEscaped?: number;
    day?: { v: number };
    name?: string;
  };
}

interface PolygonTickerSearchResponse {
  count: number;
  tickers?: Array<{ ticker: string; name: string; primary_exchange?: string; type: string }>;
}

interface PolygonTickerResponse {
  ticker: string;
  name?: string;
  market_cap?: string;
  dividend_yield?: number;
  fifty_two_week?: { high: number; low: number };
}
