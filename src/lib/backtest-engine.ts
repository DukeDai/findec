import { SMA, EMA, RSI, MACD, BollingerBands } from 'technicalindicators'
import { HistoricalPrice } from './indicators'

export interface Trade {
  symbol: string
  date: Date
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  value: number
  reason: string
}

export interface BacktestResult {
  trades: Trade[]
  totalReturn: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  finalCapital: number
  equityCurve: { date: Date; value: number }[]
}

export interface BacktestConfig {
  initialCapital: number
  strategy: 'ma_crossover' | 'rsi' | 'macd' | 'dual_ma' | 'bollinger' | 'momentum' | 'mean_reversion' | 'trend_follow'
  parameters: {
    shortWindow?: number
    longWindow?: number
    rsiPeriod?: number
    rsiOverbought?: number
    rsiOversold?: number
    macdFast?: number
    macdSlow?: number
    macdSignal?: number
    bollingerPeriod?: number
    bollingerStdDev?: number
    momentumPeriod?: number
    momentumThreshold?: number
    meanReversionPeriod?: number
    meanReversionThreshold?: number
    stopLoss?: number
    takeProfit?: number
    positionSize?: number
  }
}

function calculateMA(values: number[], period: number): number[] {
  return SMA.calculate({ period, values })
}

function calculateRSI(values: number[], period: number): number[] {
  return RSI.calculate({ period, values })
}

function calculateMACD(
  values: number[],
  fast: number,
  slow: number,
  signal: number
) {
  return MACD.calculate({
    values,
    fastPeriod: fast,
    slowPeriod: slow,
    signalPeriod: signal,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  })
}

function calculateBollingerBands(
  values: number[],
  period: number,
  stdDev: number
) {
  return BollingerBands.calculate({
    values,
    period,
    stdDev,
  })
}

function calculateMomentum(values: number[], period: number): number[] {
  const momentum: number[] = []
  for (let i = period; i < values.length; i++) {
    momentum.push((values[i] - values[i - period]) / values[i - period] * 100)
  }
  return momentum
}

function calculateMaxDrawdown(equityCurve: { date: Date; value: number }[]): number {
  let maxDrawdown = 0
  let peak = equityCurve[0].value

  for (const point of equityCurve) {
    if (point.value > peak) {
      peak = point.value
    }
    const drawdown = (peak - point.value) / peak
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  }

  return maxDrawdown * 100
}

function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
  if (returns.length < 2) return 0

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const annualizedReturn = avgReturn * 252

  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  const annualizedStdDev = stdDev * Math.sqrt(252)

  if (annualizedStdDev === 0) return 0

  return (annualizedReturn - riskFreeRate) / annualizedStdDev
}

export function executeBacktest(
  data: HistoricalPrice[],
  config: BacktestConfig
): BacktestResult {
  const closes = data.map(d => d.close)
  const dates = data.map(d => d.date)
  const { initialCapital, strategy, parameters } = config

  const trades: Trade[] = []
  let capital = initialCapital
  let position: { symbol: string; quantity: number; entryPrice: number } | null = null

  const shortWindow = parameters.shortWindow || 10
  const longWindow = parameters.longWindow || 30
  const positionSize = parameters.positionSize || 0.1
  const stopLoss = parameters.stopLoss || 0
  const takeProfit = parameters.takeProfit || 0

  let maShort: number[] = []
  let maLong: number[] = []
  let rsiValues: number[] = []
  let macdValues: any[] = []
  let bollingerValues: any[] = []
  let momentumValues: number[] = []

  if (strategy === 'ma_crossover' || strategy === 'dual_ma' || strategy === 'trend_follow') {
    maShort = calculateMA(closes, shortWindow)
    maLong = calculateMA(closes, longWindow)
  }

  if (strategy === 'rsi') {
    rsiValues = calculateRSI(closes, parameters.rsiPeriod || 14)
  }

  if (strategy === 'macd') {
    macdValues = calculateMACD(
      closes,
      parameters.macdFast || 12,
      parameters.macdSlow || 26,
      parameters.macdSignal || 9
    )
  }

  if (strategy === 'bollinger') {
    bollingerValues = calculateBollingerBands(
      closes,
      parameters.bollingerPeriod || 20,
      parameters.bollingerStdDev || 2
    )
  }

  if (strategy === 'momentum') {
    momentumValues = calculateMomentum(closes, parameters.momentumPeriod || 10)
  }

  const equityCurve: { date: Date; value: number }[] = [{ date: dates[0], value: initialCapital }]
  const dailyReturns: number[] = []

  for (let i = 1; i < data.length; i++) {
    const currentPrice = closes[i]
    const currentDate = dates[i]
    let signal: 'BUY' | 'SELL' | null = null
    let reason = ''

    // Determine signal based on strategy
    if (strategy === 'ma_crossover' || strategy === 'dual_ma') {
      const maShortIdx = i - (shortWindow - 1)
      const maLongIdx = i - (longWindow - 1)
      const prevMaShortIdx = i - shortWindow
      const prevMaLongIdx = i - longWindow

      if (maShortIdx >= 0 && maLongIdx >= 0 && prevMaShortIdx >= 0 && prevMaLongIdx >= 0) {
        const currentShort = maShort[maShortIdx]
        const currentLong = maLong[maLongIdx]
        const prevShort = maShort[prevMaShortIdx]
        const prevLong = maLong[prevMaLongIdx]

        // Golden cross (buy signal)
        if (prevShort <= prevLong && currentShort > currentLong) {
          signal = 'BUY'
          reason = `MA Cross: ${shortWindow}-MA ($${currentShort.toFixed(2)}) crosses above ${longWindow}-MA ($${currentLong.toFixed(2)})`
        }
        // Death cross (sell signal)
        else if (prevShort >= prevLong && currentShort < currentLong) {
          signal = 'SELL'
          reason = `MA Cross: ${shortWindow}-MA ($${currentShort.toFixed(2)}) crosses below ${longWindow}-MA ($${currentLong.toFixed(2)})`
        }
      }
    }

    if (strategy === 'rsi' && rsiValues.length > 0) {
      const rsiIdx = i - (parameters.rsiPeriod || 14)
      if (rsiIdx >= 0 && rsiIdx < rsiValues.length) {
        const rsi = rsiValues[rsiIdx]
        const rsiOversold = parameters.rsiOversold || 30
        const rsiOverbought = parameters.rsiOverbought || 70

        if (rsi < rsiOversold) {
          signal = 'BUY'
          reason = `RSI: ${rsi.toFixed(2)} oversold (below ${rsiOversold})`
        } else if (rsi > rsiOverbought) {
          signal = 'SELL'
          reason = `RSI: ${rsi.toFixed(2)} overbought (above ${rsiOverbought})`
        }
      }
    }

    if (strategy === 'macd' && macdValues.length > 0) {
      const macdIdx = i - 1
      if (macdIdx >= 0 && macdIdx < macdValues.length) {
        const current = macdValues[macdIdx]
        const prev = macdValues[macdIdx - 1]

        if (prev && current) {
          if (prev.MACD! <= prev.signal! && current.MACD! > current.signal!) {
            signal = 'BUY'
            reason = `MACD: MACD (${current.MACD?.toFixed(2)}) crosses above signal (${current.signal?.toFixed(2)})`
          }
          else if (prev.MACD! >= prev.signal! && current.MACD! < current.signal!) {
            signal = 'SELL'
            reason = `MACD: MACD (${current.MACD?.toFixed(2)}) crosses below signal (${current.signal?.toFixed(2)})`
          }
        }
      }
    }

    if (strategy === 'bollinger' && bollingerValues.length > 0) {
      const bbIdx = i - (parameters.bollingerPeriod || 20)
      if (bbIdx >= 0 && bbIdx < bollingerValues.length) {
        const bb = bollingerValues[bbIdx]
        if (bb) {
          if (currentPrice <= bb.lower) {
            signal = 'BUY'
            reason = `Bollinger: Price ($${currentPrice.toFixed(2)}) touched lower band ($${bb.lower.toFixed(2)})`
          } else if (currentPrice >= bb.upper) {
            signal = 'SELL'
            reason = `Bollinger: Price ($${currentPrice.toFixed(2)}) touched upper band ($${bb.upper.toFixed(2)})`
          }
        }
      }
    }

    if (strategy === 'momentum' && momentumValues.length > 0) {
      const momentumIdx = i - (parameters.momentumPeriod || 10)
      if (momentumIdx >= 0 && momentumIdx < momentumValues.length) {
        const momentum = momentumValues[momentumIdx]
        const threshold = parameters.momentumThreshold || 5

        if (momentum > threshold) {
          signal = 'BUY'
          reason = `Momentum: ${momentum.toFixed(2)}% (above ${threshold}%)`
        } else if (momentum < -threshold) {
          signal = 'SELL'
          reason = `Momentum: ${momentum.toFixed(2)}% (below -${threshold}%)`
        }
      }
    }

    if (strategy === 'mean_reversion') {
      const period = parameters.meanReversionPeriod || 20
      const threshold = parameters.meanReversionThreshold || 5
      const maIdx = i - period

      if (maIdx >= 0 && maIdx < closes.length) {
        const ma = closes.slice(maIdx, i).reduce((a, b) => a + b, 0) / period
        const deviation = ((currentPrice - ma) / ma) * 100

        if (deviation < -threshold) {
          signal = 'BUY'
          reason = `Mean Reversion: Price ${deviation.toFixed(2)}% below MA ($${ma.toFixed(2)})`
        } else if (deviation > threshold && position) {
          signal = 'SELL'
          reason = `Mean Reversion: Price ${deviation.toFixed(2)}% above MA ($${ma.toFixed(2)})`
        }
      }
    }

    if (strategy === 'trend_follow') {
      const maShortIdx = i - (shortWindow - 1)
      const maLongIdx = i - (longWindow - 1)

      if (maShortIdx >= 0 && maLongIdx >= 0) {
        const currentShort = maShort[maShortIdx]
        const currentLong = maLong[maLongIdx]
        const trend = currentShort > currentLong ? 'UP' : 'DOWN'

        if (trend === 'UP' && !position) {
          signal = 'BUY'
          reason = `Trend Follow: Uptrend (${shortWindow}MA > ${longWindow}MA)`
        } else if (trend === 'DOWN' && position) {
          signal = 'SELL'
          reason = `Trend Follow: Downtrend (${shortWindow}MA < ${longWindow}MA)`
        }
      }
    }

    if (position && stopLoss > 0) {
      const loss = ((position.entryPrice - currentPrice) / position.entryPrice) * 100
      if (loss >= stopLoss) {
        signal = 'SELL'
        reason = `Stop Loss: -${loss.toFixed(2)}% triggered`
      }
    }

    if (position && takeProfit > 0) {
      const profit = ((currentPrice - position.entryPrice) / position.entryPrice) * 100
      if (profit >= takeProfit) {
        signal = 'SELL'
        reason = `Take Profit: +${profit.toFixed(2)}% triggered`
      }
    }

    // Execute trades
    if (signal === 'BUY' && !position && capital > 0) {
      const quantity = Math.floor((capital * positionSize) / currentPrice)
      if (quantity > 0) {
        const value = quantity * currentPrice
        trades.push({
          symbol: data[0].date instanceof Date ? 'UNKNOWN' : 'STOCK',
          date: currentDate,
          type: 'BUY',
          price: currentPrice,
          quantity,
          value,
          reason,
        })
        position = { symbol: 'STOCK', quantity, entryPrice: currentPrice }
        capital -= value
      }
    } else if (signal === 'SELL' && position) {
      const value = position.quantity * currentPrice
      trades.push({
        symbol: position.symbol,
        date: currentDate,
        type: 'SELL',
        price: currentPrice,
        quantity: position.quantity,
        value,
        reason,
      })
      capital += value
      position = null
    }

    const currentEquity = capital + (position ? position.quantity * currentPrice : 0)
    equityCurve.push({ date: currentDate, value: currentEquity })

    if (equityCurve.length > 1) {
      const dailyReturn = (currentEquity - equityCurve[equityCurve.length - 2].value) / equityCurve[equityCurve.length - 2].value
      dailyReturns.push(dailyReturn)
    }
  }

  // Close any remaining position at the end
  if (position) {
    const lastPrice = closes[closes.length - 1]
    const value = position.quantity * lastPrice
    trades.push({
      symbol: position.symbol,
      date: dates[dates.length - 1],
      type: 'SELL',
      price: lastPrice,
      quantity: position.quantity,
      value,
      reason: 'End of backtest - position closed',
    })
    capital += value
    position = null
  }

  // Calculate metrics
  const finalCapital = capital
  const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100

  const winningTrades = trades.filter((t, idx) => {
    if (t.type === 'SELL') {
      // Find matching BUY trade
      const buyTrades = trades.slice(0, idx).filter(tr => tr.type === 'BUY')
      if (buyTrades.length > 0) {
        const lastBuy = buyTrades[buyTrades.length - 1]
        return t.value > lastBuy.value
      }
    }
    return false
  })

  const losingTrades = trades.filter((t, idx) => {
    if (t.type === 'SELL') {
      const buyTrades = trades.slice(0, idx).filter(tr => tr.type === 'BUY')
      if (buyTrades.length > 0) {
        const lastBuy = buyTrades[buyTrades.length - 1]
        return t.value < lastBuy.value
      }
    }
    return false
  })

  const totalTrades = Math.floor(trades.filter(t => t.type === 'SELL').length)
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0

  return {
    trades,
    totalReturn,
    sharpeRatio: calculateSharpeRatio(dailyReturns),
    maxDrawdown: calculateMaxDrawdown(equityCurve),
    winRate,
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    finalCapital,
    equityCurve,
  }
}