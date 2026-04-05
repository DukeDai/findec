import { NextRequest, NextResponse } from 'next/server'
import { executePendingOrders, updatePositionPrices } from '@/lib/paper-trade'
import { createLogger } from '@/lib/logger'

const logger = createLogger('paper-trading-api')

async function fetchPrice(symbol: string): Promise<number> {
  const res = await fetch(`http://localhost:3000/api/quotes?symbol=${symbol}`)
  if (!res.ok) throw new Error(`Failed to fetch price for ${symbol}`)
  const data = await res.json()
  return data.price || data.regularMarketPrice || 0
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await updatePositionPrices(id, fetchPrice)

    const filled = await executePendingOrders(id, fetchPrice)

    return NextResponse.json({
      executed: filled.length,
      orders: filled,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to execute paper orders', error)
    return NextResponse.json({ error: 'Failed to execute orders', code: 'EXECUTE_ORDERS_FAILED' }, { status: 500 })
  }
}
