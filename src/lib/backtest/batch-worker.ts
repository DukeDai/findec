/**
 * Worker Thread entry point for single-symbol backtest execution.
 * Runs in isolation — re-implements executeBacktest logic to avoid
 * sharing memory state with the main thread.
 */
import { parentPort } from 'worker_threads'

// ── Types (mirrors src/lib/backtest-engine.ts) ─────────────────────────────────

interface Trade {
  symbol: string
  date: Date
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  value: number
  reason: string
}

interface BacktestResult {
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

interface BacktestConfig {
  initialCapital: number
  strategy: string
  parameters: Record<string, number>
}

interface WorkerData {
  symbol: string
  prices: Array<{ date: string | Date; open: number; high: number; low: number; close: number; volume: number }>
  config: BacktestConfig
}

interface WorkerResult {
  symbol: string
  result: BacktestResult | null
  error: string | null
}

interface HistoricalPrice {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ── Indicator calculations (copied from src/lib/backtest-engine.ts) ─────────────

function calculateMA(values: number[], period: number): number[] {
  const result: number[] = []
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += values[i - period + 1 + j]
    }
    result.push(sum / period)
  }
  return result
}

function calculateRSI(values: number[], period: number): number[] {
  const changes: number[] = []
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1])
  }

  const gains: number[] = changes.map(c => (c > 0 ? c : 0))
  const losses: number[] = changes.map(c => (c < 0 ? -c : 0))

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

  const result: number[] = []
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }
  return result
}

function calculateMACD(
  values: number[],
  fast: number,
  slow: number,
  signal: number
): Array<{ MACD: number; signal: number; histogram: number }> {
  const fastEMA = calculateEMAInternal(values, fast)
  const slowEMA = calculateEMAInternal(values, slow)

  const macdLine: number[] = []
  const offset = slow - fast
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + offset] - slowEMA[i])
  }

  const signalLine = calculateEMAInternal(macdLine, signal)
  const result: Array<{ MACD: number; signal: number; histogram: number }> = []
  const signalOffset = signal - 1

  for (let i = 0; i < signalLine.length; i++) {
    const macdVal = macdLine[i + signalOffset]
    const sigVal = signalLine[i]
    result.push({
      MACD: macdVal,
      signal: sigVal,
      histogram: macdVal - sigVal,
    })
  }
  return result
}

function calculateEMAInternal(values: number[], period: number): number[] {
  const multiplier = 2 / (period + 1)
  const result: number[] = [values[0]]
  for (let i = 1; i < values.length; i++) {
    result.push((values[i] - result[i - 1]) * multiplier + result[i - 1])
  }
  return result
}

function calculateBollingerBands(
  values: number[],
  period: number,
  stdDev: number
): Array<{ upper: number; middle: number; lower: number }> {
  const result: Array<{ upper: number; middle: number; lower: number }> = []
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += values[i - period + 1 + j]
    }
    const middle = sum / period
    let variance = 0
    for (let j = 0; j < period; j++) {
      variance += Math.pow(values[i - period + 1 + j] - middle, 2)
    }
    const sd = Math.sqrt(variance / period)
    result.push({
      upper: middle + stdDev * sd,
      middle,
      lower: middle - stdDev * sd,
    })
  }
  return result
}

function calculateMomentum(values: number[], period: number): number[] {
  const result: number[] = []
  for (let i = period; i < values.length; i++) {
    result.push(((values[i] - values[i - period]) / values[i - period]) * 100)
  }
  return result
}

function calculateMaxDrawdown(equityCurve: { date: Date; value: number }[]): number {
  let maxDrawdown = 0
  let peak = equityCurve[0].value
  for (const point of equityCurve) {
    if (point.value > peak) peak = point.value
    const drawdown = (peak - point.value) / peak
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }
  return maxDrawdown * 100
}

function calculateSharpeRatio(returns: number[], riskFreeRate = 0.02): number {
  if (returns.length < 2) return 0
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  if (stdDev === 0) return 0
  return (avgReturn * 252 - riskFreeRate) / (stdDev * Math.sqrt(252))
}

// ── Main backtest function ─────────────────────────────────────────────────────

function executeBacktest(data: HistoricalPrice[], config: BacktestConfig): BacktestResult {
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

  const maShort = calculateMA(closes, shortWindow)
  const maLong = calculateMA(closes, longWindow)
  const rsiValues = calculateRSI(closes, parameters.rsiPeriod || 14)
  const macdValues = calculateMACD(
    closes,
    parameters.macdFast || 12,
    parameters.macdSlow || 26,
    parameters.macdSignal || 9
  )
  const bollingerValues = calculateBollingerBands(
    closes,
    parameters.bollingerPeriod || 20,
    parameters.bollingerStdDev || 2
  )
  const momentumValues = calculateMomentum(closes, parameters.momentumPeriod || 10)

  const equityCurve: { date: Date; value: number }[] = [{ date: dates[0], value: initialCapital }]
  const dailyReturns: number[] = []

  for (let i = 1; i < data.length; i++) {
    const currentPrice = closes[i]
    const currentDate = dates[i]
    let signal: 'BUY' | 'SELL' | null = null
    let reason = ''

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

        if (prevShort <= prevLong && currentShort > currentLong) {
          signal = 'BUY'
          reason = `MA Cross: ${shortWindow}-MA crosses above ${longWindow}-MA`
        } else if (prevShort >= prevLong && currentShort < currentLong) {
          signal = 'SELL'
          reason = `MA Cross: ${shortWindow}-MA crosses below ${longWindow}-MA`
        }
      }
    }

    if (strategy === 'rsi') {
      const rsiIdx = i - (parameters.rsiPeriod || 14)
      if (rsiIdx >= 0 && rsiIdx < rsiValues.length) {
        const rsi = rsiValues[rsiIdx]
        const rsiOversold = parameters.rsiOversold || 30
        const rsiOverbought = parameters.rsiOverbought || 70
        if (rsi < rsiOversold) { signal = 'BUY'; reason = `RSI ${rsi.toFixed(2)} oversold` }
        else if (rsi > rsiOverbought) { signal = 'SELL'; reason = `RSI ${rsi.toFixed(2)} overbought` }
      }
    }

    if (strategy === 'macd') {
      const macdIdx = i - 1
      if (macdIdx >= 1 && macdIdx < macdValues.length) {
        const current = macdValues[macdIdx]
        const prev = macdValues[macdIdx - 1]
        if (prev && current) {
          if (prev.MACD <= prev.signal && current.MACD > current.signal) {
            signal = 'BUY'; reason = 'MACD crosses above signal'
          } else if (prev.MACD >= prev.signal && current.MACD < current.signal) {
            signal = 'SELL'; reason = 'MACD crosses below signal'
          }
        }
      }
    }

    if (strategy === 'bollinger') {
      const bbIdx = i - (parameters.bollingerPeriod || 20)
      if (bbIdx >= 0 && bbIdx < bollingerValues.length) {
        const bb = bollingerValues[bbIdx]
        if (bb) {
          if (currentPrice <= bb.lower) { signal = 'BUY'; reason = 'Price touched lower Bollinger Band' }
          else if (currentPrice >= bb.upper) { signal = 'SELL'; reason = 'Price touched upper Bollinger Band' }
        }
      }
    }

    if (strategy === 'momentum') {
      const momentumIdx = i - (parameters.momentumPeriod || 10)
      if (momentumIdx >= 0 && momentumIdx < momentumValues.length) {
        const momentum = momentumValues[momentumIdx]
        const threshold = parameters.momentumThreshold || 5
        if (momentum > threshold) { signal = 'BUY'; reason = `Momentum ${momentum.toFixed(2)}% above ${threshold}%` }
        else if (momentum < -threshold) { signal = 'SELL'; reason = `Momentum ${momentum.toFixed(2)}% below -${threshold}%` }
      }
    }

    if (strategy === 'mean_reversion') {
      const period = parameters.meanReversionPeriod || 20
      const threshold = parameters.meanReversionThreshold || 5
      const maIdx = i - period
      if (maIdx >= 0) {
        let sum = 0
        for (let j = maIdx; j < i; j++) sum += closes[j]
        const ma = sum / period
        const deviation = ((currentPrice - ma) / ma) * 100
        if (deviation < -threshold) { signal = 'BUY'; reason = `Price ${deviation.toFixed(2)}% below MA` }
        else if (deviation > threshold && position) { signal = 'SELL'; reason = `Price ${deviation.toFixed(2)}% above MA` }
      }
    }

    if (strategy === 'trend_follow') {
      const maShortIdx = i - (shortWindow - 1)
      const maLongIdx = i - (longWindow - 1)
      if (maShortIdx >= 0 && maLongIdx >= 0) {
        const currentShort = maShort[maShortIdx]
        const currentLong = maLong[maLongIdx]
        if (currentShort > currentLong && !position) { signal = 'BUY'; reason = `Uptrend (${shortWindow}MA > ${longWindow}MA)` }
        else if (currentShort <= currentLong && position) { signal = 'SELL'; reason = `Downtrend (${shortWindow}MA <= ${longWindow}MA)` }
      }
    }

    if (position && stopLoss > 0) {
      const loss = ((position.entryPrice - currentPrice) / position.entryPrice) * 100
      if (loss >= stopLoss) { signal = 'SELL'; reason = `Stop Loss: -${loss.toFixed(2)}% triggered` }
    }

    if (position && takeProfit > 0) {
      const profit = ((currentPrice - position.entryPrice) / position.entryPrice) * 100
      if (profit >= takeProfit) { signal = 'SELL'; reason = `Take Profit: +${profit.toFixed(2)}% triggered` }
    }

    if (signal === 'BUY' && !position && capital > 0) {
      const quantity = Math.floor((capital * positionSize) / currentPrice)
      if (quantity > 0) {
        const value = quantity * currentPrice
        trades.push({
          symbol: 'STOCK',
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
  }

  const finalCapital = capital
  const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100

  const sellTrades = trades.filter(t => t.type === 'SELL')
  let wins = 0
  for (const sell of sellTrades) {
    const buyTrades = trades.filter(t => t.type === 'BUY' && t.date < sell.date)
    if (buyTrades.length > 0 && sell.value > buyTrades[buyTrades.length - 1].value) wins++
  }
  const totalTrades = sellTrades.length
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0

  return {
    trades,
    totalReturn,
    sharpeRatio: calculateSharpeRatio(dailyReturns),
    maxDrawdown: calculateMaxDrawdown(equityCurve),
    winRate,
    totalTrades,
    winningTrades: wins,
    losingTrades: totalTrades - wins,
    finalCapital,
    equityCurve,
  }
}

// ── Worker message handler ──────────────────────────────────────────────────────

parentPort?.on('message', (data: WorkerData) => {
  const { symbol, prices, config } = data

  try {
    // Serialize Date fields (worker threads can't transfer Date objects cleanly)
    const deserializedPrices = prices.map((p: { date: string | Date; open: number; high: number; low: number; close: number; volume: number }) => ({
      ...p,
      date: new Date(p.date),
    }))

    const result = executeBacktest(deserializedPrices, config as BacktestConfig)

    const response: WorkerResult = {
      symbol,
      result,
      error: null,
    }
    parentPort!.postMessage(response)
  } catch (err) {
    const response: WorkerResult = {
      symbol,
      result: null,
      error: err instanceof Error ? err.message : String(err),
    }
    parentPort!.postMessage(response)
  }
})
