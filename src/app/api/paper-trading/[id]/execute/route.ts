import { NextRequest, NextResponse } from 'next/server'
import { paperTradingEngine } from '@/lib/trading/paper-trading'
import { tradingExecutor } from '@/lib/trading/execution'

async function fetchPrice(symbol: string): Promise<number> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/quotes?symbol=${symbol}`)
  if (!res.ok) return 0
  const data = await res.json()
  return data.price || data.regularMarketPrice || 0
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const portfolio = paperTradingEngine.getPortfolio(id)
    if (!portfolio) {
      return NextResponse.json({ error: '组合不存在' }, { status: 404 })
    }

    const executed: import('@/lib/trading/execution').ExecutionResult[] = []
    for (const position of portfolio.positions) {
      const price = await fetchPrice(position.symbol)
      if (price > 0) {
        await paperTradingEngine.updatePrice(position.symbol, price)
        const results = await tradingExecutor.checkAndTrigger(position.symbol, price)
        executed.push(...results)
      }
    }

    return NextResponse.json({
      executed: executed.length,
      results: executed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('POST /api/paper-trading/[id]/execute error:', error)
    return NextResponse.json({ error: '执行订单失败' }, { status: 500 })
  }
}
