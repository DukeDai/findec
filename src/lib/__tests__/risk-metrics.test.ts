import { describe, it, expect } from 'vitest'
import { RiskMetricsCalculator, EquityPoint } from '@/lib/backtest/risk-metrics'

function generateEquityCurve(points: number): EquityPoint[] {
  const curve: EquityPoint[] = []
  let value = 100
  for (let i = 0; i < points; i++) {
    value = value * (1 + (Math.random() - 0.45) * 0.04)
    curve.push({ date: new Date(Date.now() - (points - i) * 86400000), value })
  }
  return curve
}

describe('RiskMetricsCalculator', () => {
  const equityCurve: EquityPoint[] = [
    { date: new Date('2024-01-01'), value: 100 },
    { date: new Date('2024-01-15'), value: 105 },
    { date: new Date('2024-02-01'), value: 110 },
    { date: new Date('2024-02-15'), value: 95 },
    { date: new Date('2024-03-01'), value: 100 },
    { date: new Date('2024-03-15'), value: 115 },
  ]

  it('calculates total return correctly', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate(equityCurve)
    expect(result.totalReturn).toBeCloseTo(15, 0)
  })

  it('calculates annualized return', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate(equityCurve)
    expect(result.annualizedReturn).toBeGreaterThan(0)
  })

  it('calculates volatility', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate(equityCurve)
    expect(result.volatility).toBeGreaterThan(0)
  })

  it('calculates annualized volatility', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate(equityCurve)
    expect(result.annualizedVolatility).toBeGreaterThan(result.volatility)
  })

  it('calculates max drawdown', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate(equityCurve)
    expect(result.maxDrawdown).toBeGreaterThan(0)
    expect(result.maxDrawdown).toBeLessThan(20)
  })

  it('calculates Sharpe ratio', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate(equityCurve)
    expect(typeof result.sharpeRatio).toBe('number')
    expect(result.sharpeRatio).not.toBeNaN()
  })

  it('calculates Sortino ratio', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate(equityCurve)
    expect(typeof result.sortinoRatio).toBe('number')
    expect(result.sortinoRatio).not.toBeNaN()
  })

  it('calculates VaR', () => {
    const calculator = new RiskMetricsCalculator()
    const largeCurve = generateEquityCurve(50)
    const result = calculator.calculate(largeCurve)
    expect(result.var95).toBeGreaterThan(0)
  })

  it('calculates expected shortfall', () => {
    const calculator = new RiskMetricsCalculator()
    const largeCurve = generateEquityCurve(50)
    const result = calculator.calculate(largeCurve)
    expect(result.expectedShortfall).toBeGreaterThanOrEqual(result.var95)
  })

  it('handles empty equity curve', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate([])
    expect(result.totalReturn).toBe(0)
    expect(result.sharpeRatio).toBe(0)
  })

  it('handles single point equity curve', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate([{ date: new Date('2024-01-01'), value: 100 }])
    expect(result.totalReturn).toBe(0)
    expect(result.volatility).toBe(0)
  })

  it('calculates calmar ratio', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate(equityCurve)
    expect(typeof result.calmarRatio).toBe('number')
  })
})
