import { NextRequest, NextResponse } from 'next/server'
import { EventSignalEngine, EVENT_IMPACT_MODELS } from '@/lib/backtest/event-signal-engine'
import type { HistoricalPrice } from '@/lib/indicators'
import { handleApiError, Errors } from '@/lib/errors'

interface BacktestConfig {
  initialCapital: number
  strategy: string
  parameters: Record<string, number>
}

interface Trade {
  date: Date
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  symbol: string
  reason: string
  isEventDriven?: boolean
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
  equityCurve: Array<{ date: Date; value: number }>
  eventSignals: Array<{ date: Date; symbol: string; type: string; reason: string; confidence: number }>
  eventCalendar: Array<{ date: string; symbol: string; type: string; description?: string }>
}

function executeBacktest(
  data: HistoricalPrice[],
  config: BacktestConfig,
  eventEngine: EventSignalEngine
): BacktestResult {
  const closes = data.map(d => d.close)
  const dates = data.map(d => d.date)
  const { initialCapital, strategy, parameters } = config

  const trades: Trade[] = []
  let capital = initialCapital
  let position: { symbol: string; quantity: number; entryPrice: number } | null = null
  const equityCurve: Array<{ date: Date; value: number }> = [{ date: dates[0], value: initialCapital }]
  const dailyReturns: number[] = []
  const eventSignalLog: Array<{ date: Date; symbol: string; type: string; reason: string; confidence: number }> = []

  const shortWindow = parameters.shortWindow || 10
  const longWindow = parameters.longWindow || 30
  const positionSize = parameters.positionSize || 0.1
  const enableEvents = parameters.enableEvents !== 0

  const maShort: number[] = []
  for (let i = shortWindow - 1; i < closes.length; i++) {
    let sum = 0
    for (let j = 0; j < shortWindow; j++) sum += closes[i - shortWindow + 1 + j]
    maShort.push(sum / shortWindow)
  }

  const maLong: number[] = []
  for (let i = longWindow - 1; i < closes.length; i++) {
    let sum = 0
    for (let j = 0; j < longWindow; j++) sum += closes[i - longWindow + 1 + j]
    maLong.push(sum / longWindow)
  }

  for (let i = 1; i < data.length; i++) {
    const currentPrice = closes[i]
    const currentDate = dates[i]
    let signal: 'BUY' | 'SELL' | null = null
    let reason = ''

    if (strategy === 'ma_crossover') {
      const maShortIdx = i - (shortWindow - 1)
      const maLongIdx = i - (longWindow - 1)
      const prevMaShortIdx = i - shortWindow
      const prevMaLongIdx = i - longWindow

      if (maShortIdx >= 0 && maLongIdx >= 0 && prevMaShortIdx >= 0 && prevMaLongIdx >= 0) {
        const cs = maShort[maShortIdx]
        const cl = maLong[maLongIdx]
        const ps = maShort[prevMaShortIdx]
        const pl = maLong[prevMaLongIdx]

        if (ps <= pl && cs > cl) { signal = 'BUY'; reason = 'MA CrossBUY' }
        else if (ps >= pl && cs < cl) { signal = 'SELL'; reason = 'MA CrossSELL' }
      }
    }

    if (enableEvents && signal === null) {
      const eventSignal = eventEngine.generateEventSignals('STOCK', currentDate, data.slice(0, i + 1))
      if (eventSignal && eventSignal.confidence > 0.3) {
        if (eventSignal.type === 'BUY' && !position) {
          signal = 'BUY'
          reason = `[事件] ${eventSignal.reason}`
        } else if (eventSignal.type === 'SELL' && position) {
          signal = 'SELL'
          reason = `[事件] ${eventSignal.reason}`
        }
        if (signal) {
          eventSignalLog.push({
            date: currentDate,
            symbol: eventSignal.event.symbol,
            type: eventSignal.event.type,
            reason: eventSignal.reason,
            confidence: eventSignal.confidence,
          })
        }
      }
    }

    if (signal === 'BUY' && !position && capital > 0) {
      const quantity = Math.floor((capital * positionSize) / currentPrice)
      if (quantity > 0) {
        const value = quantity * currentPrice
        trades.push({
          date: currentDate,
          type: 'BUY',
          price: currentPrice,
          quantity,
          symbol: 'STOCK',
          reason,
          isEventDriven: reason.startsWith('[事件]'),
        })
        position = { symbol: 'STOCK', quantity, entryPrice: currentPrice }
        capital -= value
      }
    } else if (signal === 'SELL' && position) {
      const value = position.quantity * currentPrice
      trades.push({
        date: currentDate,
        type: 'SELL',
        price: currentPrice,
        quantity: position.quantity,
        symbol: position.symbol,
        reason,
        isEventDriven: reason.startsWith('[事件]'),
      })
      capital += value
      position = null
    }

    const currentEquity = capital + (position ? position.quantity * currentPrice : 0)
    equityCurve.push({ date: currentDate, value: currentEquity })

    if (equityCurve.length > 1) {
      const dr = (currentEquity - equityCurve[equityCurve.length - 2].value) / equityCurve[equityCurve.length - 2].value
      dailyReturns.push(dr)
    }
  }

  if (position) {
    const lastPrice = closes[closes.length - 1]
    const value = position.quantity * lastPrice
    trades.push({
      date: dates[dates.length - 1],
      type: 'SELL',
      price: lastPrice,
      quantity: position.quantity,
      symbol: position.symbol,
      reason: 'End of backtest',
      isEventDriven: false,
    })
    capital += value
    position = null
  }

  const totalReturn = ((capital - initialCapital) / initialCapital) * 100

  const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0
  const variance = dailyReturns.length > 0 ? dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / dailyReturns.length : 0
  const stdDev = Math.sqrt(variance)
  const sharpeRatio = stdDev > 0 ? (avgReturn * 252 - 0.02) / (stdDev * Math.sqrt(252)) : 0

  let maxDrawdown = 0
  let peak = equityCurve[0].value
  for (const p of equityCurve) {
    if (p.value > peak) peak = p.value
    const dd = (peak - p.value) / peak
    if (dd > maxDrawdown) maxDrawdown = dd
  }
  maxDrawdown *= 100

  const sellTrades = trades.filter(t => t.type === 'SELL')
  let wins = 0
  for (const sell of sellTrades) {
    const buys = trades.filter(t => t.type === 'BUY' && t.date < sell.date)
    if (buys.length > 0 && sell.price > buys[buys.length - 1].price) wins++
  }
  const winRate = sellTrades.length > 0 ? (wins / sellTrades.length) * 100 : 0

  const eventCalendar = eventSignalLog.map(e => ({
    date: e.date instanceof Date ? (e.date as Date).toISOString() : String(e.date),
    symbol: e.symbol,
    type: e.type,
    reason: e.reason,
  }))

  return {
    trades,
    totalReturn,
    sharpeRatio,
    maxDrawdown,
    winRate,
    totalTrades: trades.length,
    winningTrades: wins,
    losingTrades: sellTrades.length - wins,
    finalCapital: capital,
    equityCurve,
    eventSignals: eventSignalLog,
    eventCalendar,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      symbols,
      strategy = 'ma_crossover',
      parameters = {},
      initialCapital = 100000,
      startDate,
      endDate,
      enableEvents = true,
      eventConfig = {},
    } = body

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw Errors.badRequest('股票代码列表不能为空')
    }

    if (!startDate || !endDate) {
      throw Errors.badRequest('开始日期和结束日期不能为空')
    }

    const eventEngine = new EventSignalEngine()

    if (enableEvents) {
      for (const symbol of symbols) {
        const response = await fetch(
          `${request.nextUrl.origin}/api/history?symbol=${encodeURIComponent(symbol)}&start=${startDate}&end=${endDate}`
        )
        if (response.ok) {
          const json = await response.json()
          const prices: HistoricalPrice[] = (json.data ?? []).map((d: { date: string; open: number; high: number; low: number; close: number; volume: number }) => ({
            date: new Date(d.date),
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume,
          }))
          if (prices.length > 0) {
            eventEngine.addMockEarningsEvents([symbol], prices)
            eventEngine.addMockMacroEvents(prices)
          }
        }
      }
    }

    const allTrades: Trade[] = []
    const allEquityCurves: Array<{ date: string; value: number }>[] = []
    const allEventCalendar: ReturnType<typeof executeBacktest>['eventCalendar'][] = []

    for (const symbol of symbols) {
      const response = await fetch(
        `${request.nextUrl.origin}/api/history?symbol=${encodeURIComponent(symbol)}&start=${startDate}&end=${endDate}`
      )

      if (!response.ok) continue

      const json = await response.json()
      const prices: HistoricalPrice[] = (json.data ?? []).map((d: { date: string; open: number; high: number; low: number; close: number; volume: number }) => ({
        date: new Date(d.date),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }))

      if (prices.length === 0) continue

      const symbolCapital = initialCapital / symbols.length
      const result = executeBacktest(prices, { initialCapital: symbolCapital, strategy, parameters }, eventEngine)

      const symbolTrades: Trade[] = result.trades.map(t => ({
        ...t,
        date: t.date,
        symbol,
        reason: t.reason,
        isEventDriven: t.isEventDriven,
      }))
      allTrades.push(...symbolTrades)
      allEquityCurves.push(result.equityCurve.map(p => ({
        date: p.date instanceof Date ? (p.date as Date).toISOString().split('T')[0] : String(p.date),
        value: p.value,
      })))
      allEventCalendar.push(result.eventCalendar)
    }

    const mergedEquity: Array<{ date: string; value: number }> = []
    const allDates = new Set<string>()
    allEquityCurves.forEach(curve => curve.forEach(p => allDates.add(p.date)))
    const sortedDates = Array.from(allDates).sort()

    for (const date of sortedDates) {
      let totalValue = 0
      let count = 0
      allEquityCurves.forEach(curve => {
        const point = curve.find(p => p.date === date)
        if (point) { totalValue += point.value; count++ }
      })
      if (count > 0) {
        mergedEquity.push({ date, value: totalValue })
      }
    }

    const portfolioReturn = mergedEquity.length > 1
      ? (mergedEquity[mergedEquity.length - 1].value - mergedEquity[0].value) / mergedEquity[0].value * 100
      : 0

    return NextResponse.json({
      symbols,
      strategy,
      enableEvents,
      metrics: {
        totalReturn: portfolioReturn,
        totalTrades: allTrades.length,
        eventDrivenTrades: allTrades.filter(t => t.isEventDriven).length,
        symbolsCompleted: symbols.length,
      },
      equityCurve: mergedEquity,
      trades: allTrades.map(t => ({
        ...t,
        date: t.date instanceof Date ? (t.date as Date).toISOString() : String(t.date),
      })),
      eventCalendar: allEventCalendar.flat(),
      eventImpactModels: EVENT_IMPACT_MODELS,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
