/**
 * Stock-related type definitions
 * Used across the application for stock data representation
 */

/**
 * Represents a real-time stock quote from Yahoo Finance
 */
export interface Quote {
  /** Stock symbol (e.g., "AAPL", "TSLA") */
  symbol: string;
  /** Company name */
  name: string;
  /** Current market price */
  price: number;
  /** Price change from previous close */
  change: number;
  /** Price change percentage */
  changePercent: number;
  /** Trading volume */
  volume: number;
  /** Quote timestamp */
  timestamp: Date;
}

/**
 * Represents a historical price data point (OHLCV)
 */
export interface HistoricalPrice {
  /** Date of the price data */
  date: Date;
  /** Opening price */
  open: number;
  /** Highest price */
  high: number;
  /** Lowest price */
  low: number;
  /** Closing price */
  close: number;
  /** Trading volume */
  volume: number;
}

/**
 * Represents a stock search result
 */
export interface StockSearchResult {
  /** Stock symbol */
  symbol: string;
  /** Company name */
  name: string;
  /** Stock exchange */
  exchange: string;
  /** Stock type (EQUITY, ETF, etc.) */
  type: string;
}

/**
 * Historical data range options
 */
export type HistoricalRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max';

/**
 * Historical data interval options
 */
export type HistoricalInterval = '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo';
