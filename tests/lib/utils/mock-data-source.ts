import type { DataSource as BacktestDataSource } from '@/lib/backtest/engine'
import type { HistoricalPrice } from '@/lib/indicators'
import { generateMockPriceData } from './mock-data-generator'

export class MockDataSource implements BacktestDataSource {
  private dataStore: Map<string, HistoricalPrice[]> = new Map()

  setData(symbol: string, data: HistoricalPrice[]): void {
    this.dataStore.set(symbol, data)
  }

  async fetchData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalPrice[]> {
    const data = this.dataStore.get(symbol) ?? []
    return data.filter(d => d.date >= startDate && d.date <= endDate)
  }

  static createWithSymbols(
    symbols: string[],
    days: number = 100
  ): MockDataSource {
    const source = new MockDataSource()
    for (const symbol of symbols) {
      source.setData(
        symbol,
        generateMockPriceData({ symbol, startPrice: 100, days })
      )
    }
    return source
  }

  static createWithTrendingSymbols(
    symbols: string[],
    days: number = 100,
    trend: 'up' | 'down' | 'sideways' = 'up'
  ): MockDataSource {
    const source = new MockDataSource()
    for (const symbol of symbols) {
      const trendMap = { up: 0.15, down: -0.15, sideways: 0 }
      source.setData(
        symbol,
        generateMockPriceData({
          symbol,
          startPrice: 100,
          days,
          trend: trendMap[trend],
          volatility: 0.015,
        })
      )
    }
    return source
  }
}
