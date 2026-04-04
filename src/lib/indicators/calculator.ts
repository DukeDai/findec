import {
  SMA,
  EMA,
  RSI,
  MACD,
  BollingerBands,
  ATR,
  ADX,
  Stochastic,
  OBV,
} from 'technicalindicators'

export interface HistoricalPrice {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface IndicatorConfig {
  ma?: number[]
  ema?: number[]
  rsi?: { period: number }
  macd?: { fast: number; slow: number; signal: number }
  stochastic?: { kPeriod: number; dPeriod: number; smooth: number }
  bollinger?: { period: number; stdDev: number }
  atr?: { period: number }
  adx?: { period: number }
  obv?: boolean
}

export interface IndicatorValue {
  name: string
  period: number
  values: (number | null)[]
  latest: number | null
}

interface MACDConfig {
  fast: number
  slow: number
  signal: number
}

interface StochConfig {
  kPeriod: number
  dPeriod: number
  smooth: number
}

export interface CalculatedIndicators {
  ma: Map<number, IndicatorValue>
  ema: Map<number, IndicatorValue>
  rsi: IndicatorValue | null
  macd: {
    macd: (number | null)[]
    signal: (number | null)[]
    histogram: (number | null)[]
  } | null
  bollinger: {
    upper: (number | null)[]
    middle: (number | null)[]
    lower: (number | null)[]
  } | null
  atr: IndicatorValue | null
  adx: IndicatorValue | null
  stoch: {
    k: (number | null)[]
    d: (number | null)[]
  } | null
  obv: (number | null)[]
}

const defaultConfig: Required<IndicatorConfig> = {
  ma: [],
  ema: [],
  rsi: { period: 14 },
  macd: { fast: 12, slow: 26, signal: 9 },
  stochastic: { kPeriod: 14, dPeriod: 3, smooth: 3 },
  bollinger: { period: 20, stdDev: 2 },
  atr: { period: 14 },
  adx: { period: 14 },
  obv: false,
}

export class IndicatorCalculator {
  calculate(
    data: HistoricalPrice[],
    config: IndicatorConfig = {}
  ): CalculatedIndicators {
    const mergedConfig = { ...defaultConfig, ...config }
    const closes = data.map(d => d.close)

    const result: CalculatedIndicators = {
      ma: new Map(),
      ema: new Map(),
      rsi: null,
      macd: null,
      bollinger: null,
      atr: null,
      adx: null,
      stoch: null,
      obv: [],
    }

    if (mergedConfig.ma?.length) {
      for (const period of mergedConfig.ma) {
        result.ma.set(period, this.calculateMA(closes, period))
      }
    }

    if (mergedConfig.ema?.length) {
      for (const period of mergedConfig.ema) {
        result.ema.set(period, this.calculateEMA(closes, period))
      }
    }

    if (mergedConfig.rsi) {
      result.rsi = this.calculateRSI(closes, mergedConfig.rsi.period)
    }

    if (mergedConfig.macd) {
      result.macd = this.calculateMACD(closes, mergedConfig.macd)
    }

    if (mergedConfig.bollinger) {
      result.bollinger = this.calculateBollinger(
        closes,
        mergedConfig.bollinger.period,
        mergedConfig.bollinger.stdDev
      )
    }

    if (mergedConfig.atr) {
      result.atr = this.calculateATR(data, mergedConfig.atr.period)
    }

    if (mergedConfig.adx) {
      result.adx = this.calculateADX(data, mergedConfig.adx.period)
    }

    if (mergedConfig.stochastic) {
      result.stoch = this.calculateStochastic(data, mergedConfig.stochastic)
    }

    if (mergedConfig.obv) {
      result.obv = this.calculateOBV(data)
    }

    return result
  }

  private calculateMA(values: number[], period: number): IndicatorValue {
    const maValues = SMA.calculate({ period, values })
    const alignedValues = this.alignValues(maValues, values.length)

    return {
      name: `MA${period}`,
      period,
      values: alignedValues,
      latest: this.getLatestValue(alignedValues),
    }
  }

  private calculateEMA(values: number[], period: number): IndicatorValue {
    const emaValues = EMA.calculate({ period, values })
    const alignedValues = this.alignValues(emaValues, values.length)

    return {
      name: `EMA${period}`,
      period,
      values: alignedValues,
      latest: this.getLatestValue(alignedValues),
    }
  }

  private calculateRSI(values: number[], period: number): IndicatorValue {
    const rsiValues = RSI.calculate({ period, values })
    const alignedValues = this.alignValues(rsiValues, values.length)

    return {
      name: 'RSI',
      period,
      values: alignedValues,
      latest: this.getLatestValue(alignedValues),
    }
  }

  private calculateMACD(
    values: number[],
    config: MACDConfig
  ): CalculatedIndicators['macd'] {
    const macdResult = MACD.calculate({
      values,
      fastPeriod: config.fast,
      slowPeriod: config.slow,
      signalPeriod: config.signal,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    })

    const macdValues = macdResult.map(m => m.MACD ?? null)
    const signalValues = macdResult.map(m => m.signal ?? null)
    const histogramValues = macdResult.map(m => m.histogram ?? null)

    const maxLength = Math.max(
      macdValues.length,
      signalValues.length,
      histogramValues.length
    )

    return {
      macd: this.alignValues(macdValues, values.length, maxLength),
      signal: this.alignValues(signalValues, values.length, maxLength),
      histogram: this.alignValues(histogramValues, values.length, maxLength),
    }
  }

  private calculateBollinger(
    values: number[],
    period: number,
    stdDev: number
  ): CalculatedIndicators['bollinger'] {
    const bbResult = BollingerBands.calculate({
      period,
      values,
      stdDev,
    })

    const upperValues = bbResult.map(bb => bb.upper ?? null)
    const middleValues = bbResult.map(bb => bb.middle ?? null)
    const lowerValues = bbResult.map(bb => bb.lower ?? null)

    const maxLength = Math.max(
      upperValues.length,
      middleValues.length,
      lowerValues.length
    )

    return {
      upper: this.alignValues(upperValues, values.length, maxLength),
      middle: this.alignValues(middleValues, values.length, maxLength),
      lower: this.alignValues(lowerValues, values.length, maxLength),
    }
  }

  private calculateATR(
    data: HistoricalPrice[],
    period: number
  ): IndicatorValue {
    const atrValues = ATR.calculate({
      period,
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
    })

    const alignedValues = this.alignValues(atrValues, data.length)

    return {
      name: 'ATR',
      period,
      values: alignedValues,
      latest: this.getLatestValue(alignedValues),
    }
  }

  private calculateADX(
    data: HistoricalPrice[],
    period: number
  ): IndicatorValue {
    const adxResult = ADX.calculate({
      period,
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
    })

    const adxValues = adxResult.map(r => r.adx)
    const alignedValues = this.alignValues(adxValues, data.length)

    return {
      name: 'ADX',
      period,
      values: alignedValues,
      latest: this.getLatestValue(alignedValues),
    }
  }

  private calculateStochastic(
    data: HistoricalPrice[],
    config: StochConfig
  ): CalculatedIndicators['stoch'] {
    const stochResult = Stochastic.calculate({
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      period: config.kPeriod,
      signalPeriod: config.dPeriod,
    })

    const kValues = stochResult.map(s => (s.k !== undefined ? s.k : null))
    const dValues = stochResult.map(s => (s.d !== undefined ? s.d : null))

    const maxLength = Math.max(kValues.length, dValues.length)

    return {
      k: this.alignValues(kValues, data.length, maxLength),
      d: this.alignValues(dValues, data.length, maxLength),
    }
  }

  private calculateOBV(data: HistoricalPrice[]): (number | null)[] {
    const obvValues = OBV.calculate({
      close: data.map(d => d.close),
      volume: data.map(d => d.volume),
    })

    return this.alignValues(obvValues, data.length)
  }

  private alignValues(
    values: (number | null)[],
    targetLength: number,
    valuesLength?: number
  ): (number | null)[] {
    const actualLength = valuesLength ?? values.length
    const paddingCount = targetLength - actualLength

    if (paddingCount <= 0) {
      return values.map(v => (v === undefined ? null : v))
    }

    const padded = new Array(paddingCount).fill(null)
    return [...padded, ...values.map(v => (v === undefined ? null : v))]
  }

  private getLatestValue(values: (number | null)[]): number | null {
    for (let i = values.length - 1; i >= 0; i--) {
      if (values[i] !== null) {
        return values[i]
      }
    }
    return null
  }
}

export function calculateIndicators(
  data: HistoricalPrice[],
  config?: IndicatorConfig
): CalculatedIndicators {
  const calculator = new IndicatorCalculator()
  return calculator.calculate(data, config)
}
