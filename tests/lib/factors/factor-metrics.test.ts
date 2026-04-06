import { describe, it, expect } from 'vitest'
import {
  FactorMetricsCalculator,
  FactorMetricsPoint,
} from '@/lib/factors/factor-metrics'
import { generateFactorValues } from '../utils/mock-data-generator'

describe('FactorMetricsCalculator', () => {
  const calculator = new FactorMetricsCalculator()

  describe('calculateIC (Pearson IC)', () => {
    it('calculates IC for perfectly correlated data', () => {
      const values = [1, 2, 3, 4, 5]
      const returns = [0.1, 0.2, 0.3, 0.4, 0.5]
      const ic = calculator.calculateIC(values, returns)
      expect(ic).toBeCloseTo(1, 5)
    })

    it('calculates IC for negatively correlated data', () => {
      const values = [1, 2, 3, 4, 5]
      const returns = [0.5, 0.4, 0.3, 0.2, 0.1]
      const ic = calculator.calculateIC(values, returns)
      expect(ic).toBeCloseTo(-1, 5)
    })

    it('returns 0 for uncorrelated data', () => {
      const values = [1, 1, 1, 1, 1]
      const returns = [0.1, 0.2, 0.3, 0.4, 0.5]
      const ic = calculator.calculateIC(values, returns)
      expect(ic).toBe(0)
    })

    it('returns 0 for insufficient data', () => {
      const ic = calculator.calculateIC([1], [0.1])
      expect(ic).toBe(0)
    })

    it('returns 0 for mismatched array lengths', () => {
      const ic = calculator.calculateIC([1, 2, 3], [0.1, 0.2])
      expect(ic).toBe(0)
    })

    it('handles zero variance in values', () => {
      const values = [5, 5, 5, 5, 5]
      const returns = [0.1, 0.2, 0.3, 0.4, 0.5]
      const ic = calculator.calculateIC(values, returns)
      expect(ic).toBe(0)
    })

    it('handles zero variance in returns', () => {
      const values = [1, 2, 3, 4, 5]
      const returns = [0.3, 0.3, 0.3, 0.3, 0.3]
      const ic = calculator.calculateIC(values, returns)
      expect(ic).toBe(0)
    })
  })

  describe('calculateRankIC (Spearman IC)', () => {
    it('calculates rank IC correctly', () => {
      const { values, returns } = generateFactorValues(20, 0.7)
      const rankIC = calculator.calculateRankIC(values, returns)
      expect(rankIC).not.toBeNaN()
      expect(Math.abs(rankIC)).toBeLessThanOrEqual(1)
    })

    it('handles tied ranks', () => {
      const values = [1, 1, 2, 3, 4]
      const returns = [0.1, 0.1, 0.2, 0.3, 0.4]
      const rankIC = calculator.calculateRankIC(values, returns)
      expect(rankIC).not.toBeNaN()
    })

    it('returns 0 for insufficient data', () => {
      const rankIC = calculator.calculateRankIC([1], [0.1])
      expect(rankIC).toBe(0)
    })

    it('returns 0 for mismatched lengths', () => {
      const rankIC = calculator.calculateRankIC([1, 2, 3], [0.1, 0.2])
      expect(rankIC).toBe(0)
    })
  })

  describe('calculatePerformance', () => {
    it('calculates complete factor performance metrics', () => {
      const history: FactorMetricsPoint[] = []
      for (let i = 0; i < 50; i++) {
        history.push({
          date: new Date(2024, 0, i + 1),
          value: Math.random() - 0.5,
          forwardReturn: (Math.random() - 0.4) * 0.1,
        })
      }

      const performance = calculator.calculatePerformance('test_factor', history)
      expect(performance.factorId).toBe('test_factor')
      expect(performance.ic).not.toBeNaN()
      expect(performance.icMean).not.toBeNaN()
      expect(performance.icIr).not.toBeNaN()
      expect(performance.positiveRatio).toBeGreaterThanOrEqual(0)
      expect(performance.positiveRatio).toBeLessThanOrEqual(1)
      expect(performance.observations).toBe(50)
    })

    it('returns defaults for insufficient history', () => {
      const history: FactorMetricsPoint[] = [
        { date: new Date(), value: 0.5, forwardReturn: 0.02 },
      ]
      const performance = calculator.calculatePerformance('test', history)
      expect(performance.ic).toBe(0)
      expect(performance.icIr).toBe(0)
      expect(performance.observations).toBe(1)
    })

    it('returns defaults for empty history', () => {
      const performance = calculator.calculatePerformance('test', [])
      expect(performance.ic).toBe(0)
      expect(performance.icIr).toBe(0)
      expect(performance.observations).toBe(0)
    })

    it('calculates period for sufficient history', () => {
      const history: FactorMetricsPoint[] = []
      for (let i = 0; i < 10; i++) {
        const date = new Date(2024, 0, i + 1)
        history.push({
          date,
          value: Math.random() - 0.5,
          forwardReturn: (Math.random() - 0.4) * 0.1,
        })
      }
      const performance = calculator.calculatePerformance('test', history)
      expect(performance.period.length).toBeGreaterThan(0)
    })
  })

  describe('analyzeDecay', () => {
    it('calculates decay curve and half-life', () => {
      const { values, returns } = generateFactorValues(100, 0.5)
      const decay = calculator.analyzeDecay(values, returns)
      expect(decay.decayCurve.length).toBeGreaterThan(1)
      expect(decay.halfLife).toBeGreaterThanOrEqual(0)
    })

    it('handles short data gracefully', () => {
      const values = [1, 2, 3]
      const returns = [0.1, 0.2, 0.3]
      const decay = calculator.analyzeDecay(values, returns)
      expect(decay.decayCurve).toHaveLength(1)
      expect(decay.halfLife).toBe(0)
    })

    it('handles data with no correlation', () => {
      const values: number[] = []
      const returns: number[] = []
      for (let i = 0; i < 50; i++) {
        values.push(Math.random())
        returns.push(Math.random())
      }
      const decay = calculator.analyzeDecay(values, returns)
      expect(decay.decayCurve.length).toBeGreaterThan(0)
    })

    it('decay curve values are normalized', () => {
      const { values, returns } = generateFactorValues(100, 0.5)
      const decay = calculator.analyzeDecay(values, returns)
      expect(decay.decayCurve[0]).toBeLessThanOrEqual(1)
      expect(decay.decayCurve[0]).toBeGreaterThanOrEqual(0)
    })
  })

  describe('calculateTurnover', () => {
    it('calculates turnover between factor rankings', () => {
      const current = new Map([
        ['AAPL', 0.9],
        ['MSFT', 0.8],
        ['GOOGL', 0.7],
        ['AMZN', 0.6],
        ['TSLA', 0.5],
      ])
      const previous = new Map([
        ['MSFT', 0.9],
        ['AAPL', 0.8],
        ['GOOGL', 0.7],
        ['META', 0.6],
        ['NVDA', 0.5],
      ])

      const turnover = calculator.calculateTurnover(current, previous, 5)
      expect(turnover).toBeGreaterThan(0)
      expect(turnover).toBeLessThanOrEqual(1)
    })

    it('returns 0 for identical rankings', () => {
      const factors = new Map([
        ['AAPL', 0.9],
        ['MSFT', 0.8],
      ])
      const turnover = calculator.calculateTurnover(factors, factors, 2)
      expect(turnover).toBe(0)
    })

    it('returns 0 for empty factors', () => {
      const turnover = calculator.calculateTurnover(new Map(), new Map(), 10)
      expect(turnover).toBe(0)
    })

    it('returns higher turnover for different rankings', () => {
      const current = new Map([
        ['A', 0.9],
        ['B', 0.8],
        ['C', 0.7],
        ['D', 0.6],
        ['E', 0.5],
      ])
      const previous = new Map([
        ['F', 0.9],
        ['G', 0.8],
        ['H', 0.7],
        ['I', 0.6],
        ['J', 0.5],
      ])
      const turnover = calculator.calculateTurnover(current, previous, 5)
      expect(turnover).toBe(1)
    })
  })

  describe('calculateInformationCoefficient', () => {
    it('returns both Pearson and Spearman IC', () => {
      const { values, returns } = generateFactorValues(30, 0.6)
      const result = calculator.calculateInformationCoefficient(values, returns)
      expect(result.pearson).not.toBeNaN()
      expect(result.spearman).not.toBeNaN()
      expect(Math.abs(result.pearson)).toBeLessThanOrEqual(1)
      expect(Math.abs(result.spearman)).toBeLessThanOrEqual(1)
    })

    it('Pearson IC matches calculateIC', () => {
      const values = [1, 2, 3, 4, 5]
      const returns = [0.1, 0.2, 0.3, 0.4, 0.5]
      const result = calculator.calculateInformationCoefficient(values, returns)
      expect(result.pearson).toBeCloseTo(1, 5)
    })
  })

  describe('edge cases', () => {
    it('handles very large numbers', () => {
      const values = [1e10, 2e10, 3e10, 4e10, 5e10]
      const returns = [0.1, 0.2, 0.3, 0.4, 0.5]
      const ic = calculator.calculateIC(values, returns)
      expect(ic).toBeCloseTo(1, 5)
    })

    it('handles very small numbers', () => {
      const values = [1e-10, 2e-10, 3e-10, 4e-10, 5e-10]
      const returns = [0.1, 0.2, 0.3, 0.4, 0.5]
      const ic = calculator.calculateIC(values, returns)
      expect(ic).toBeCloseTo(1, 5)
    })
  })
})
