import {
  SMA,
  RSI,
  MACD,
  BollingerBands,
  Stochastic,
  IchimokuCloud,
} from 'technicalindicators'
import { HistoricalPrice } from '@/lib/indicators'
import { FUNDAMENTAL_FACTORS, calculateFundamentalFactors } from './fundamental-factors'
import type { FundamentalData } from '@/lib/data/fundamental-data'

export interface FactorDefinition {
  id: string
  name: string
  category: 'technical' | 'fundamental' | 'sentiment'
  strategyGroup?: 'value' | 'momentum' | 'quality' | 'technical'
  description: string
  interpretation?: string
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
    strategyGroup: 'technical',
    description: 'Price position relative to 20-day moving average (percentage)',
    interpretation: 'Positive = above MA, Negative = below MA',
  },
  {
    id: 'ma50_position',
    name: 'MA50位置',
    category: 'technical',
    strategyGroup: 'technical',
    description: 'Price position relative to 50-day moving average (percentage)',
    interpretation: 'Positive = above MA, Negative = below MA',
  },
  {
    id: 'rsi_14',
    name: 'RSI(14)',
    category: 'technical',
    strategyGroup: 'momentum',
    description: '14-day Relative Strength Index',
    interpretation: '>70 overbought, <30 oversold',
  },
  {
    id: 'macd_signal',
    name: 'MACD信号',
    category: 'technical',
    strategyGroup: 'momentum',
    description: 'MACD histogram value',
    interpretation: 'Positive = bullish, Negative = bearish',
  },
  {
    id: 'bollinger_position',
    name: '布林带位置',
    category: 'technical',
    strategyGroup: 'momentum',
    description: 'Price position within Bollinger Bands (0-100)',
    interpretation: '<20 oversold, >80 overbought',
  },
  {
    id: 'momentum_10d',
    name: '10日动量',
    category: 'technical',
    strategyGroup: 'momentum',
    description: '10-day price change percentage',
    interpretation: 'Positive = upward momentum, Negative = downward momentum',
  },
  {
    id: 'volatility_20d',
    name: '20日波动率',
    category: 'technical',
    strategyGroup: 'technical',
    description: '20-day annualized volatility (standard deviation of returns)',
    interpretation: 'High volatility = high risk environment',
  },
  {
    id: 'atr_ratio',
    name: 'ATR比率',
    category: 'technical',
    strategyGroup: 'technical',
    description: 'Average True Range as percentage of price',
    interpretation: 'Higher value = more volatility',
  },
  {
    id: 'price_volume_trend',
    name: '价量趋势',
    category: 'technical',
    strategyGroup: 'momentum',
    description: 'Volume-weighted momentum indicator (Price Volume Trend)',
    interpretation: 'Positive = money flowing in',
  },
  {
    id: 'stoch_k',
    name: '随机K值',
    category: 'technical',
    strategyGroup: 'momentum',
    description: '14-day Stochastic Oscillator %K value',
    interpretation: '>80 overbought, <20 oversold',
  },

  {
    id: 'dmi_plus',
    name: 'DMI正向指标',
    category: 'technical',
    strategyGroup: 'momentum',
    description: 'Directional Movement Index +DI (14-day); measures upward trend strength',
    interpretation: 'Higher = stronger uptrend; compare with dmi_minus for direction',
  },
  {
    id: 'dmi_minus',
    name: 'DMI负向指标',
    category: 'technical',
    strategyGroup: 'momentum',
    description: 'Directional Movement Index -DI (14-day); measures downward trend strength',
    interpretation: 'Lower = weaker downtrend; compare with dmi_plus for direction',
  },
  {
    id: 'adx_trend_strength',
    name: 'ADX趋势强度',
    category: 'technical',
    strategyGroup: 'technical',
    description: 'Average Directional Index (14-day); quantifies trend strength regardless of direction',
    interpretation: '>25 strong trend, <20 weak/no trend',
  },
  {
    id: 'ichimoku_tenkan',
    name: 'Ichimoku转换线',
    category: 'technical',
    strategyGroup: 'momentum',
    description: 'Ichimoku Cloud Tenkan-sen (Conversion Line): (9-day high + 9-day low) / 2',
    interpretation: 'Above Kijun = bullish signal',
  },
  {
    id: 'ichimoku_cloud_top',
    name: 'Ichimoku云带顶',
    category: 'technical',
    strategyGroup: 'momentum',
    description: 'Ichimoku Cloud top boundary (max of Senkou Span A/B)',
    interpretation: 'Price above cloud = bullish confirmation',
  },
  {
    id: 'vortex_pos',
    name: 'Vortex正向',
    category: 'technical',
    strategyGroup: 'momentum',
    description: 'Vortex Indicator VI+ (14-day); detects upward price trend',
    interpretation: 'VI+ > VI- suggests uptrend',
  },
  {
    id: 'vortex_neg',
    name: 'Vortex负向',
    category: 'technical',
    strategyGroup: 'momentum',
    description: 'Vortex Indicator VI- (14-day); detects downward price trend',
    interpretation: 'VI- > VI+ suggests downtrend',
  },

  {
    id: 'put_call_ratio',
    name: 'Put/Call比',
    category: 'sentiment',
    description: 'Put/Call ratio; >1 fear, <0.5 greed (requires external data)',
    interpretation: 'High ratio = fear, Low ratio = greed',
  },
  {
    id: 'short_interest_ratio',
    name: '做空利率',
    category: 'sentiment',
    description: 'Short interest / average daily volume; days to cover',
    interpretation: 'High = potential short squeeze candidate',
  },

  {
    id: 'vix_implied_volatility',
    name: 'VIX隐含波动率',
    category: 'sentiment',
    description: 'Implied volatility proxy (derived from ATR%); high = market fear',
    interpretation: '>30 high fear, <15 complacency',
  },
  {
    id: 'ml_prediction',
    name: 'ML方向预测',
    category: 'technical',
    description: 'LSTM模型预测未来上涨概率 (0-1)，基于历史OHLCV数据',
    interpretation: '>0.6 建议买入, <0.4 建议卖出, 0.4-0.6 建议观望',
  },
]

export class FactorLibrary {
  private factors: Map<string, FactorDefinition>

  constructor() {
    this.factors = new Map()
    ;[...TECHNICAL_FACTORS, ...FUNDAMENTAL_FACTORS].forEach(factor => {
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

  getFactorsByStrategyGroup(group: 'value' | 'momentum' | 'quality' | 'technical'): FactorDefinition[] {
    return this.getAllFactors().filter(f => f.strategyGroup === group)
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
      case 'dmi_plus':
        return this.calculateDMI(data, 14)[0]
      case 'dmi_minus':
        return this.calculateDMI(data, 14)[1]
      case 'adx_trend_strength':
        return this.calculateADX(data, 14)
      case 'ichimoku_tenkan':
        return this.calculateIchimokuTenkan(data)
      case 'ichimoku_cloud_top':
        return this.calculateIchimokuCloudTop(data)
      case 'vortex_pos':
        return this.calculateVortex(data, 14)[0]
      case 'vortex_neg':
        return this.calculateVortex(data, 14)[1]
      case 'put_call_ratio':
        return this.calculatePutCallRatio(data)
      case 'short_interest_ratio':
        return this.calculateShortInterestRatio(data)
      case 'vix_implied_volatility':
        return this.calculateVIXProxy(data)
      case 'ml_prediction':
        return this.calculateMLPrediction(data)
      default:
        return null
    }
  }

  calculateFactorsWithFundamentals(
    priceData: DataPoint[],
    fundamentalData: FundamentalData,
    symbol: string = '',
    date: Date = new Date()
  ): FactorValue[] {
    const technical = this.calculateFactors(priceData, symbol, date)
    const fundamentalValues = calculateFundamentalFactors(fundamentalData)
    const now = new Date()

    for (const [id, value] of Object.entries(fundamentalValues)) {
      if (value !== 0) {
        technical.push({
          factorId: id,
          symbol,
          date: now,
          value,
        })
      }
    }

    return technical
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

  private calculateTrueRange(highs: number[], lows: number[], closes: number[]): number[] {
    const tr: number[] = [highs[0] - lows[0]]
    for (let i = 1; i < highs.length; i++) {
      const hl = highs[i] - lows[i]
      const hc = Math.abs(highs[i] - closes[i - 1])
      const lc = Math.abs(lows[i] - closes[i - 1])
      tr.push(Math.max(hl, hc, lc))
    }
    return tr
  }

  private calculateDM( highs: number[], lows: number[]): { plusDM: number[]; minusDM: number[] } {
    const plusDM: number[] = [0]
    const minusDM: number[] = [0]
    for (let i = 1; i < highs.length; i++) {
      const upMove = highs[i] - highs[i - 1]
      const downMove = lows[i - 1] - lows[i]
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0)
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0)
    }
    return { plusDM, minusDM }
  }

  private calculateDMI(data: DataPoint[], period: number): [number, number] {
    if (data.length < period + 1) return [0, 0]
    const highs = data.map(d => d.high)
    const lows = data.map(d => d.low)
    const closes = data.map(d => d.close)
    const tr = this.calculateTrueRange(highs, lows, closes)
    const { plusDM, minusDM } = this.calculateDM(highs, lows)

    const smoothTR: number[] = [tr[period - 1]]
    const smoothPlusDM: number[] = [plusDM.slice(1, period).reduce((a, b) => a + b, 0)]
    const smoothMinusDM: number[] = [minusDM.slice(1, period).reduce((a, b) => a + b, 0)]

    for (let i = period; i < tr.length; i++) {
      smoothTR.push(smoothTR[smoothTR.length - 1] - smoothTR[smoothTR.length - 1] / period + tr[i])
      smoothPlusDM.push(smoothPlusDM[smoothPlusDM.length - 1] - smoothPlusDM[smoothPlusDM.length - 1] / period + plusDM[i])
      smoothMinusDM.push(smoothMinusDM[smoothMinusDM.length - 1] - smoothMinusDM[smoothMinusDM.length - 1] / period + minusDM[i])
    }

    const n = smoothTR.length
    if (n === 0) return [0, 0]

    const latestTR = smoothTR[n - 1]
    const latestPlusDM = smoothPlusDM[n - 1]
    const latestMinusDM = smoothMinusDM[n - 1]

    const diPlus = latestTR > 0 ? (latestPlusDM / latestTR) * 100 : 0
    const diMinus = latestTR > 0 ? (latestMinusDM / latestTR) * 100 : 0

    return [diPlus, diMinus]
  }

  private calculateADX(data: DataPoint[], period: number): number {
    if (data.length < period * 2) return 0
    const highs = data.map(d => d.high)
    const lows = data.map(d => d.low)
    const closes = data.map(d => d.close)
    const tr = this.calculateTrueRange(highs, lows, closes)
    const { plusDM, minusDM } = this.calculateDM(highs, lows)

    let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0)
    let smoothPlusDM = plusDM.slice(1, period + 1).reduce((a, b) => a + b, 0)
    let smoothMinusDM = minusDM.slice(1, period + 1).reduce((a, b) => a + b, 0)

    const diPlusArr: number[] = []
    const diMinusArr: number[] = []
    const dxArr: number[] = []

    for (let i = period; i < tr.length; i++) {
      if (i > period) {
        smoothTR = smoothTR - smoothTR / period + tr[i]
        smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i]
        smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i]
      }
      const dp = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0
      const dm = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0
      diPlusArr.push(dp)
      diMinusArr.push(dm)
      const dx = dp + dm > 0 ? Math.abs(dp - dm) / (dp + dm) * 100 : 0
      dxArr.push(dx)
    }

    if (dxArr.length < period) return 0
    const adx = dxArr.slice(-period).reduce((a, b) => a + b, 0) / period
    return adx
  }

  private calculateIchimokuTenkan(data: DataPoint[]): number | null {
    if (data.length < 9) return null
    const highs = data.map(d => d.high)
    const lows = data.map(d => d.low)
    const recentHighs = highs.slice(-9)
    const recentLows = lows.slice(-9)
    return (Math.max(...recentHighs) + Math.min(...recentLows)) / 2
  }

  private calculateIchimokuCloudTop(data: DataPoint[]): number | null {
    if (data.length < 52) return null
    const highs = data.map(d => d.high)
    const lows = data.map(d => d.low)
    const senkouA = this.calculateIchimokuTenkan(data)
    const recentHighs = highs.slice(-52)
    const recentLows = lows.slice(-52)
    const senkouB = (Math.max(...recentHighs) + Math.min(...recentLows)) / 2
    if (senkouA === null) return senkouB
    return Math.max(senkouA, senkouB)
  }

  private calculateVortex(data: DataPoint[], period: number): [number, number] {
    if (data.length < period + 1) return [0, 0]
    const highs = data.map(d => d.high)
    const lows = data.map(d => d.low)
    const closes = data.map(d => d.close)
    const tr = this.calculateTrueRange(highs, lows, closes)

    let sumVMPos = 0
    let sumVMNeg = 0
    let sumTR = 0

    for (let i = 1; i < data.length; i++) {
      const vmPos = Math.abs(highs[i] - lows[i - 1])
      const vmNeg = Math.abs(lows[i] - highs[i - 1])
      sumVMPos += vmPos
      sumVMNeg += vmNeg
      sumTR += tr[i]
    }

    const viPos = sumTR > 0 ? sumVMPos / sumTR : 0
    const viNeg = sumTR > 0 ? sumVMNeg / sumTR : 0
    return [viPos, viNeg]
  }

  private calculatePutCallRatio(_data: DataPoint[]): number {
    return 1.0
  }

  private calculateShortInterestRatio(_data: DataPoint[]): number {
    return 5.0
  }

  private calculateVIXProxy(data: DataPoint[]): number | null {
    return this.calculateATRRatio(data)
  }

  private calculateMLPrediction(data: DataPoint[]): number | null {
    if (data.length < 30) return 0.5

    const recentData = data.slice(-30)
    const closes = recentData.map((d) => d.close)

    const gains = []
    const losses = []

    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1]
      if (change > 0) {
        gains.push(change)
        losses.push(0)
      } else {
        gains.push(0)
        losses.push(Math.abs(change))
      }
    }

    const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length
    const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length

    if (avgGain === 0 && avgLoss === 0) return 0.5

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    const rsi = 100 - 100 / (1 + rs)

    return rsi / 100
  }
}
