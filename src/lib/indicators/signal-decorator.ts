import type {
  HistoricalPrice,
  CalculatedIndicators,
  IndicatorValue,
} from './calculator'

export interface Trade {
  date: Date
  type: 'buy' | 'sell'
  price: number
  quantity: number
}

export interface TradeSignal {
  date: Date
  type: 'buy' | 'sell'
  source: string
  price: number
  strength: number
  reason: string
}

export interface Annotation {
  type: 'buy_marker' | 'sell_marker' | 'crossover' | 'threshold'
  position: 'above' | 'below' | 'inline'
  price?: number
  text?: string
  color: string
}

export interface DecoratedCandle extends HistoricalPrice {
  signals: TradeSignal[]
  annotations: Annotation[]
  indicatorValues: { [key: string]: number }
}

export interface SignalConfig {
  rsiOverbought?: number
  rsiOversold?: number
  bollingerBandWidth?: number
}

export class SignalDecorator {
  private indicators: CalculatedIndicators
  private data: HistoricalPrice[]

  constructor(indicators: CalculatedIndicators, data: HistoricalPrice[]) {
    this.indicators = indicators
    this.data = data
  }

  generateSignals(config: SignalConfig = {}): TradeSignal[] {
    const signals: TradeSignal[] = []
    const {
      rsiOverbought = 70,
      rsiOversold = 30,
      bollingerBandWidth = 0.02,
    } = config

    signals.push(...this.generateRSISignals(rsiOverbought, rsiOversold))
    signals.push(...this.generateMACDSignals())
    signals.push(...this.generateBollingerSignals(bollingerBandWidth))
    signals.push(...this.generateMASignals())

    return signals.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }

  private generateRSISignals(
    overbought: number,
    oversold: number
  ): TradeSignal[] {
    const signals: TradeSignal[] = []
    if (!this.indicators.rsi) return signals

    const rsiValues = this.indicators.rsi.values

    for (let i = 1; i < this.data.length; i++) {
      const prevRSI = rsiValues[i - 1]
      const currRSI = rsiValues[i]

      if (prevRSI === null || currRSI === null) continue

      if (prevRSI > overbought && currRSI <= overbought) {
        signals.push({
          date: this.data[i].date,
          type: 'sell',
          source: 'RSI',
          price: this.data[i].close,
          strength: Math.min((prevRSI - overbought) / 30, 1),
          reason: `RSI crossed below overbought level (${overbought})`,
        })
      } else if (prevRSI < oversold && currRSI >= oversold) {
        signals.push({
          date: this.data[i].date,
          type: 'buy',
          source: 'RSI',
          price: this.data[i].close,
          strength: Math.min((oversold - prevRSI) / 30, 1),
          reason: `RSI crossed above oversold level (${oversold})`,
        })
      }
    }

    return signals
  }

  private generateMACDSignals(): TradeSignal[] {
    const signals: TradeSignal[] = []
    if (!this.indicators.macd) return signals

    const { macd, signal } = this.indicators.macd

    for (let i = 1; i < this.data.length; i++) {
      const prevMACD = macd[i - 1]
      const currMACD = macd[i]
      const prevSignal = signal[i - 1]
      const currSignal = signal[i]

      if (
        prevMACD === null ||
        currMACD === null ||
        prevSignal === null ||
        currSignal === null
      ) {
        continue
      }

      if (prevMACD <= prevSignal && currMACD > currSignal) {
        signals.push({
          date: this.data[i].date,
          type: 'buy',
          source: 'MACD',
          price: this.data[i].close,
          strength: Math.min(Math.abs(currMACD - currSignal) / 2, 1),
          reason: 'MACD crossed above signal line',
        })
      } else if (prevMACD >= prevSignal && currMACD < currSignal) {
        signals.push({
          date: this.data[i].date,
          type: 'sell',
          source: 'MACD',
          price: this.data[i].close,
          strength: Math.min(Math.abs(currMACD - currSignal) / 2, 1),
          reason: 'MACD crossed below signal line',
        })
      }
    }

    return signals
  }

  private generateBollingerSignals(bandWidth: number): TradeSignal[] {
    const signals: TradeSignal[] = []
    if (!this.indicators.bollinger) return signals

    const { upper, lower } = this.indicators.bollinger

    for (let i = 1; i < this.data.length; i++) {
      const prevPrice = this.data[i - 1].close
      const currPrice = this.data[i].close
      const upperBand = upper[i]
      const lowerBand = lower[i]

      if (upperBand === null || lowerBand === null) continue

      const bandRange = upperBand - lowerBand
      const normalizedWidth = bandRange / this.data[i].close

      if (normalizedWidth < bandWidth) continue

      if (prevPrice >= upperBand && currPrice < upperBand) {
        signals.push({
          date: this.data[i].date,
          type: 'sell',
          source: 'Bollinger',
          price: currPrice,
          strength: Math.min(
            (prevPrice - upperBand) / (bandRange * 0.1),
            1
          ),
          reason: 'Price crossed below upper Bollinger Band',
        })
      } else if (prevPrice <= lowerBand && currPrice > lowerBand) {
        signals.push({
          date: this.data[i].date,
          type: 'buy',
          source: 'Bollinger',
          price: currPrice,
          strength: Math.min(
            (lowerBand - prevPrice) / (bandRange * 0.1),
            1
          ),
          reason: 'Price crossed above lower Bollinger Band',
        })
      }
    }

    return signals
  }

  private generateMASignals(): TradeSignal[] {
    const signals: TradeSignal[] = []
    const maValues = Array.from(this.indicators.ma.values())

    if (maValues.length < 2) return signals

    const sortedMAs = maValues.sort((a, b) => a.period - b.period)

    for (let i = 1; i < sortedMAs[0].values.length; i++) {
      for (let j = 0; j < sortedMAs.length - 1; j++) {
        const fastMA = sortedMAs[j]
        const slowMA = sortedMAs[j + 1]

        const prevFast = fastMA.values[i - 1]
        const currFast = fastMA.values[i]
        const prevSlow = slowMA.values[i - 1]
        const currSlow = slowMA.values[i]

        if (
          prevFast === null ||
          currFast === null ||
          prevSlow === null ||
          currSlow === null
        ) {
          continue
        }

        if (prevFast <= prevSlow && currFast > currSlow) {
          signals.push({
            date: this.data[i].date,
            type: 'buy',
            source: 'MA Crossover',
            price: this.data[i].close,
            strength: Math.min(
              (currFast - currSlow) / (currSlow * 0.01),
              1
            ),
            reason: `${fastMA.name} crossed above ${slowMA.name}`,
          })
        } else if (prevFast >= prevSlow && currFast < currSlow) {
          signals.push({
            date: this.data[i].date,
            type: 'sell',
            source: 'MA Crossover',
            price: this.data[i].close,
            strength: Math.min(
              (currSlow - currFast) / (currSlow * 0.01),
              1
            ),
            reason: `${fastMA.name} crossed below ${slowMA.name}`,
          })
        }
      }
    }

    return signals
  }

  decorateCandles(
    data: HistoricalPrice[],
    signals: TradeSignal[]
  ): DecoratedCandle[] {
    const signalMap = new Map<string, TradeSignal[]>()

    for (const signal of signals) {
      const dateKey = signal.date.toISOString().split('T')[0]
      if (!signalMap.has(dateKey)) {
        signalMap.set(dateKey, [])
      }
      signalMap.get(dateKey)!.push(signal)
    }

    return data.map(candle => {
      const dateKey = candle.date.toISOString().split('T')[0]
      const candleSignals = signalMap.get(dateKey) || []

      const annotations: Annotation[] = candleSignals.map(signal => ({
        type: signal.type === 'buy' ? 'buy_marker' : 'sell_marker',
        position: signal.type === 'buy' ? 'below' : 'above',
        price: signal.price,
        text: `${signal.source}: ${signal.reason}`,
        color: signal.type === 'buy' ? '#22c55e' : '#ef4444',
      }))

      const indicatorValues: { [key: string]: number } = {}

      this.indicators.rsi?.values.forEach((val, idx) => {
        if (
          idx < data.length &&
          data[idx].date.toISOString() === candle.date.toISOString() &&
          val !== null
        ) {
          indicatorValues['rsi'] = val
        }
      })

      if (this.indicators.bollinger) {
        const idx = data.findIndex(
          d => d.date.toISOString() === candle.date.toISOString()
        )
        if (idx >= 0) {
          const upper = this.indicators.bollinger.upper[idx]
          const middle = this.indicators.bollinger.middle[idx]
          const lower = this.indicators.bollinger.lower[idx]
          if (upper !== null) indicatorValues['bollingerUpper'] = upper
          if (middle !== null) indicatorValues['bollingerMiddle'] = middle
          if (lower !== null) indicatorValues['bollingerLower'] = lower
        }
      }

      if (this.indicators.macd) {
        const idx = data.findIndex(
          d => d.date.toISOString() === candle.date.toISOString()
        )
        if (idx >= 0) {
          const macdVal = this.indicators.macd.macd[idx]
          const signalVal = this.indicators.macd.signal[idx]
          if (macdVal !== null) indicatorValues['macd'] = macdVal
          if (signalVal !== null) indicatorValues['macdSignal'] = signalVal
        }
      }

      return {
        ...candle,
        signals: candleSignals,
        annotations,
        indicatorValues,
      }
    })
  }

  markTradePoints(
    candles: DecoratedCandle[],
    trades: Trade[]
  ): DecoratedCandle[] {
    const tradeMap = new Map<string, Trade[]>()

    for (const trade of trades) {
      const dateKey = trade.date.toISOString().split('T')[0]
      if (!tradeMap.has(dateKey)) {
        tradeMap.set(dateKey, [])
      }
      tradeMap.get(dateKey)!.push(trade)
    }

    return candles.map(candle => {
      const dateKey = candle.date.toISOString().split('T')[0]
      const dayTrades = tradeMap.get(dateKey) || []

      const tradeAnnotations: Annotation[] = dayTrades.map(trade => ({
        type: trade.type === 'buy' ? 'buy_marker' : 'sell_marker',
        position: trade.type === 'buy' ? 'below' : 'above',
        price: trade.price,
        text: `${trade.type.toUpperCase()} @ ${trade.price.toFixed(2)}`,
        color: trade.type === 'buy' ? '#22c55e' : '#ef4444',
      }))

      return {
        ...candle,
        annotations: [...candle.annotations, ...tradeAnnotations],
      }
    })
  }

  static createEmptyDecoratedCandle(candle: HistoricalPrice): DecoratedCandle {
    return {
      ...candle,
      signals: [],
      annotations: [],
      indicatorValues: {},
    }
  }
}
