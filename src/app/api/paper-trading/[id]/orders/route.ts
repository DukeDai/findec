import { NextRequest, NextResponse } from 'next/server'
import { placeOrder, cancelOrder, getOrders } from '@/lib/paper-trade'
import { createLogger } from '@/lib/logger'

const logger = createLogger('paper-trading-api')

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orders = await getOrders(id)
    return NextResponse.json(orders)
  } catch (error) {
    logger.error('Failed to get orders', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { symbol, side, type, price, quantity } = body

    if (!symbol || !side || !type || !quantity) {
      return NextResponse.json({ error: 'symbol, side, type, quantity required' }, { status: 400 })
    }
    if (!['BUY', 'SELL'].includes(side)) {
      return NextResponse.json({ error: 'side must be BUY or SELL' }, { status: 400 })
    }
    if (!['MARKET', 'LIMIT'].includes(type)) {
      return NextResponse.json({ error: 'type must be MARKET or LIMIT' }, { status: 400 })
    }
    if (type === 'LIMIT' && (!price || price <= 0)) {
      return NextResponse.json({ error: 'LIMIT order requires a positive price' }, { status: 400 })
    }

    const order = await placeOrder({ accountId: id, symbol, side, type, price, quantity })
    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    logger.error('Failed to place order', error)
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { orderId } = await request.json()
    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 })
    }
    const cancelled = await cancelOrder(orderId)
    if (!cancelled) {
      return NextResponse.json({ error: 'Order not found or already processed' }, { status: 404 })
    }
    return NextResponse.json(cancelled)
  } catch (error) {
    logger.error('Failed to cancel order', error)
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
  }
}
