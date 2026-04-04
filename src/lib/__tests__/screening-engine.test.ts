import { describe, it, expect } from 'vitest'
import { ScreeningEngine } from '@/lib/factors/screening-engine'
import { FactorLibrary } from '@/lib/factors/factor-library'
import type { ScreeningStrategy } from '@/lib/factors/screening-engine'

describe('ScreeningEngine', () => {
  const factorLibrary = new FactorLibrary()
  const engine = new ScreeningEngine(factorLibrary)

  const mockGetData = async () => ({
    data: [
      { close: 100 },
      { close: 105 },
      { close: 110 },
      { close: 108 },
    ],
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
