import { NextRequest, NextResponse } from 'next/server'
import { paperTradingEngine } from '@/lib/trading/paper-trading'

interface TradeRequestBody {
  symbol: string
  quantity: number
  type: 'BUY' | 'SELL'
  price: number
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const portfolio = paperTradingEngine.getPortfolio(id)
    if (!portfolio) {
      return NextResponse.json({ error: '组合不存在' }, { status: 404 })
    }
    return NextResponse.json(portfolio.trades.slice(-50))
  } catch (error) {
    console.error('GET /api/paper-trading/[id]/trades error:', error)
    return NextResponse.json({ error: '获取交易记录失败' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: TradeRequestBody = await request.json()
    const { symbol, quantity, type, price } = body

    if (!symbol || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ error: 'symbol 和正数 quantity 为必填项' }, { status: 400 })
    }
    if (!type || (type !== 'BUY' && type !== 'SELL')) {
      return NextResponse.json({ error: 'type 必须为 BUY 或 SELL' }, { status: 400 })
    }
    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'price 必须为正数' }, { status: 400 })
    }

    let trade: ReturnType<typeof paperTradingEngine.buy> | ReturnType<typeof paperTradingEngine.sell>
    if (type === 'BUY') {
      trade = paperTradingEngine.buy(id, symbol.toUpperCase(), quantity, price)
    } else {
      trade = paperTradingEngine.sell(id, symbol.toUpperCase(), quantity, price)
    }

    if (!trade) {
      if (type === 'BUY') {
        return NextResponse.json({ error: '资金不足，无法买入' }, { status: 400 })
      }
      return NextResponse.json({ error: '持仓不足或不存在，无法卖出' }, { status: 400 })
    }

    return NextResponse.json(trade, { status: 201 })
  } catch (error) {
    console.error('POST /api/paper-trading/[id]/trades error:', error)
    return NextResponse.json({ error: '执行交易失败' }, { status: 500 })
  }
}
