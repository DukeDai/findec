import { describe, it, expect } from 'vitest'
import {
  calculateReliability,
  getYears,
  detectMissingData,
  calculateReturns,
  countConsecutiveNegative,
  calculateSkewness,
  type TradeData,
} from '@/lib/backtest/reliability-scorer'
import type { EquityPoint } from '@/lib/backtest/risk-metrics'
import type { BacktestConfig } from '@/lib/backtest/engine'

describe('Reliability Scorer', () => {
  const createMockTradeData = (count: number): TradeData[] => {
    const trades: TradeData[] = []
    for (let i = 0; i < count; i++) {
      trades.push({
        symbol: 'AAPL',
        date: new Date(`2024-01-${String(i * 2 + 1).padStart(2, '0')}`),
        type: i % 2 === 0 ? 'BUY' : 'SELL',
        price: 100 + i,
        quantity: 10,
        value: (100 + i) * 10,
      })
    }
    return trades
  }

  const createMockEquityCurve = (count: number): EquityPoint[] => {
    const curve: EquityPoint[] = []
    let value = 10000
    for (let i = 0; i < count; i++) {
      value = value * (1 + (Math.random() - 0.5) * 0.02)
      curve.push({
        date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        value,
      })
    }
    return curve
  }

  const createMockConfig = (): BacktestConfig => ({
    name: 'Test Strategy',
    symbols: ['AAPL'],
    initialCapital: 100000,
    allocation: new Map([['AAPL', 1]]),
    strategies: [
      {
        symbol: 'AAPL',
        type: 'rsi',
        parameters: { rsiPeriod: 20 },
      },
    ],
    rebalance: 'monthly',
    rebalanceThreshold: 0.05,
  })

  describe('Sample size scoring', () => {
    it('assigns high score for high trade count', () => {
      const trades = createMockTradeData(150)
      const equityCurve = createMockEquityCurve(300)
      const config = createMockConfig()

      const result = calculateReliability(trades, equityCurve, config)

      expect(result.sampleSize).toBeGreaterThan(80)
      expect(result.issues.some(i => i.code === 'SAMPLE_SIZE_CRITICAL')).toBe(false)
      expect(result.issues.some(i => i.code === 'SAMPLE_SIZE_LOW')).toBe(false)
      expect(result.suggestions).toContain('交易样本充足，结果具有统计意义')
    })

    it('assigns low score for low trade count', () => {
      const trades = createMockTradeData(5)
      const equityCurve = createMockEquityCurve(30)
      const config = createMockConfig()

      const result = calculateReliability(trades, equityCurve, config)

      expect(result.sampleSize).toBeLessThan(50)
      expect(result.issues.some(i => i.code === 'SAMPLE_SIZE_CRITICAL')).toBe(true)
      expect(result.issues.find(i => i.code === 'SAMPLE_SIZE_CRITICAL')?.message).toContain('交易次数过少')
      expect(result.suggestions).toContain('建议增加回测时间范围或选择交易频率更高的标的')
    })

    it('assigns moderate score for moderate trade count', () => {
      const trades = createMockTradeData(20)
      const equityCurve = createMockEquityCurve(100)
      const config = createMockConfig()

      const result = calculateReliability(trades, equityCurve, config)

      expect(result.sampleSize).toBeGreaterThanOrEqual(60)
      expect(result.sampleSize).toBeLessThan(100)
      expect(result.issues.some(i => i.code === 'SAMPLE_SIZE_LOW')).toBe(true)
    })
  })

  describe('Overfitting risk scoring', () => {
    it('penalizes too many parameters', () => {
      const trades = createMockTradeData(50)
      const equityCurve = createMockEquityCurve(100)
      const config: BacktestConfig = {
        ...createMockConfig(),
        strategies: [
          {
            symbol: 'AAPL',
            type: 'rsi',
            parameters: {
              rsiPeriod: 14,
              rsiOverbought: 70,
              rsiOversold: 30,
              macdFast: 12,
              macdSlow: 26,
              macdSignal: 9,
            },
          },
        ],
      }

      const result = calculateReliability(trades, equityCurve, config)

      expect(result.overfittingRisk).toBeLessThan(100)
      expect(result.issues.some(i => i.code === 'TOO_MANY_PARAMETERS')).toBe(true)
    })

    it('flags high complexity ratio', () => {
      const trades = createMockTradeData(20)
      const equityCurve = createMockEquityCurve(50)
      const config: BacktestConfig = {
        ...createMockConfig(),
        strategies: [
          {
            symbol: 'AAPL',
            type: 'rsi',
            parameters: {
              rsiPeriod: 14,
              rsiOverbought: 70,
              rsiOversold: 30,
            },
          },
        ],
      }

      const result = calculateReliability(trades, equityCurve, config)

      expect(result.issues.some(i => i.code === 'HIGH_COMPLEXITY_RATIO')).toBe(true)
    })
  })

  describe('Data quality scoring', () => {
    it('detects insufficient data period', () => {
      const trades = createMockTradeData(10)
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 10000 },
        { date: new Date('2024-02-01'), value: 10500 },
      ]
      const config = createMockConfig()

      const result = calculateReliability(trades, equityCurve, config)

      expect(result.dataQuality).toBeLessThan(100)
      expect(result.issues.some(i => i.code === 'INSUFFICIENT_DATA_PERIOD')).toBe(true)
    })

    it('detects missing data', () => {
      const trades = createMockTradeData(10)
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 10000 },
        { date: new Date('2024-01-02'), value: 10100 },
        { date: new Date('2024-01-10'), value: 10500 },
        { date: new Date('2024-01-11'), value: 10600 },
      ]
      const config = createMockConfig()

      const result = calculateReliability(trades, equityCurve, config)

      expect(result.dataQuality).toBeLessThan(100)
      expect(result.issues.some(i => i.code === 'MISSING_DATA' || i.code === 'SOME_MISSING_DATA')).toBe(true)
    })
  })

  describe('Stability scoring', () => {
    it('detects consecutive losses', () => {
      const trades = createMockTradeData(20)
      const equityCurve: EquityPoint[] = []
      let value = 10000
      for (let i = 0; i < 15; i++) {
        value = value * 0.99
        equityCurve.push({
          date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
          value,
        })
      }
      const config = createMockConfig()

      const result = calculateReliability(trades, equityCurve, config)

      expect(result.issues.some(i => i.code === 'EXTREME_CONSECUTIVE_LOSSES' || i.code === 'MODERATE_CONSECUTIVE_LOSSES')).toBe(true)
    })

    it('calculates skewness correctly', () => {
      const returns = [0.01, 0.02, 0.01, 0.02, 0.01, -0.05, -0.06, 0.01, 0.02, 0.01]
      const skewness = calculateSkewness(returns)

      expect(typeof skewness).toBe('number')
      expect(Math.abs(skewness)).toBeGreaterThan(0)
    })

    it('detects extreme skewness', () => {
      const trades = createMockTradeData(20)
      const equityCurve: EquityPoint[] = []
      let value = 10000
      for (let i = 0; i < 30; i++) {
        if (i === 15) {
          value = value * 1.5
        } else {
          value = value * (1 + (Math.random() - 0.5) * 0.01)
        }
        equityCurve.push({
          date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
          value,
        })
      }
      const config = createMockConfig()

      const result = calculateReliability(trades, equityCurve, config)

      expect(result.stability).toBeLessThan(100)
      expect(result.issues.some(i => i.code === 'EXTREME_SKEWNESS')).toBe(true)
    })
  })

  describe('Utility functions', () => {
    it('calculates years from equity curve', () => {
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 10000 },
        { date: new Date('2025-01-01'), value: 11000 },
      ]

      const years = getYears(equityCurve)

      expect(years).toBeCloseTo(1, 0)
    })

    it('returns 0 years for single point curve', () => {
      const equityCurve: EquityPoint[] = [{ date: new Date('2024-01-01'), value: 10000 }]

      const years = getYears(equityCurve)

      expect(years).toBe(0)
    })

    it('detects missing data correctly', () => {
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 10000 },
        { date: new Date('2024-01-02'), value: 10100 },
        { date: new Date('2024-01-05'), value: 10500 },
      ]

      const missingData = detectMissingData(equityCurve)

      expect(missingData).toBeGreaterThan(0)
      expect(missingData).toBeLessThan(1)
    })

    it('returns 0 for no missing data', () => {
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 10000 },
        { date: new Date('2024-01-02'), value: 10100 },
        { date: new Date('2024-01-03'), value: 10200 },
      ]

      const missingData = detectMissingData(equityCurve)

      expect(missingData).toBe(0)
    })

    it('calculates returns from equity curve', () => {
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 10000 },
        { date: new Date('2024-01-02'), value: 10100 },
        { date: new Date('2024-01-03'), value: 9900 },
      ]

      const returns = calculateReturns(equityCurve)

      expect(returns.length).toBe(2)
      expect(returns[0]).toBeCloseTo(0.01, 2)
      expect(returns[1]).toBeCloseTo(-0.0198, 2)
    })

    it('counts consecutive negative returns', () => {
      const returns = [0.01, -0.02, -0.03, -0.01, 0.02, -0.01, -0.02]

      const count = countConsecutiveNegative(returns)

      expect(count).toBe(3)
    })

    it('returns 0 for no negative returns', () => {
      const returns = [0.01, 0.02, 0.03, 0.01]

      const count = countConsecutiveNegative(returns)

      expect(count).toBe(0)
    })

    it('handles skewness with less than 3 data points', () => {
      const returns = [0.01, 0.02]

      const skewness = calculateSkewness(returns)

      expect(skewness).toBe(0)
    })
  })
})
