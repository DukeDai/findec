import { Quote, HistoricalPrice, StockSearchResult, HistoricalRange, HistoricalInterval } from '@/types/stock';

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
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new YahooFinanceError(`HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const url = `${YAHOO_FINANCE_BASE_URL}/chart/${symbol}?interval=1d&range=1d`;
  
  const data = await fetchFromYahoo<YahooChartResponse>(url);
  
  if (data.chart.error) {
    throw new YahooFinanceError(`Yahoo Finance API error: ${data.chart.error.description}`);
  }
  
  if (!data.chart.result || data.chart.result.length === 0) {
    throw new YahooFinanceError(`No data found for symbol: ${symbol}`);
  }
  
  const result = data.chart.result[0];
  const meta = result.meta;
  const indicators = result.indicators;
  
  if (!indicators.quote || indicators.quote.length === 0) {
    throw new YahooFinanceError(`No quote data found for symbol: ${symbol}`);
  }
  
  const quote = indicators.quote[0];
  const timestamp = result.timestamp[result.timestamp.length - 1];
  const close = quote.close[quote.close.length - 1];
  const open = quote.open[0];
  
  if (close === undefined || close === null) {
    throw new YahooFinanceError(`No price data available for symbol: ${symbol}`);
  }
  
  const price = close;
  const change = open ? price - open : 0;
  const changePercent = open ? (change / open) * 100 : 0;
  
  return {
    symbol: symbol.toUpperCase(),
    name: meta.shortName || meta.longName || symbol,
    price,
    change,
    changePercent,
    volume: quote.volume[quote.volume.length - 1] || 0,
    timestamp: new Date(timestamp * 1000),
  };
}

export async function getHistoricalData(
  symbol: string,
  range: HistoricalRange = '1mo',
  interval: HistoricalInterval = '1d'
): Promise<HistoricalPrice[]> {
  const url = `${YAHOO_FINANCE_BASE_URL}/chart/${symbol}?interval=${interval}&range=${range}`;
  
  const data = await fetchFromYahoo<YahooChartResponse>(url);
  
  if (data.chart.error) {
    throw new YahooFinanceError(`Yahoo Finance API error: ${data.chart.error.description}`);
  }
  
  if (!data.chart.result || data.chart.result.length === 0) {
    throw new YahooFinanceError(`No data found for symbol: ${symbol}`);
  }
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];
  
  if (!timestamps || !quote) {
    throw new YahooFinanceError(`No historical data available for symbol: ${symbol}`);
  }
  
  const historicalData: HistoricalPrice[] = [];
  
  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open[i];
    const high = quote.high[i];
    const low = quote.low[i];
    const close = quote.close[i];
    const volume = quote.volume[i];
    
    if (open !== null && high !== null && low !== null && close !== null) {
      historicalData.push({
        date: new Date(timestamps[i] * 1000),
        open,
        high,
        low,
        close,
        volume: volume || 0,
      });
    }
  }
  
  return historicalData;
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=0`;
  
  const data = await fetchFromYahoo<YahooSearchResponse>(url);
  
  if (!data.quotes) {
    return [];
  }
  
  return data.quotes.map((quote) => ({
    symbol: quote.symbol,
    name: quote.shortname || quote.longname || quote.symbol,
    exchange: quote.exchange || '',
    type: quote.quoteType || '',
  }));
}

export { YahooFinanceError };
