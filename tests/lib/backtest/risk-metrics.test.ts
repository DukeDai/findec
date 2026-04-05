import { describe, it, expect } from 'vitest'
import { RiskMetricsCalculator, EquityPoint, TradeForStats } from '@/lib/backtest/risk-metrics'

describe('RiskMetricsCalculator', () => {
  const calculator = new RiskMetricsCalculator()

  describe('calculate', () => {
    it('should return default metrics for empty equity curve', () => {
      const result = calculator.calculate([])

      expect(result.totalReturn).toBe(0)
      expect(result.sharpeRatio).toBe(0)
      expect(result.maxDrawdown).toBe(0)
    })

    it('should return default metrics for single point equity curve', () => {
      const equityCurve: EquityPoint[] = [{ date: new Date(), value: 100 }]
      const result = calculator.calculate(equityCurve)

      expect(result.totalReturn).toBe(0)
      expect(result.sharpeRatio).toBe(0)
      expect(result.maxDrawdown).toBe(0)
    })

    it('should calculate correct total return', () => {
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 100 },
        { date: new Date('2024-01-02'), value: 110 },
      ]
      const result = calculator.calculate(equityCurve)

      expect(result.totalReturn).toBe(10)
    })

    it('should calculate negative total return', () => {
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 100 },
        { date: new Date('2024-01-02'), value: 90 },
      ]
      const result = calculator.calculate(equityCurve)

      expect(result.totalReturn).toBe(-10)
    })

    it('should calculate max drawdown correctly', () => {
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 100 },
        { date: new Date('2024-01-02'), value: 120 },
        { date: new Date('2024-01-03'), value: 105 },
        { date: new Date('2024-01-04'), value: 115 },
      ]
      const result = calculator.calculate(equityCurve)

      expect(result.maxDrawdown).toBeCloseTo(12.5, 1)
    })

    it('should calculate volatility', () => {
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 100 },
        { date: new Date('2024-01-02'), value: 102 },
        { date: new Date('2024-01-03'), value: 99 },
        { date: new Date('2024-01-04'), value: 101 },
        { date: new Date('2024-01-05'), value: 103 },
      ]
      const result = calculator.calculate(equityCurve)

      expect(result.volatility).toBeGreaterThan(0)
      expect(result.annualizedVolatility).toBeGreaterThan(result.volatility)
    })

    it('should calculate Sharpe ratio', () => {
      const returns = [0.01, 0.02, -0.01, 0.015, 0.01]
      const equityCurve: EquityPoint[] = returns.reduce((acc: EquityPoint[], ret, i) => {
        const prevValue = acc.length > 0 ? acc[acc.length - 1].value : 100
        acc.push({
          date: new Date(2024, 0, i + 1),
          value: prevValue * (1 + ret),
        })
        return acc
      }, [{ date: new Date(2024, 0, 1), value: 100 }])

      const result = calculator.calculate(equityCurve)

      expect(result.sharpeRatio).toBeGreaterThan(0)
    })

    it('should return 0 Sharpe ratio for zero volatility', () => {
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 100 },
        { date: new Date('2024-01-02'), value: 100 },
        { date: new Date('2024-01-03'), value: 100 },
      ]
      const result = calculator.calculate(equityCurve)

      expect(result.sharpeRatio).toBe(0)
    })

    it('should calculate Sortino ratio', () => {
      const returns = [0.02, 0.015, -0.005, 0.01, 0.025]
      const equityCurve: EquityPoint[] = returns.reduce((acc: EquityPoint[], ret, i) => {
        const prevValue = acc.length > 0 ? acc[acc.length - 1].value : 100
        acc.push({
          date: new Date(2024, 0, i + 1),
          value: prevValue * (1 + ret),
        })
        return acc
      }, [{ date: new Date(2024, 0, 1), value: 100 }])

      const result = calculator.calculate(equityCurve)

      expect(result.sortinoRatio).toBeGreaterThanOrEqual(0)
    })

    it('should return Infinity Sortino ratio when no downside', () => {
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 100 },
        { date: new Date('2024-01-02'), value: 101 },
        { date: new Date('2024-01-03'), value: 102 },
        { date: new Date('2024-01-04'), value: 103 },
      ]
      const result = calculator.calculate(equityCurve)

      expect(result.sortinoRatio).toBe(Infinity)
    })

    it('should calculate Calmar ratio', () => {
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 100 },
        { date: new Date('2024-06-01'), value: 130 },
      ]
      const result = calculator.calculate(equityCurve)

      expect(result.calmarRatio).toBeGreaterThan(0)
    })

    it('should calculate VaR95 and VaR99', () => {
      const returns = [0.02, -0.03, 0.01, -0.05, 0.015, 0.01, -0.02, 0.025, -0.01, 0.03]
      const equityCurve: EquityPoint[] = returns.reduce((acc: EquityPoint[], ret, i) => {
        const prevValue = acc.length > 0 ? acc[acc.length - 1].value : 100
        acc.push({
          date: new Date(2024, 0, i + 1),
          value: prevValue * (1 + ret),
        })
        return acc
      }, [{ date: new Date(2024, 0, 1), value: 100 }])

      const result = calculator.calculate(equityCurve)

      expect(result.var95).toBeGreaterThan(0)
      expect(result.var99).toBeGreaterThanOrEqual(result.var95)
    })

    it('should calculate trade statistics', () => {
      const trades: TradeForStats[] = [
        { type: 'BUY', value: 5000 },
        { type: 'SELL', value: 5500 },
        { type: 'BUY', value: 3000 },
        { type: 'SELL', value: 2900 },
      ]

      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 10000 },
        { date: new Date('2024-01-02'), value: 10500 },
      ]

      const result = calculator.calculate(equityCurve, trades)

      expect(result.totalTrades).toBe(2)
      expect(result.winRate).toBe(50)
      expect(result.profitFactor).toBeGreaterThan(0)
    })

    it('should calculate expected shortfall', () => {
      const returns = [0.05, 0.03, 0.01, -0.02, -0.04, 0.02, -0.03, 0.01, 0.04, -0.05]
      const equityCurve: EquityPoint[] = returns.reduce((acc: EquityPoint[], ret, i) => {
        const prevValue = acc.length > 0 ? acc[acc.length - 1].value : 100
        acc.push({
          date: new Date(2024, 0, i + 1),
          value: prevValue * (1 + ret),
        })
        return acc
      }, [{ date: new Date(2024, 0, 1), value: 100 }])

      const result = calculator.calculate(equityCurve)

      expect(result.expectedShortfall).toBeGreaterThan(0)
    })
  })

  describe('calculateRiskAnalysis', () => {
    it('should return default values for empty equity curve', () => {
      const result = calculator.calculateRiskAnalysis([])

      expect(result.omegaRatio).toBe(0)
      expect(result.skewness).toBe(0)
      expect(result.kurtosis).toBe(0)
    })

    it('should calculate omega ratio', () => {
      const returns = [0.03, 0.02, -0.01, 0.015, 0.01]
      const equityCurve: EquityPoint[] = returns.reduce((acc: EquityPoint[], ret, i) => {
        const prevValue = acc.length > 0 ? acc[acc.length - 1].value : 100
        acc.push({
          date: new Date(2024, 0, i + 1),
          value: prevValue * (1 + ret),
        })
        return acc
      }, [{ date: new Date(2024, 0, 1), value: 100 }])

      const result = calculator.calculateRiskAnalysis(equityCurve)

      expect(result.omegaRatio).toBeGreaterThan(0)
    })

    it('should calculate skewness', () => {
      const returns = [0.05, 0.02, -0.03, 0.04, -0.01, 0.03, -0.02, 0.01]
      const equityCurve: EquityPoint[] = returns.reduce((acc: EquityPoint[], ret, i) => {
        const prevValue = acc.length > 0 ? acc[acc.length - 1].value : 100
        acc.push({
          date: new Date(2024, 0, i + 1),
          value: prevValue * (1 + ret),
        })
        return acc
      }, [{ date: new Date(2024, 0, 1), value: 100 }])

      const result = calculator.calculateRiskAnalysis(equityCurve)

      expect(result.skewness).toBeDefined()
    })

    it('should calculate kurtosis', () => {
      const returns = [0.05, 0.02, -0.03, 0.04, -0.01, 0.03, -0.02, 0.01]
      const equityCurve: EquityPoint[] = returns.reduce((acc: EquityPoint[], ret, i) => {
        const prevValue = acc.length > 0 ? acc[acc.length - 1].value : 100
        acc.push({
          date: new Date(2024, 0, i + 1),
          value: prevValue * (1 + ret),
        })
        return acc
      }, [{ date: new Date(2024, 0, 1), value: 100 }])

      const result = calculator.calculateRiskAnalysis(equityCurve)

      expect(result.kurtosis).toBeDefined()
    })

    it('should calculate drawdown analysis', () => {
      const equityCurve: EquityPoint[] = [
        { date: new Date('2024-01-01'), value: 100 },
        { date: new Date('2024-01-02'), value: 110 },
        { date: new Date('2024-01-03'), value: 105 },
        { date: new Date('2024-01-04'), value: 115 },
        { date: new Date('2024-01-05'), value: 100 },
        { date: new Date('2024-01-06'), value: 120 },
      ]

      const result = calculator.calculateRiskAnalysis(equityCurve)

      expect(result.drawdownAnalysis.drawdownEvents).toBeDefined()
      expect(Array.isArray(result.drawdownAnalysis.drawdownEvents)).toBe(true)
    })
  })

  describe('calculateBenchmarkComparison', () => {
    it('should return default values for insufficient data', () => {
      const result = calculator.calculateBenchmarkComparison([0.01], [0.015])

      expect(result.alpha).toBe(0)
      expect(result.beta).toBe(1)
    })

    it('should calculate beta', () => {
      const portfolioReturns = [0.01, 0.02, -0.01, 0.015, 0.01]
      const benchmarkReturns = [0.008, 0.018, -0.008, 0.012, 0.009]

      const result = calculator.calculateBenchmarkComparison(portfolioReturns, benchmarkReturns)

      expect(result.beta).toBeGreaterThan(0)
    })

    it('should calculate alpha', () => {
      const portfolioReturns = [0.015, 0.025, -0.005, 0.02, 0.015]
      const benchmarkReturns = [0.008, 0.018, -0.008, 0.012, 0.009]

      const result = calculator.calculateBenchmarkComparison(portfolioReturns, benchmarkReturns)

      expect(result.alpha).toBeDefined()
    })

    it('should calculate correlation', () => {
      const portfolioReturns = [0.01, 0.02, -0.01, 0.015, 0.01, 0.008, 0.012, -0.005]
      const benchmarkReturns = [0.008, 0.018, -0.008, 0.012, 0.009, 0.007, 0.011, -0.004]

      const result = calculator.calculateBenchmarkComparison(portfolioReturns, benchmarkReturns)

      expect(result.correlation).toBeGreaterThan(0)
      expect(result.correlation).toBeLessThanOrEqual(1)
    })

    it('should calculate R-squared', () => {
      const portfolioReturns = [0.01, 0.02, -0.01, 0.015, 0.01, 0.008, 0.012, -0.005]
      const benchmarkReturns = [0.008, 0.018, -0.008, 0.012, 0.009, 0.007, 0.011, -0.004]

      const result = calculator.calculateBenchmarkComparison(portfolioReturns, benchmarkReturns)

      expect(result.rSquared).toBeGreaterThan(0)
      expect(result.rSquared).toBeLessThanOrEqual(1)
    })

    it('should calculate tracking error', () => {
      const portfolioReturns = [0.01, 0.02, -0.01, 0.015, 0.01, 0.008, 0.012, -0.005]
      const benchmarkReturns = [0.008, 0.018, -0.008, 0.012, 0.009, 0.007, 0.011, -0.004]

      const result = calculator.calculateBenchmarkComparison(portfolioReturns, benchmarkReturns)

      expect(result.trackingError).toBeGreaterThan(0)
    })

    it('should calculate information ratio', () => {
      const portfolioReturns = [0.015, 0.025, -0.005, 0.02, 0.015, 0.012, 0.018, -0.003]
      const benchmarkReturns = [0.008, 0.018, -0.008, 0.012, 0.009, 0.007, 0.011, -0.004]

      const result = calculator.calculateBenchmarkComparison(portfolioReturns, benchmarkReturns)

      expect(result.informationRatio).toBeDefined()
    })
  })
})
