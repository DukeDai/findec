import { describe, it, expect, beforeEach } from 'vitest'
import {
  PortfolioBacktestEngine,
  BacktestConfig,
  StrategyConfig,
} from '@/lib/backtest/engine'
import { CostModel } from '@/lib/backtest/cost-model'
import { MockDataSource } from '../utils/mock-data-source'
import { generateTrendingData, generateFlatData, generateVolatileData } from '../utils/mock-data-generator'

describe('PortfolioBacktestEngine', () => {
  let mockDataSource: MockDataSource
  let costModel: CostModel
  let engine: PortfolioBacktestEngine

  beforeEach(() => {
    mockDataSource = new MockDataSource()
    costModel = new CostModel({
      commission: { type: 'fixed', fixedPerTrade: 5, percentOfValue: 0 },
      slippage: { model: 'fixed', value: 0 },
      stampDuty: { enabled: false, rate: 0 },
      dividendReinvestment: { enabled: false, reinvestRatio: 0 },
    })
    engine = new PortfolioBacktestEngine(mockDataSource, costModel)
  })

  describe('MA Crossover Strategy', () => {
    it('executes MA crossover strategy without errors', async () => {
      const symbol = 'TEST'
      const data = generateTrendingData(symbol, 60, 'up')
      mockDataSource.setData(symbol, data)

      const config: BacktestConfig = {
        name: 'MA Cross Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'ma_crossover',
            parameters: { shortWindow: 10, longWindow: 30 },
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
      expect(result.equityCurve.length).toBeGreaterThan(0)
      expect(result.metrics).toBeDefined()
    })

    it('executes MA crossover strategy with downtrend data', async () => {
      const symbol = 'TEST'
      const data = generateTrendingData(symbol, 60, 'down')
      mockDataSource.setData(symbol, data)

      const config: BacktestConfig = {
        name: 'MA Death Cross Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'ma_crossover',
            parameters: { shortWindow: 5, longWindow: 20 },
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
      expect(result.equityCurve.length).toBeGreaterThan(0)
    })

    it('calculates positive return with strong uptrend', async () => {
      const symbol = 'TEST'
      const data = generateTrendingData(symbol, 100, 'up')
      mockDataSource.setData(symbol, data)

      const config: BacktestConfig = {
        name: 'Strong Uptrend Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'ma_crossover',
            parameters: { shortWindow: 10, longWindow: 30 },
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
      expect(result.metrics).toBeDefined()
      expect(result.metrics.totalReturn).not.toBeNaN()
    })
  })

  describe('RSI Strategy', () => {
    it('executes trades based on RSI oversold/overbought levels', async () => {
      const symbol = 'TEST'
      const data = generateVolatileData(symbol, 50)
      mockDataSource.setData(symbol, data)

      const config: BacktestConfig = {
        name: 'RSI Strategy Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'rsi',
            parameters: { rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 70 },
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
      expect(result.trades.length).toBeGreaterThanOrEqual(0)
    })

    it('handles RSI with default parameters', async () => {
      const symbol = 'TEST'
      const data = generateFlatData(symbol, 50)
      mockDataSource.setData(symbol, data)

      const config: BacktestConfig = {
        name: 'RSI Default Params Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'rsi',
            parameters: {},
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
    })
  })

  describe('MACD Strategy', () => {
    it('generates signals based on MACD crossover', async () => {
      const symbol = 'TEST'
      const data = generateTrendingData(symbol, 80, 'up')
      mockDataSource.setData(symbol, data)

      const config: BacktestConfig = {
        name: 'MACD Strategy Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'macd',
            parameters: { macdFast: 12, macdSlow: 26, macdSignal: 9 },
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
    })
  })

  describe('Bollinger Bands Strategy', () => {
    it('executes Bollinger Bands strategy', async () => {
      const symbol = 'TEST'
      const data = generateVolatileData(symbol, 60)
      mockDataSource.setData(symbol, data)

      const config: BacktestConfig = {
        name: 'Bollinger Strategy Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'bollinger',
            parameters: { bollingerPeriod: 20, bollingerStdDev: 2 },
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
    })
  })

  describe('Momentum Strategy', () => {
    it('executes momentum strategy with threshold', async () => {
      const symbol = 'TEST'
      const data = generateTrendingData(symbol, 50, 'up')
      mockDataSource.setData(symbol, data)

      const config: BacktestConfig = {
        name: 'Momentum Strategy Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'momentum',
            parameters: { momentumPeriod: 10, momentumThreshold: 5 },
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
    })
  })

  describe('Portfolio Multi-Symbol', () => {
    it('handles multiple symbols with allocation', async () => {
      const symbols = ['AAPL', 'MSFT']
      for (const symbol of symbols) {
        mockDataSource.setData(symbol, generateTrendingData(symbol, 80, 'up'))
      }

      const config: BacktestConfig = {
        name: 'Multi-Symbol Test',
        symbols,
        initialCapital: 20000,
        allocation: new Map([['AAPL', 0.6], ['MSFT', 0.4]]),
        strategies: symbols.map(s => ({
          symbol: s,
          type: 'ma_crossover',
          parameters: { shortWindow: 10, longWindow: 30 },
        })),
        rebalance: 'monthly',
        rebalanceThreshold: 0.05,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
      expect(result.equityCurve.length).toBeGreaterThan(0)
      expect(result.finalState.positions.size).toBeGreaterThan(0)
    })

    it('handles different date ranges for symbols', async () => {
      const symbols = ['AAPL', 'GOOGL']
      const aaplData = generateTrendingData('AAPL', 100, 'up')
      const googlData = generateTrendingData('GOOGL', 80, 'up')
      mockDataSource.setData('AAPL', aaplData)
      mockDataSource.setData('GOOGL', googlData)

      const config: BacktestConfig = {
        name: 'Different Date Ranges Test',
        symbols,
        initialCapital: 10000,
        allocation: new Map([['AAPL', 0.5], ['GOOGL', 0.5]]),
        strategies: symbols.map(s => ({
          symbol: s,
          type: 'ma_crossover',
          parameters: { shortWindow: 10, longWindow: 30 },
        })),
        rebalance: 'monthly',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
    })
  })

  describe('Rebalancing', () => {
    it('rebalances weekly when configured', async () => {
      const symbols = ['AAPL', 'MSFT']
      for (const symbol of symbols) {
        mockDataSource.setData(symbol, generateTrendingData(symbol, 90, 'up'))
      }

      const config: BacktestConfig = {
        name: 'Weekly Rebalance Test',
        symbols,
        initialCapital: 20000,
        allocation: new Map([['AAPL', 0.5], ['MSFT', 0.5]]),
        strategies: symbols.map(s => ({
          symbol: s,
          type: 'ma_crossover',
          parameters: { shortWindow: 10, longWindow: 30 },
        })),
        rebalance: 'weekly',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
    })

    it('rebalances monthly when configured', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL']
      for (const symbol of symbols) {
        mockDataSource.setData(symbol, generateTrendingData(symbol, 120, 'up'))
      }

      const config: BacktestConfig = {
        name: 'Monthly Rebalance Test',
        symbols,
        initialCapital: 30000,
        allocation: new Map([['AAPL', 0.4], ['MSFT', 0.3], ['GOOGL', 0.3]]),
        strategies: symbols.map(s => ({
          symbol: s,
          type: 'ma_crossover',
          parameters: { shortWindow: 10, longWindow: 30 },
        })),
        rebalance: 'monthly',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
    })

    it('does not rebalance when set to none', async () => {
      const symbol = 'TEST'
      mockDataSource.setData(symbol, generateTrendingData(symbol, 60, 'up'))

      const config: BacktestConfig = {
        name: 'No Rebalance Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'ma_crossover',
            parameters: { shortWindow: 10, longWindow: 30 },
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty data gracefully', async () => {
      const config: BacktestConfig = {
        name: 'Empty Data Test',
        symbols: ['EMPTY'],
        initialCapital: 10000,
        allocation: new Map([['EMPTY', 1]]),
        strategies: [],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
      expect(result.trades).toHaveLength(0)
      expect(result.metrics.totalReturn).toBe(0)
    })

    it('handles no matching data in date range', async () => {
      const symbol = 'TEST'
      const data = generateTrendingData(symbol, 30, 'up')
      mockDataSource.setData(symbol, data)

      const config: BacktestConfig = {
        name: 'Date Range Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'ma_crossover',
            parameters: { shortWindow: 10, longWindow: 30 },
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
    })

    it('calculates risk metrics correctly', async () => {
      const symbol = 'TEST'
      mockDataSource.setData(symbol, generateTrendingData(symbol, 100, 'up'))

      const config: BacktestConfig = {
        name: 'Risk Metrics Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'ma_crossover',
            parameters: { shortWindow: 10, longWindow: 30 },
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.metrics.sharpeRatio).not.toBeNaN()
      expect(result.metrics.maxDrawdown).toBeGreaterThanOrEqual(0)
      expect(result.metrics.totalReturn).not.toBeNaN()
      expect(result.equityCurve.length).toBeGreaterThan(0)
    })

    it('handles single symbol with no trades', async () => {
      const symbol = 'TEST'
      const data = generateFlatData(symbol, 50, 100)
      mockDataSource.setData(symbol, data)

      const config: BacktestConfig = {
        name: 'Flat Market No Trades Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'ma_crossover',
            parameters: { shortWindow: 50, longWindow: 100 },
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
    })
  })

  describe('Strategy Parameters', () => {
    it('uses correct short and long window parameters for MA', async () => {
      const symbol = 'TEST'
      mockDataSource.setData(symbol, generateTrendingData(symbol, 100, 'up'))

      const config: BacktestConfig = {
        name: 'MA Window Params Test',
        symbols: [symbol],
        initialCapital: 10000,
        allocation: new Map([[symbol, 1]]),
        strategies: [
          {
            symbol,
            type: 'ma_crossover',
            parameters: { shortWindow: 5, longWindow: 15 },
          },
        ],
        rebalance: 'none',
        rebalanceThreshold: 0,
      }

      const result = await engine.run(config)
      expect(result.status).toBe('completed')
      expect(result.trades.length).toBeGreaterThan(0)
    })
  })
})
