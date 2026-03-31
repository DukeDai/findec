import { SMA, EMA, RSI, MACD } from 'technicalindicators'

export interface IndicatorResult {
  ma?: { values: number[]; periods: number[] }
  ema?: { values: number[]; periods: number[] }
  rsi?: { values: number[]; periods: number[] }
  macd?: {
    macd: number[]
    signal: number[]
    histogram: number[]
    periods: number[]
  }
}

export interface HistoricalPrice {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function calculateIndicators(
  data: HistoricalPrice[],
  options: {
    ma?: number[]
    ema?: number[]
    rsi?: number
    macd?: { fast: number; slow: number; signal: number }
  } = {}
): IndicatorResult {
  const closes = data.map(d => d.close)
  const result: IndicatorResult = {}

  // MA 计算
  if (options.ma?.length) {
    result.ma = { values: [], periods: [] }
    for (const period of options.ma) {
      const maValues = SMA.calculate({ period, values: closes })
      result.ma.values.push(...maValues)
      result.ma.periods.push(period)
    }
  }

  // EMA 计算
  if (options.ema?.length) {
    result.ema = { values: [], periods: [] }
    for (const period of options.ema) {
      const emaValues = EMA.calculate({ period, values: closes })
      result.ema.values.push(...emaValues)
      result.ema.periods.push(period)
    }
  }

  // RSI 计算
  if (options.rsi) {
    const rsiValues = RSI.calculate({ period: options.rsi, values: closes })
    result.rsi = { values: rsiValues, periods: [options.rsi] }
  }

  // MACD 计算
  if (options.macd) {
    const macdResult = MACD.calculate({
      values: closes,
      fastPeriod: options.macd.fast,
      slowPeriod: options.macd.slow,
      signalPeriod: options.macd.signal,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    })

    result.macd = {
      macd: macdResult.map(m => m.MACD ?? 0),
      signal: macdResult.map(m => m.signal ?? 0),
      histogram: macdResult.map(m => m.histogram ?? 0),
      periods: [options.macd.fast, options.macd.slow, options.macd.signal],
    }
  }

  return result
}
