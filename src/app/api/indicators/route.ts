import { NextRequest, NextResponse } from 'next/server'
import { getHistoricalData } from '@/lib/yahoo-finance'
import { calculateIndicators } from '@/lib/indicators'

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')
  const indicators = request.nextUrl.searchParams.get('indicators') || 'ma20,rsi'

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  const data = await getHistoricalData(symbol.toUpperCase(), '1y')

  if (data.length === 0) {
    return NextResponse.json({ error: 'No data available' }, { status: 404 })
  }

  const indicatorList = indicators.split(',')
  const options: {
    ma?: number[]
    ema?: number[]
    rsi?: number
    macd?: { fast: number; slow: number; signal: number }
  } = {}

  for (const ind of indicatorList) {
    if (ind.startsWith('ma')) {
      const period = parseInt(ind.replace('ma', ''))
      if (!isNaN(period)) {
        options.ma = [...(options.ma || []), period]
      }
    } else if (ind.startsWith('ema')) {
      const period = parseInt(ind.replace('ema', ''))
      if (!isNaN(period)) {
        options.ema = [...(options.ema || []), period]
      }
    } else if (ind === 'rsi') {
      options.rsi = 14
    } else if (ind === 'macd') {
      options.macd = { fast: 12, slow: 26, signal: 9 }
    }
  }

  const result = calculateIndicators(data, options)

  return NextResponse.json({
    symbol: symbol.toUpperCase(),
    indicators: result,
  })
}
