import { Quote, HistoricalPrice, StockSearchResult, HistoricalRange, HistoricalInterval } from '@/types/stock';
import { DataSource, defaultDataSource } from '@/lib/data/data-source';

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance';

interface YahooQuoteResponse {
  quoteResponse: {
    result: YahooQuoteResult[];
    error: null | { description: string };
  };
}

interface YahooQuoteResult {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketTime?: number;
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

class YahooFinanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YahooFinanceError';
  }
}

async function fetchFromYahoo<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new YahooFinanceError(`HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getQuote(symbol: string): Promise<Quote> {
  return defaultDataSource.getQuote(symbol);
}

export async function getHistoricalData(
  symbol: string,
  range: HistoricalRange = '1mo',
  interval: HistoricalInterval = '1d'
): Promise<HistoricalPrice[]> {
  const dataPoints = await defaultDataSource.getHistoricalData(symbol, range);
  return dataPoints.map((dp) => ({
    date: dp.date,
    open: dp.open,
    high: dp.high,
    low: dp.low,
    close: dp.close,
    volume: dp.volume,
  }));
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  return defaultDataSource.searchStocks(query);
}

export { YahooFinanceError, defaultDataSource, DataSource };
