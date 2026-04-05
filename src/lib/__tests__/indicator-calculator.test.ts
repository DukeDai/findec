import { describe, it, expect } from 'vitest'
import { IndicatorCalculator } from '@/lib/indicators/calculator'
import type { HistoricalPrice } from '@/lib/indicators/calculator'

function generatePriceData(count: number, startPrice = 100): HistoricalPrice[] {
  const data: HistoricalPrice[] = []
  let price = startPrice
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * 2
    price = price * (1 + change / 100)
    const open = price * (1 + (Math.random() - 0.5) * 0.5 / 100)
    const high = price * (1 + Math.random() * 0.5 / 100)
    const low = price * (1 - Math.random() * 0.5 / 100)
    data.push({
      date: new Date(Date.now() - (count - i) * 86400000),
      open,
      high,
      low,
      close: price,
      volume: Math.floor(Math.random() * 10000000),
    })
  }
  return data
}

describe('IndicatorCalculator', () => {
  const data30 = generatePriceData(30)
  const data100 = generatePriceData(100)

  it('calculates RSI within valid range', () => {
    const calculator = new IndicatorCalculator()
    const result = calculator.calculate(data30, { rsi: { period: 14 } })
    expect(result.rsi).not.toBeNull()
    expect(result.rsi!.latest).toBeGreaterThanOrEqual(0)
    expect(result.rsi!.latest).toBeLessThanOrEqual(100)
  })

  it('calculates RSI with different periods', () => {
    const calculator = new IndicatorCalculator()
    const result14 = calculator.calculate(data30, { rsi: { period: 14 } })
    const result7 = calculator.calculate(data30, { rsi: { period: 7 } })
    expect(result14.rsi).not.toBeNull()
    expect(result7.rsi).not.toBeNull()
  })

  it('calculates MACD', () => {
    const calculator = new IndicatorCalculator()
    const result = calculator.calculate(data30, {
      macd: { fast: 12, slow: 26, signal: 9 },
    })
    expect(result.macd).not.toBeNull()
    expect(result.macd!.macd).toBeDefined()
    expect(result.macd!.signal).toBeDefined()
    expect(result.macd!.histogram).toBeDefined()
  })

  it('calculates Bollinger Bands', () => {
    const calculator = new IndicatorCalculator()
    const result = calculator.calculate(data30, {
      bollinger: { period: 20, stdDev: 2 },
    })
    expect(result.bollinger).not.toBeNull()
    expect(result.bollinger!.upper).toBeDefined()
    expect(result.bollinger!.middle).toBeDefined()
    expect(result.bollinger!.lower).toBeDefined()
  })

  it('calculates ATR', () => {
    const calculator = new IndicatorCalculator()
    const result = calculator.calculate(data30, { atr: { period: 14 } })
    expect(result.atr).not.toBeNull()
    expect(result.atr!.latest).toBeGreaterThan(0)
  })

  it('returns null latest for RSI when data too short', () => {
    const calculator = new IndicatorCalculator()
    const shortData = generatePriceData(5)
    const result = calculator.calculate(shortData, { rsi: { period: 14 } })
    expect(result.rsi).not.toBeNull()
    expect(result.rsi!.latest).toBeNull()
  })

  it('handles empty data gracefully', () => {
    const calculator = new IndicatorCalculator()
    const result = calculator.calculate([], {})
    expect(result.rsi).not.toBeNull()
    expect(result.rsi!.latest).toBeNull()
    expect(result.macd).not.toBeNull()
  })

  it('calculates multiple indicators together', () => {
    const calculator = new IndicatorCalculator()
    const result = calculator.calculate(data100, {
      ma: [20, 50],
      ema: [20],
      rsi: { period: 14 },
      macd: { fast: 12, slow: 26, signal: 9 },
    })
    expect(result.ma.size).toBe(2)
    expect(result.ema.size).toBe(1)
    expect(result.rsi).not.toBeNull()
    expect(result.macd).not.toBeNull()
  })

  it('handles empty data gracefully', () => {
    const calculator = new IndicatorCalculator()
    const result = calculator.calculate([], {})
    expect(result.rsi).not.toBeNull()
    expect(result.rsi!.latest).toBeNull()
    expect(result.macd).not.toBeNull()
  })

  describe('VWAP', () => {
    it('calculates VWAP with non-zero volume', () => {
      const calculator = new IndicatorCalculator()
      const data: HistoricalPrice[] = [
        { date: new Date('2024-01-01'), open: 100, high: 105, low: 98, close: 102, volume: 1000 },
        { date: new Date('2024-01-02'), open: 102, high: 108, low: 101, close: 105, volume: 2000 },
        { date: new Date('2024-01-03'), open: 105, high: 110, low: 104, close: 108, volume: 3000 },
      ]
      const result = calculator.calculate(data, { vwap: true })
      expect(result.vwap).not.toBeNull()
      expect(result.vwap.length).toBe(3)
      const firstTP = (data[0].high + data[0].low + data[0].close) / 3
      expect(result.vwap[0]).toBeCloseTo(firstTP, 2)
      result.vwap.forEach((v, i) => {
        expect(v).toBeGreaterThanOrEqual(data[i].low)
        expect(v).toBeLessThanOrEqual(data[i].high)
      })
    })

    it('returns aligned length with data when VWAP enabled', () => {
      const calculator = new IndicatorCalculator()
      const result = calculator.calculate(data30, { vwap: true })
      expect(result.vwap.length).toBe(data30.length)
      expect(result.vwap[result.vwap.length - 1]).not.toBeNull()
    })

    it('returns empty array when VWAP disabled', () => {
      const calculator = new IndicatorCalculator()
      const result = calculator.calculate(data30, { vwap: false })
      expect(result.vwap.length).toBe(0)
    })

    it('returns empty array when data is empty', () => {
      const calculator = new IndicatorCalculator()
      const result = calculator.calculate([], { vwap: true })
      expect(result.vwap.length).toBe(0)
    })

    it('VWAP increases with rising prices', () => {
      const calculator = new IndicatorCalculator()
      const data: HistoricalPrice[] = [
        { date: new Date('2024-01-01'), open: 100, high: 102, low: 99, close: 101, volume: 1000 },
        { date: new Date('2024-01-02'), open: 101, high: 103, low: 100, close: 102, volume: 1000 },
        { date: new Date('2024-01-03'), open: 102, high: 104, low: 101, close: 103, volume: 1000 },
        { date: new Date('2024-01-04'), open: 103, high: 105, low: 102, close: 104, volume: 1000 },
      ]
      const result = calculator.calculate(data, { vwap: true })
      const first = result.vwap[0]!
      const last = result.vwap[3]!
      expect(last).toBeGreaterThan(first)
    })
  })
})
