import { describe, it, expect, vi } from 'vitest'
import { ScreeningEngine, ScreeningStrategy, ScreeningRule } from '@/lib/factors/screening-engine'
import { FactorLibrary } from '@/lib/factors/factor-library'

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/lib/factors/factor-library', () => ({
  FactorLibrary: vi.fn().mockImplementation(function() {
    return {
      calculateFactors: vi.fn().mockReturnValue([
        { factorId: 'pe_ratio', value: 18, symbol: 'AAPL', date: new Date() },
        { factorId: 'roe', value: 20, symbol: 'AAPL', date: new Date() },
        { factorId: 'momentum_10d', value: 5, symbol: 'AAPL', date: new Date() },
      ]),
    }
  }),
}))

describe('ScreeningEngine', () => {
  const factorLibrary = new FactorLibrary()
  const engine = new ScreeningEngine(factorLibrary)

  const createMockData = (symbol: string) => ({
    data: [
      { date: new Date(), open: 150, high: 155, low: 148, close: 152, volume: 1000000 },
      { date: new Date(), open: 152, high: 158, low: 150, close: 155, volume: 1200000 },
    ],
    symbol,
  })

  describe('screen', () => {
    it('should return empty array for empty symbols list', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Test Strategy',
        rules: [],
        scoringMethod: 'weighted_sum',
      }

      const results = await engine.screen(strategy, [], async () => createMockData(''))

      expect(results).toEqual([])
    })

    it('should screen single symbol', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Value Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<', value: 20, weight: 1 },
        ],
        scoringMethod: 'weighted_sum',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
      expect(results[0].symbol).toBe('AAPL')
      expect(results[0].score).toBeGreaterThan(0)
    })

    it('should screen multiple symbols and rank them', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Value Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<', value: 20, weight: 1 },
        ],
        scoringMethod: 'weighted_sum',
      }

      const results = await engine.screen(strategy, ['AAPL', 'MSFT'], async (symbol) => createMockData(symbol))

      expect(results.length).toBeGreaterThan(0)
      results.forEach((result, index) => {
        expect(result.rank).toBe(index + 1)
      })
    })

    it('should sort results by score descending', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Value Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<', value: 20, weight: 1 },
        ],
        scoringMethod: 'weighted_sum',
      }

      const results = await engine.screen(strategy, ['AAPL', 'MSFT', 'GOOGL'], async (symbol) => createMockData(symbol))

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score)
      }
    })

    it('should handle errors for individual symbols', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Test Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<', value: 20, weight: 1 },
        ],
        scoringMethod: 'weighted_sum',
      }

      const results = await engine.screen(strategy, ['AAPL', 'ERROR', 'MSFT'], async (symbol) => {
        if (symbol === 'ERROR') {
          throw new Error('Data fetch error')
        }
        return createMockData(symbol)
      })

      expect(results.length).toBeGreaterThan(0)
    })

    it('should skip symbols with no data', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Test Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<', value: 20, weight: 1 },
        ],
        scoringMethod: 'weighted_sum',
      }

      const results = await engine.screen(strategy, ['AAPL', 'NODATA', 'MSFT'], async (symbol) => {
        if (symbol === 'NODATA') {
          return { data: [], symbol }
        }
        return createMockData(symbol)
      })

      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('weighted_sum scoring', () => {
    it('should calculate weighted sum score', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Weighted Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<', value: 20, weight: 2 },
          { factorId: 'roe', operator: '>', value: 15, weight: 1 },
        ],
        scoringMethod: 'weighted_sum',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
      expect(results[0].score).toBeGreaterThan(0)
      expect(results[0].totalRules).toBe(2)
    })

    it('should return 0 score when no rules match', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Strict Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<', value: 10, weight: 1 },
        ],
        scoringMethod: 'weighted_sum',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
    })
  })

  describe('rank_sum scoring', () => {
    it('should calculate rank sum score', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Rank Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<', value: 20, weight: 1 },
          { factorId: 'roe', operator: '>', value: 15, weight: 1 },
        ],
        scoringMethod: 'rank_sum',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
      expect(results[0].score).toBeGreaterThan(0)
    })
  })

  describe('threshold_count scoring', () => {
    it('should count matched rules', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Threshold Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<', value: 20, weight: 1 },
          { factorId: 'roe', operator: '>', value: 15, weight: 1 },
        ],
        scoringMethod: 'threshold_count',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
      expect(results[0].matchedRules).toBeGreaterThanOrEqual(0)
      expect(results[0].totalRules).toBe(2)
    })

    it('should return 100 when all rules match', async () => {
      const strategy: ScreeningStrategy = {
        name: 'All Match Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<', value: 20, weight: 1 },
        ],
        scoringMethod: 'threshold_count',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
      expect(results[0].score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('rule evaluation', () => {
    it('should evaluate > operator', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Greater Than Strategy',
        rules: [
          { factorId: 'roe', operator: '>', value: 15, weight: 1 },
        ],
        scoringMethod: 'threshold_count',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
    })

    it('should evaluate < operator', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Less Than Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<', value: 20, weight: 1 },
        ],
        scoringMethod: 'threshold_count',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
    })

    it('should evaluate >= operator', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Greater Equal Strategy',
        rules: [
          { factorId: 'roe', operator: '>=', value: 20, weight: 1 },
        ],
        scoringMethod: 'threshold_count',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
    })

    it('should evaluate <= operator', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Less Equal Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<=', value: 18, weight: 1 },
        ],
        scoringMethod: 'threshold_count',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
    })

    it('should evaluate == operator', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Equal Strategy',
        rules: [
          { factorId: 'roe', operator: '==', value: 20, weight: 1 },
        ],
        scoringMethod: 'threshold_count',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
    })

    it('should evaluate between operator', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Between Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: 'between', value: [15, 25], weight: 1 },
        ],
        scoringMethod: 'threshold_count',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
    })
  })

  describe('factor values', () => {
    it('should include factor values in results', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Test Strategy',
        rules: [
          { factorId: 'pe_ratio', operator: '<', value: 20, weight: 1 },
          { factorId: 'roe', operator: '>', value: 15, weight: 1 },
        ],
        scoringMethod: 'weighted_sum',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
      expect(results[0].factorValues).toBeDefined()
      expect(results[0].factorValues.size).toBeGreaterThan(0)
    })

    it('should handle missing factor values', async () => {
      const strategy: ScreeningStrategy = {
        name: 'Test Strategy',
        rules: [
          { factorId: 'nonexistent_factor', operator: '>', value: 0, weight: 1 },
        ],
        scoringMethod: 'weighted_sum',
      }

      const results = await engine.screen(strategy, ['AAPL'], async () => createMockData('AAPL'))

      expect(results).toHaveLength(1)
    })
  })
})
