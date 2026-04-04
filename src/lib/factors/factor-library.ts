import {
  SMA,
  RSI,
  MACD,
  BollingerBands,
  Stochastic,
} from 'technicalindicators'
import { HistoricalPrice } from '@/lib/indicators'

export interface FactorDefinition {
  id: string
  name: string
  category: 'technical' | 'fundamental' | 'sentiment'
  description: string
  interpretation: string
}

export interface FactorValue {
  factorId: string
  symbol: string
  date: Date
  value: number
  rank?: number
  zscore?: number
}

export type DataPoint = HistoricalPrice

export const TECHNICAL_FACTORS: FactorDefinition[] = [
  {
    id: 'ma20_position',
    name: 'MA20位置',
    category: 'technical',
    description: 'Price position relative to 20-day moving average (percentage)',
    interpretation: 'Positive = above MA, Negative = below MA',
  },
  {
    id: 'ma50_position',
    name: 'MA50位置',
    category: 'technical',
    description: 'Price position relative to 50-day moving average (percentage)',
    interpretation: 'Positive = above MA, Negative = below MA',
  },
  {
    id: 'rsi_14',
    name: 'RSI(14)',
    category: 'technical',
    description: '14-day Relative Strength Index',
    interpretation: '>70 overbought, <30 oversold',
  },
  {
    id: 'macd_signal',
    name: 'MACD信号',
    category: 'technical',
    description: 'MACD histogram value',
    interpretation: 'Positive = bullish, Negative = bearish',
  },
  {
    id: 'bollinger_position',
    name: '布林带位置',
    category: 'technical',
    description: 'Price position within Bollinger Bands (0-100)',
    interpretation: '<20 oversold, >80 overbought',
  },
  {
    id: 'momentum_10d',
    name: '10日动量',
    category: 'technical',
    description: '10-day price change percentage',
    interpretation: 'Positive = upward momentum, Negative = downward momentum',
  },
  {
    id: 'volatility_20d',
    name: '20日波动率',
    category: 'technical',
    description: '20-day annualized volatility (standard deviation of returns)',
    interpretation: 'High volatility = high risk environment',
  },
  {
    id: 'atr_ratio',
    name: 'ATR比率',
    category: 'technical',
    description: 'Average True Range as percentage of price',
    interpretation: 'Higher value = more volatility',
  },
  {
    id: 'price_volume_trend',
    name: '价量趋势',
    category: 'technical',
    description: 'Volume-weighted momentum indicator (Price Volume Trend)',
    interpretation: 'Positive = money flowing in',
  },
  {
    id: 'stoch_k',
    name: '随机K值',
    category: 'technical',
    description: '14-day Stochastic Oscillator %K value',
    interpretation: '>80 overbought, <20 oversold',
  },
]

export class FactorLibrary {
  private factors: Map<string, FactorDefinition>

  constructor() {
    this.factors = new Map()
    TECHNICAL_FACTORS.forEach(factor => {
      this.factors.set(factor.id, factor)
    })
  }

  getFactor(id: string): FactorDefinition | null {
    return this.factors.get(id) || null
  }

  getAllFactors(): FactorDefinition[] {
    return Array.from(this.factors.values())
  }

  getFactorsByCategory(category: string): FactorDefinition[] {
    return this.getAllFactors().filter(f => f.category === category)
  }

  calculateFactors(
    data: DataPoint[],
    symbol: string = '',
    date: Date = new Date()
  ): FactorValue[] {
    const results: FactorValue[] = []

    for (const factor of this.getAllFactors()) {
      const value = this.calculateFactor(factor.id, data)
      if (value !== null) {
        results.push({
          factorId: factor.id,
          symbol,
          date,
          value,
        })
      }
    }

    return results
  }

  calculateFactor(factorId: string, data: DataPoint[]): number | null {
    if (data.length === 0) return null

    const closes = data.map(d => d.close)
    const highs = data.map(d => d.high)
    const lows = data.map(d => d.low)
    const volumes = data.map(d => d.volume)

    switch (factorId) {
      case 'ma20_position':
        return this.calculateMAPosition(closes, 20)
      case 'ma50_position':
        return this.calculateMAPosition(closes, 50)
      case 'rsi_14':
        return this.calculateRSI(closes, 14)
      case 'macd_signal':
        return this.calculateMACDSignal(closes)
      case 'bollinger_position':
        return this.calculateBollingerPosition(closes)
      case 'momentum_10d':
        return this.calculateMomentum(closes, 10)
      case 'volatility_20d':
        return this.calculateVolatility(closes, 20)
      case 'atr_ratio':
        return this.calculateATRRatio(data)
      case 'price_volume_trend':
        return this.calculatePVT(closes, volumes)
      case 'stoch_k':
        return this.calculateStochK(highs, lows, closes)
      default:
        return null
    }
  }

  private calculateMAPosition(closes: number[], period: number): number | null {
    if (closes.length < period) return null
    const maValues = SMA.calculate({ values: closes, period })
    if (maValues.length === 0) return null
    const lastClose = closes[closes.length - 1]
    const lastMA = maValues[maValues.length - 1]
    return ((lastClose - lastMA) / lastClose) * 100
  }

  private calculateRSI(closes: number[], period: number): number | null {
    if (closes.length <= period) return null
    const rsiValues = RSI.calculate({ values: closes, period })
    return rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null
  }

  private calculateMACDSignal(closes: number[]): number | null {
    if (closes.length < 26) return null
    const macdResult = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    })
    return macdResult.length > 0 ? macdResult[macdResult.length - 1].histogram ?? 0 : null
  }

  private calculateBollingerPosition(closes: number[]): number | null {
    if (closes.length < 20) return null
    const bbResult = BollingerBands.calculate({
      values: closes,
      period: 20,
      stdDev: 2,
    })
    if (bbResult.length === 0) return null
    const last = bbResult[bbResult.length - 1]
    const lastClose = closes[closes.length - 1]
    if (!last.upper || !last.lower || last.upper === last.lower) return 50
    return ((lastClose - last.lower) / (last.upper - last.lower)) * 100
  }

  private calculateMomentum(closes: number[], period: number): number | null {
    if (closes.length <= period) return null
    const current = closes[closes.length - 1]
    const past = closes[closes.length - 1 - period]
    return ((current - past) / past) * 100
  }

  private calculateVolatility(closes: number[], period: number): number | null {
    if (closes.length <= period) return null
    const returns: number[] = []
    for (let i = closes.length - period; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1])
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
    return Math.sqrt(variance) * Math.sqrt(252) * 100
  }

  private calculateATRRatio(data: DataPoint[]): number | null {
    if (data.length < 14) return null
    const trValues: number[] = []
    for (let i = 1; i < data.length; i++) {
      const highLow = data[i].high - data[i].low
      const highClose = Math.abs(data[i].high - data[i - 1].close)
      const lowClose = Math.abs(data[i].low - data[i - 1].close)
      trValues.push(Math.max(highLow, highClose, lowClose))
    }
    // Simple average of last 14 true ranges
    const last14TR = trValues.slice(-14)
    const atr = last14TR.reduce((a, b) => a + b, 0) / 14
    const lastClose = data[data.length - 1].close
    return (atr / lastClose) * 100
  }

  private calculatePVT(closes: number[], volumes: number[]): number | null {
    if (closes.length < 2 || volumes.length < 2) return null
    let pvt = 0
    for (let i = 1; i < closes.length; i++) {
      const priceChange = (closes[i] - closes[i - 1]) / closes[i - 1]
      pvt += volumes[i] * priceChange
    }
    // Normalize by last close to make comparable
    return pvt / closes[closes.length - 1]
  }

  private calculateStochK(highs: number[], lows: number[], closes: number[]): number | null {
    if (highs.length < 14 || lows.length < 14 || closes.length < 14) return null
    const stochResult = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
      signalPeriod: 3,
    })
    return stochResult.length > 0 ? stochResult[stochResult.length - 1].k : null
  }
}
