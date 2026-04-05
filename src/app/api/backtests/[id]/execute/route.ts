import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { executeBacktest, BacktestConfig } from '@/lib/backtest-engine'
import { HistoricalPrice } from '@/lib/indicators'

type TradeRecord = {
  planId: string
  symbol: string
  type: string
  quantity: number
  price: number
  date: string | Date
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { strategy = 'ma_crossover', parameters = {} } = body

    const backtest = await prisma.backtestPlan.findUnique({
      where: { id },
      include: { trades: true },
    })

    if (!backtest) {
      return NextResponse.json({ error: 'Backtest not found' }, { status: 404 })
    }

    const symbols = backtest.symbols.split(',').map(s => s.trim())
    const startDate = new Date(backtest.startDate)
    const endDate = new Date(backtest.endDate)

    let allTrades: TradeRecord[] = []
    let totalReturn = 0
    let sharpeRatio = 0
    let maxDrawdown = 0
    let totalTrades = 0
    let equityCurve: { date: string; value: number }[] = []

    for (const symbol of symbols) {
      const response = await fetch(
        `http://localhost:3000/api/history?symbol=${symbol}&start=${startDate.toISOString().split('T')[0]}&end=${endDate.toISOString().split('T')[0]}`
      )

      if (!response.ok) {
        continue
      }

      const data = await response.json()

      if (!data.data || data.data.length === 0) {
        continue
      }

      const prices: HistoricalPrice[] = (data.data as { date: string; open: number; high: number; low: number; close: number; volume: number }[]).map((d) => ({
        date: new Date(d.date),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }))

      const config: BacktestConfig = {
        initialCapital: backtest.initialCapital / symbols.length,
        strategy,
        parameters: {
          shortWindow: 10,
          longWindow: 30,
          positionSize: 1.0,
          ...parameters,
        },
      }

      const result = executeBacktest(prices, config)

      const symbolTrades = result.trades.map(trade => ({
        planId: backtest.id,
        symbol,
        type: trade.type,
        quantity: trade.quantity,
        price: trade.price,
        date: trade.date,
      }))

      allTrades = [...allTrades, ...symbolTrades]

      totalReturn += result.totalReturn
      sharpeRatio += result.sharpeRatio
      maxDrawdown = Math.max(maxDrawdown, result.maxDrawdown)
      totalTrades += result.totalTrades

      if (result.equityCurve.length > equityCurve.length) {
        equityCurve = result.equityCurve.map(p => ({
          date: p.date.toISOString(),
          value: p.value,
        }))
      }
    }

    totalReturn = totalReturn / symbols.length
    sharpeRatio = sharpeRatio / symbols.length

    await prisma.backtestTrade.deleteMany({
      where: { planId: backtest.id },
    })

    await prisma.backtestTrade.createMany({
      data: allTrades,
    })

    const updatedBacktest = await prisma.backtestPlan.update({
      where: { id },
      data: {
        totalReturn,
        sharpeRatio,
        maxDrawdown,
      },
      include: { trades: true },
    })

    return NextResponse.json({
      ...updatedBacktest,
      equityCurve,
    })
  } catch (error) {
    console.error('Error executing backtest:', error)
    return NextResponse.json(
      { error: 'Failed to execute backtest' },
      { status: 500 }
    )
  }
}