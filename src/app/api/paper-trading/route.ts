import { NextRequest, NextResponse } from 'next/server'
import { paperTradingEngine } from '@/lib/trading/paper-trading'

export async function GET() {
  try {
    const summaries: Array<{
      id: string
      name: string
      cash: number
      equity: number
      positionCount: number
      tradeCount: number
    }> = []

    for (const portfolio of paperTradingEngine.getPortfolios()) {
      summaries.push({
        id: portfolio.id,
        name: portfolio.name,
        cash: portfolio.cash,
        equity: portfolio.equity,
        positionCount: portfolio.positions.length,
        tradeCount: portfolio.trades.length,
      })
    }

    return NextResponse.json(summaries)
  } catch (error) {
    console.error('GET /api/paper-trading error:', error)
    return NextResponse.json({ error: '获取模拟交易组合列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, initialCash } = body

    if (!name) {
      return NextResponse.json({ error: '组合名称为必填项' }, { status: 400 })
    }

    const cash = typeof initialCash === 'number' && initialCash > 0 ? initialCash : 100000
    const id = `pt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const portfolio = paperTradingEngine.createPortfolio(id, name, cash)

    return NextResponse.json(
      {
        id: portfolio.id,
        name: portfolio.name,
        cash: portfolio.cash,
        equity: portfolio.equity,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/paper-trading error:', error)
    return NextResponse.json({ error: '创建模拟交易组合失败' }, { status: 500 })
  }
}
