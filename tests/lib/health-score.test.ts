import { describe, it, expect } from 'vitest'
import { calculatePortfolioHealthScore } from '@/lib/portfolio/health-score'
import type { HoldingData, PriceData } from '@/lib/portfolio/health-score'

describe('Portfolio Health Score', () => {
  const createMockPriceData = (count: number, basePrice: number = 100): PriceData[] => {
    const data: PriceData[] = []
    for (let i = 0; i < count; i++) {
      data.push({
        date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        close: basePrice + (Math.random() - 0.5) * 10,
        volume: 1000000 + Math.random() * 500000,
      })
    }
    return data
  }

  const createMockHolding = (
    symbol: string,
    quantity: number,
    price: number,
    dataPoints: number = 30
  ): HoldingData => {
    return {
      symbol,
      quantity,
      currentPrice: price,
      historicalData: createMockPriceData(dataPoints, price),
    }
  }

  describe('Score calculation for different portfolio states', () => {
    it('calculates score for balanced multi-stock portfolio', () => {
      const holdings = [
        createMockHolding('AAPL', 100, 150),
        createMockHolding('MSFT', 100, 150),
        createMockHolding('GOOGL', 100, 150),
        createMockHolding('AMZN', 100, 150),
        createMockHolding('TSLA', 100, 150),
      ]
      const portfolioValue = 75000

      const result = calculatePortfolioHealthScore(holdings, portfolioValue)

      expect(result.total).toBeGreaterThanOrEqual(0)
      expect(result.total).toBeLessThanOrEqual(100)
      expect(result.concentration.score).toBeGreaterThanOrEqual(0)
      expect(result.volatility.score).toBeGreaterThanOrEqual(0)
      expect(result.correlation.score).toBeGreaterThanOrEqual(0)
      expect(result.liquidity.score).toBeGreaterThanOrEqual(0)
      expect(result.riskAdjustedReturn.score).toBeGreaterThanOrEqual(0)
    })

    it('calculates score for concentrated portfolio', () => {
      const holdings = [
        createMockHolding('AAPL', 400, 150),
        createMockHolding('MSFT', 100, 150),
      ]
      const portfolioValue = 75000

      const result = calculatePortfolioHealthScore(holdings, portfolioValue)

      expect(result.concentration.topHoldingWeight).toBeGreaterThan(0.5)
      expect(result.concentration.score).toBeLessThan(50)
      expect(result.suggestions).toContain('建议分散持仓，单一股票权重不超过20%')
    })

    it('calculates score for evenly distributed portfolio', () => {
      const holdings = [
        createMockHolding('AAPL', 100, 100),
        createMockHolding('MSFT', 100, 100),
        createMockHolding('GOOGL', 100, 100),
        createMockHolding('AMZN', 100, 100),
      ]
      const portfolioValue = 40000

      const result = calculatePortfolioHealthScore(holdings, portfolioValue)

      expect(result.concentration.topHoldingWeight).toBe(0.25)
      expect(result.concentration.score).toBeGreaterThan(60)
    })
  })

  describe('Boundary conditions', () => {
    it('handles empty portfolio', () => {
      const result = calculatePortfolioHealthScore([], 0)

      expect(result.total).toBe(0)
      expect(result.concentration.score).toBe(0)
      expect(result.volatility.score).toBe(0)
      expect(result.correlation.score).toBe(0)
      expect(result.liquidity.score).toBe(0)
      expect(result.riskAdjustedReturn.score).toBe(0)
      expect(result.breakdown).toBe('数据不足：组合为空')
      expect(result.suggestions).toContain('请添加持仓以计算健康度评分')
    })

    it('handles single stock portfolio', () => {
      const holdings = [createMockHolding('AAPL', 100, 150, 50)]
      const portfolioValue = 15000

      const result = calculatePortfolioHealthScore(holdings, portfolioValue)

      expect(result.concentration.topHoldingWeight).toBe(1)
      expect(result.concentration.score).toBe(0)
      expect(result.breakdown).toContain('单一持仓')
      expect(result.suggestions).toContain('建议分散持仓，单一股票权重不超过20%')
    })

    it('handles portfolio with insufficient historical data', () => {
      const holdings = [
        createMockHolding('AAPL', 100, 150, 2),
      ]
      const portfolioValue = 15000

      const result = calculatePortfolioHealthScore(holdings, portfolioValue)

      expect(result.volatility.score).toBeGreaterThanOrEqual(0)
      expect(result.riskAdjustedReturn.score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Each dimension scoring', () => {
    it('calculates concentration dimension correctly', () => {
      const holdings = [
        createMockHolding('AAPL', 100, 150),
        createMockHolding('MSFT', 100, 150),
        createMockHolding('GOOGL', 100, 150),
        createMockHolding('AMZN', 100, 150),
        createMockHolding('TSLA', 100, 150),
      ]
      const portfolioValue = 75000

      const result = calculatePortfolioHealthScore(holdings, portfolioValue)

      expect(result.concentration.topHoldingWeight).toBe(0.2)
      expect(result.concentration.top5Weight).toBe(1)
      expect(result.concentration.score).toBeGreaterThan(60)
    })

    it('calculates volatility dimension correctly', () => {
      const holdings = [
        createMockHolding('AAPL', 100, 150, 30),
        createMockHolding('MSFT', 100, 150, 30),
      ]
      const portfolioValue = 30000

      const result = calculatePortfolioHealthScore(holdings, portfolioValue)

      expect(result.volatility.portfolioVol).toBeGreaterThanOrEqual(0)
      expect(result.volatility.score).toBeGreaterThanOrEqual(0)
      expect(result.volatility.score).toBeLessThanOrEqual(100)
    })

    it('calculates correlation dimension correctly', () => {
      const holdings = [
        createMockHolding('AAPL', 100, 150),
        createMockHolding('MSFT', 100, 150),
      ]
      const portfolioValue = 30000

      const result = calculatePortfolioHealthScore(holdings, portfolioValue)

      expect(result.correlation.avgCorrelation).toBeGreaterThanOrEqual(-1)
      expect(result.correlation.avgCorrelation).toBeLessThanOrEqual(1)
      expect(result.correlation.score).toBeGreaterThanOrEqual(0)
    })

    it('calculates liquidity dimension correctly', () => {
      const holdings = [
        createMockHolding('AAPL', 100, 150),
        createMockHolding('MSFT', 100, 150),
      ]
      const portfolioValue = 30000

      const result = calculatePortfolioHealthScore(holdings, portfolioValue)

      expect(result.liquidity.avgVolume).toBeGreaterThan(0)
      expect(result.liquidity.score).toBeGreaterThanOrEqual(0)
      expect(result.liquidity.score).toBeLessThanOrEqual(100)
    })

    it('calculates risk-adjusted return dimension correctly', () => {
      const holdings = [
        createMockHolding('AAPL', 100, 150, 30),
        createMockHolding('MSFT', 100, 150, 30),
      ]
      const portfolioValue = 30000

      const result = calculatePortfolioHealthScore(holdings, portfolioValue)

      expect(typeof result.riskAdjustedReturn.sharpeRatio).toBe('number')
      expect(result.riskAdjustedReturn.score).toBeGreaterThanOrEqual(0)
      expect(result.riskAdjustedReturn.score).toBeLessThanOrEqual(100)
    })
  })

  describe('Suggestions generation', () => {
    it('generates appropriate suggestions for poor portfolio', () => {
      const holdings = [
        createMockHolding('AAPL', 500, 150, 30),
      ]
      const portfolioValue = 75000

      const result = calculatePortfolioHealthScore(holdings, portfolioValue)

      expect(result.suggestions.length).toBeGreaterThan(0)
      expect(result.suggestions.some(s => s.includes('分散'))).toBe(true)
    })

    it('generates positive suggestion for healthy portfolio', () => {
      const holdings = [
        createMockHolding('AAPL', 100, 150, 30),
        createMockHolding('MSFT', 100, 150, 30),
        createMockHolding('GOOGL', 100, 150, 30),
        createMockHolding('AMZN', 100, 150, 30),
        createMockHolding('TSLA', 100, 150, 30),
      ]
      const portfolioValue = 75000

      const result = calculatePortfolioHealthScore(holdings, portfolioValue)

      expect(result.suggestions.length).toBeGreaterThan(0)
      if (result.total >= 80) {
        expect(result.suggestions).toContain('组合配置合理，继续保持当前策略')
      } else {
        expect(result.suggestions.some(s => s.includes('建议') || s.includes('优化') || s.includes('配置'))).toBe(true)
      }
    })
  })
})
