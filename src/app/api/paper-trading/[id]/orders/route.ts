import { NextRequest, NextResponse } from 'next/server'
import { tradingExecutor } from '@/lib/trading/execution'
import { paperTradingEngine } from '@/lib/trading/paper-trading'

interface PlaceOrderBody {
  symbol: string
  side: 'BUY' | 'SELL'
  orderType: 'stop_loss' | 'take_profit'
  triggerPrice: number
  quantity: number
  limitPrice?: number
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
    const orders = tradingExecutor.getOrdersByPortfolio(id)
    return NextResponse.json(orders)
  } catch (error) {
    console.error('GET /api/paper-trading/[id]/orders error:', error)
    return NextResponse.json({ error: '获取条件单列表失败' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: PlaceOrderBody = await request.json()
    const { symbol, side, orderType, triggerPrice, quantity, limitPrice } = body

    if (!symbol || !side || !orderType || !quantity) {
      return NextResponse.json({ error: 'symbol, side, orderType, quantity 为必填项' }, { status: 400 })
    }
    if (!['stop_loss', 'take_profit'].includes(orderType)) {
      return NextResponse.json({ error: 'orderType 必须为 stop_loss 或 take_profit' }, { status: 400 })
    }
    if (typeof triggerPrice !== 'number' || triggerPrice <= 0) {
      return NextResponse.json({ error: 'triggerPrice 必须为正数' }, { status: 400 })
    }

    const portfolio = paperTradingEngine.getPortfolio(id)
    if (!portfolio) {
      return NextResponse.json({ error: '组合不存在' }, { status: 404 })
    }
    const position = portfolio.positionsMap.get(symbol.toUpperCase())
    if (!position) {
      return NextResponse.json({ error: '该持仓不存在，无法设置条件单' }, { status: 400 })
    }

    const order = await tradingExecutor.placeConditionalOrder({
      symbol: symbol.toUpperCase(),
      action: orderType,
      orderType: limitPrice ? 'limit' : 'market',
      triggerPrice,
      limitPrice,
      quantity,
      entryPrice: position.entryPrice,
      portfolioId: id,
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('POST /api/paper-trading/[id]/orders error:', error)
    return NextResponse.json({ error: '创建条件单失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orderId } = await request.json()
    if (!orderId) {
      return NextResponse.json({ error: 'orderId 为必填项' }, { status: 400 })
    }
    const cancelled = tradingExecutor.cancelOrder(orderId)
    if (!cancelled) {
      return NextResponse.json({ error: '订单不存在或已处理' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/paper-trading/[id]/orders error:', error)
    return NextResponse.json({ error: '取消条件单失败' }, { status: 500 })
  }
}
