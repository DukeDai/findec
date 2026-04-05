import { Quote, StockSearchResult } from '@/types/stock';
import { FundamentalData } from '@/lib/data/fundamental-data';
import { MarketDataSource, DataPoint } from '../data-source-registry';

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance';

interface YahooChartResponse {
  chart: {
    result: YahooChartResult[] | null;
    error: null | { description: string };
  };
}

interface YahooChartResult {
  meta: { shortName?: string; longName?: string };
  timestamp: number[];
  indicators: {
    quote: Array<{
      open: number[]; high: number[]; low: number[]; close: number[]; volume: number[];
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
  };
}

interface YahooSummaryResult {
  assetProfile?: { longName?: string };
  summaryDetail?: {
    marketCap?: { raw: number };
    trailingPE?: { raw: number };
    pegRatio?: { raw: number };
    priceToBook?: { raw: number };
    dividendYield?: { raw: number };
    fiftyTwoWeekHigh?: { raw: number };
    fiftyTwoWeekLow?: { raw: number };
    beta?: { raw: number };
    epsTrailing12Months?: { raw: number };
    previousClose?: { raw: number };
  };
  price?: { regularMarketPrice?: { raw: number }; longName?: string };
}

class YahooFinanceSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YahooFinanceSourceError';
  }
}

export class YahooFinanceSource implements MarketDataSource {
  readonly name = 'yahoo' as const;
  private rateLimiter: { acquire: () => Promise<void> };
  private cacheManager: { setHistoricalData: (s: string, d: DataPoint[]) => Promise<void>; getHistoricalData: (s: string) => Promise<DataPoint[]> };

  constructor(
    rateLimiter: { acquire: () => Promise<void> } = { acquire: async () => {} },
    cacheManager?: { setHistoricalData: (s: string, d: DataPoint[]) => Promise<void>; getHistoricalData: (s: string) => Promise<DataPoint[]> }
  ) {
    this.rateLimiter = rateLimiter;
    this.cacheManager = cacheManager || { setHistoricalData: async () => {}, getHistoricalData: async () => [] };
  }

  async getHistoricalData(symbol: string, range: string): Promise<DataPoint[]> {
    const normalizedSymbol = symbol.toUpperCase();
    await this.rateLimiter.acquire();

    const url = `${YAHOO_FINANCE_BASE_URL}/chart/${normalizedSymbol}?interval=1d&range=${range}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!response.ok) {
      throw new YahooFinanceSourceError(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as YahooChartResponse;

    if (data.chart.error) {
      throw new YahooFinanceSourceError(`Yahoo Finance API error: ${data.chart.error.description}`);
    }

    if (!data.chart.result || data.chart.result.length === 0) {
      throw new YahooFinanceSourceError(`No data found for symbol: ${normalizedSymbol}`);
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    if (!timestamps || !quote) {
      throw new YahooFinanceSourceError(`No historical data available for symbol: ${normalizedSymbol}`);
    }

    const now = new Date();
    const dataPoints: DataPoint[] = [];

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
  }

  async getQuote(symbol: string): Promise<Quote> {
    const normalizedSymbol = symbol.toUpperCase();
    await this.rateLimiter.acquire();

    const url = `${YAHOO_FINANCE_BASE_URL}/chart/${normalizedSymbol}?interval=1d&range=1d`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!response.ok) {
      throw new YahooFinanceSourceError(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as YahooChartResponse;

    if (data.chart.error) {
      throw new YahooFinanceSourceError(`Yahoo Finance API error: ${data.chart.error.description}`);
    }

    if (!data.chart.result || data.chart.result.length === 0) {
      throw new YahooFinanceSourceError(`No data found for symbol: ${normalizedSymbol}`);
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const indicators = result.indicators;

    if (!indicators.quote || indicators.quote.length === 0) {
      throw new YahooFinanceSourceError(`No quote data found for symbol: ${normalizedSymbol}`);
    }

    const quote = indicators.quote[0];
    const timestamp = result.timestamp[result.timestamp.length - 1];
    const close = quote.close[quote.close.length - 1];
    const open = quote.open[0];

    if (close === undefined || close === null) {
      throw new YahooFinanceSourceError(`No price data available for symbol: ${normalizedSymbol}`);
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
  }

  async search(query: string): Promise<StockSearchResult[]> {
    await this.rateLimiter.acquire();

    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=0`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!response.ok) {
      throw new YahooFinanceSourceError(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as YahooSearchResponse;

    if (!data.quotes) return [];

    return data.quotes.map((quote) => ({
      symbol: quote.symbol,
      name: quote.shortname || quote.longname || quote.symbol,
      exchange: quote.exchange || '',
      type: quote.quoteType || '',
    }));
  }

  async getFundamentalData(symbol: string): Promise<FundamentalData> {
    const normalizedSymbol = symbol.toUpperCase();
    await this.rateLimiter.acquire();

    const url = `${YAHOO_FINANCE_BASE_URL}/quoteSummary/${normalizedSymbol}?modules=summaryDetail,assetProfile,price`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!response.ok) {
      throw new YahooFinanceSourceError(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as YahooSummaryResponse;

    if (data.quoteSummary.error) {
      throw new YahooFinanceSourceError(`Yahoo Finance API error: ${data.quoteSummary.error.description}`);
    }

    if (!data.quoteSummary.result || data.quoteSummary.result.length === 0) {
      throw new YahooFinanceSourceError(`No data found for symbol: ${normalizedSymbol}`);
    }

    const result = data.quoteSummary.result[0];
    const summary = result.summaryDetail;
    const price = result.price;
    const assetProfile = result.assetProfile;

    if (!summary) {
      throw new YahooFinanceSourceError(`No summary data available for symbol: ${normalizedSymbol}`);
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
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.rateLimiter.acquire();
      const response = await fetch(`${YAHOO_FINANCE_BASE_URL}/chart/AAPL?interval=1d&range=1d`, {
        headers: { Accept: 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
