import { describe, it, expect } from 'vitest'
import { ScreeningEngine } from '@/lib/factors/screening-engine'
import { FactorLibrary } from '@/lib/factors/factor-library'
import type { ScreeningStrategy } from '@/lib/factors/screening-engine'
import type { HistoricalPrice } from '@/lib/indicators'

describe('ScreeningEngine', () => {
  const factorLibrary = new FactorLibrary()
  const engine = new ScreeningEngine(factorLibrary)

  const mockHistoricalData: HistoricalPrice[] = [
    { date: new Date('2024-01-01'), open: 98, high: 102, low: 97, close: 100, volume: 1000000 },
    { date: new Date('2024-01-02'), open: 100, high: 107, low: 99, close: 105, volume: 1100000 },
    { date: new Date('2024-01-03'), open: 105, high: 112, low: 104, close: 110, volume: 1200000 },
    { date: new Date('2024-01-04'), open: 110, high: 111, low: 106, close: 108, volume: 900000 },
  ]

  const mockGetData = async () => ({
    data: mockHistoricalData,
    symbol: 'TEST',
  })

  it('screens with weighted_sum scoring method', async () => {
    const strategy: ScreeningStrategy = {
      name: 'Test Strategy',
      rules: [
        { factorId: 'rsi_value', operator: '>', value: 30, weight: 1.0 },
      ],
      scoringMethod: 'weighted_sum',
    }
    const results = await engine.screen(strategy, ['AAPL', 'MSFT'], mockGetData)
    expect(results.length).toBe(2)
    results.forEach(r => {
      expect(r.score).toBeGreaterThanOrEqual(0)
    })
  })

  it('screens with threshold_count scoring method', async () => {
    const strategy: ScreeningStrategy = {
      name: 'Threshold Strategy',
      rules: [
        { factorId: 'rsi_value', operator: '>', value: 30, weight: 1.0 },
        { factorId: 'macd_signal', operator: '>', value: 0, weight: 1.0 },
      ],
      scoringMethod: 'threshold_count',
    }
    const results = await engine.screen(strategy, ['AAPL'], mockGetData)
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns ScreeningResult with correct structure', async () => {
    const strategy: ScreeningStrategy = {
      name: 'Simple Strategy',
      rules: [
        { factorId: 'rsi_value', operator: '<', value: 70, weight: 1.0 },
      ],
      scoringMethod: 'weighted_sum',
    }
    const results = await engine.screen(strategy, ['AAPL'], mockGetData)
    expect(results.length).toBe(1)
    const result = results[0]
    expect(result.symbol).toBe('AAPL')
    expect(typeof result.score).toBe('number')
    expect(typeof result.matchedRules).toBe('number')
    expect(typeof result.totalRules).toBe('number')
  })

  it('handles multiple symbols', async () => {
    const strategy: ScreeningStrategy = {
      name: 'Multi Symbol',
      rules: [
        { factorId: 'rsi_value', operator: '>', value: 0, weight: 1.0 },
      ],
      scoringMethod: 'weighted_sum',
    }
    const results = await engine.screen(strategy, ['AAPL', 'MSFT', 'GOOGL'], mockGetData)
    expect(results.length).toBe(3)
  })

  it('handles strategy with no rules', async () => {
    const strategy: ScreeningStrategy = {
      name: 'Empty Strategy',
      rules: [],
      scoringMethod: 'weighted_sum',
    }
    const results = await engine.screen(strategy, ['AAPL'], mockGetData)
    expect(results.length).toBe(1)
    expect(results[0].totalRules).toBe(0)
    expect(results[0].matchedRules).toBe(0)
  })
})
