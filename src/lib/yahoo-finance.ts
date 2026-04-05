import { HistoricalPrice, StockSearchResult, HistoricalRange } from '@/types/stock';
import { FundamentalData } from '@/lib/data/fundamental-data';
import { defaultDataSource } from '@/lib/data/data-source';

export async function getQuote(symbol: string) {
  return defaultDataSource.getQuote(symbol);
}

export async function getHistoricalData(
  symbol: string,
  range: HistoricalRange = '1mo',
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

export async function getFundamentalData(symbol: string): Promise<FundamentalData> {
  return defaultDataSource.getFundamentalData(symbol);
}

export class YahooFinanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YahooFinanceError';
  }
}
