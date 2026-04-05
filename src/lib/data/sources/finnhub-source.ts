import { Quote, StockSearchResult } from '@/types/stock';
import { FundamentalData } from '@/lib/data/fundamental-data';
import { MarketDataSource, DataPoint } from '../data-source-registry';
import { defaultDataSourceConfig } from '../data-source-config';

class FinnhubSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinnhubSourceError';
  }
}

export class FinnhubSource implements MarketDataSource {
  readonly name = 'finnhub' as const;
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || defaultDataSourceConfig.finnhubApiKey || '';
  }

  async getHistoricalData(symbol: string, range: string): Promise<DataPoint[]> {
    if (!this.apiKey) throw new FinnhubSourceError('FINNHUB_API_KEY not configured');

    const to = Math.floor(Date.now() / 1000);
    const from = to - this.rangeToSeconds(range);
    const url = `${this.baseUrl}/stock/candle?symbol=${symbol.toUpperCase()}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`;
    const response = await fetch(url);

    if (!response.ok) throw new FinnhubSourceError(`HTTP error! status: ${response.status}`);

    const data = (await response.json()) as { c?: number[]; t?: number[]; o?: number[]; h?: number[]; l?: number[]; v?: number[]; s: string };

    if (data.s !== 'ok' || !data.c || !data.t) {
      throw new FinnhubSourceError(`No data for symbol: ${symbol}`);
    }

    const now = new Date();
    return data.c.map((close, i) => ({
      date: new Date((data.t![i]) * 1000),
      open: data.o![i],
      high: data.h![i],
      low: data.l![i],
      close,
      volume: data.v![i],
      source: 'finnhub' as const,
      sourceTimestamp: now,
    }));
  }

  async getQuote(symbol: string): Promise<Quote> {
    if (!this.apiKey) throw new FinnhubSourceError('FINNHUB_API_KEY not configured');

    const url = `${this.baseUrl}/quote?symbol=${symbol.toUpperCase()}&token=${this.apiKey}`;
    const response = await fetch(url);

    if (!response.ok) throw new FinnhubSourceError(`HTTP error! status: ${response.status}`);

    const data = (await response.json()) as { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; t: number };

    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      volume: 0,
      timestamp: new Date(data.t * 1000),
    };
  }

  async search(query: string): Promise<StockSearchResult[]> {
    if (!this.apiKey) throw new FinnhubSourceError('FINNHUB_API_KEY not configured');

    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&token=${this.apiKey}`;
    const response = await fetch(url);

    if (!response.ok) throw new FinnhubSourceError(`HTTP error! status: ${response.status}`);

    const data = (await response.json()) as { result: FinnhubSearchResult[] };
    return data.result
      .filter((r) => r.type === 'Common Stock')
      .slice(0, 20)
      .map((r) => ({
        symbol: r.symbol,
        name: r.description,
        exchange: r.exchange || '',
        type: 'EQUITY',
      }));
  }

  async getFundamentalData(symbol: string): Promise<FundamentalData> {
    if (!this.apiKey) throw new FinnhubSourceError('FINNHUB_API_KEY not configured');

    const [quoteRes, metricRes, profileRes] = await Promise.all([
      fetch(`${this.baseUrl}/quote?symbol=${symbol.toUpperCase()}&token=${this.apiKey}`),
      fetch(`${this.baseUrl}/stock/metric?symbol=${symbol.toUpperCase()}&metric=all&token=${this.apiKey}`),
      fetch(`${this.baseUrl}/stock/profile2?symbol=${symbol.toUpperCase()}&token=${this.apiKey}`),
    ]);

    const quote = (await quoteRes.json()) as { c: number; pc: number };
    const metrics = (await metricRes.json()) as { metric: FinnhubMetrics };
    const profile = (await profileRes.json()) as { name?: string; marketCapitalization?: number };

    const metric = metrics.metric;
    return {
      symbol: symbol.toUpperCase(),
      name: profile.name || symbol.toUpperCase(),
      price: quote.c,
      marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1e6 : 0,
      pe: metric?.peExclExtraTTM ?? null,
      peg: metric?.pegTTM ?? null,
      pb: metric?.pbAnnual ?? null,
      dividendYield: metric?.dividendIndicatedAnnualYield ?? null,
      eps: metric?.epsExclExtraItemsTTM ?? null,
      beta: metric?.beta ?? null,
      week52High: metric?.week52High ?? 0,
      week52Low: metric?.week52Low ?? 0,
    };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await fetch(`${this.baseUrl}/ping?token=${this.apiKey}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private rangeToSeconds(range: string): number {
    const map: Record<string, number> = {
      '1d': 86400, '5d': 432000, '1mo': 2592000, '3mo': 7776000,
      '6mo': 15552000, '1y': 31536000, '2y': 63072000, '5y': 157680000,
    };
    return map[range] || 2592000;
  }
}

interface FinnhubSearchResult {
  symbol: string;
  description: string;
  type: string;
  exchange?: string;
}

interface FinnhubMetrics {
  peExclExtraTTM?: number;
  pegTTM?: number;
  pbAnnual?: number;
  dividendIndicatedAnnualYield?: number;
  epsExclExtraItemsTTM?: number;
  beta?: number;
  week52High?: number;
  week52Low?: number;
}
