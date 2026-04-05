import { NextRequest, NextResponse } from 'next/server'
import { evaluateFormula, validateFormula } from '@/lib/indicators/formula-engine'
import { createLogger } from '@/lib/logger'

const logger = createLogger('formula-api')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, formula, range = '1mo' } = body

    if (!symbol || !formula) {
      return NextResponse.json({ error: 'symbol and formula are required', code: 'PARAMS_REQUIRED' }, { status: 400 })
    }

    const validation = validateFormula(formula)
    if (!validation.valid) {
      return NextResponse.json({ error: '公式格式无效', code: 'INVALID_FORMULA' }, { status: 400 })
    }

    const historyRes = await fetch(
      `http://localhost:3000/api/history?symbol=${symbol}&range=${range}`
    )
    if (!historyRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch price data', code: 'FETCH_DATA_ERROR' }, { status: 502 })
    }
    const history = await historyRes.json()

    if (!history.data || history.data.length === 0) {
      return NextResponse.json({ error: 'No price data available', code: 'NO_DATA_AVAILABLE' }, { status: 404 })
    }

    const ctx = {
      open: history.data.map((d: { open: number }) => d.open),
      high: history.data.map((d: { high: number }) => d.high),
      low: history.data.map((d: { low: number }) => d.low),
      close: history.data.map((d: { close: number }) => d.close),
      volume: history.data.map((d: { volume: number }) => d.volume),
    }

    const result = evaluateFormula(formula, ctx)

    return NextResponse.json({
      symbol,
      formula,
      latest: result.latest,
      length: result.length,
      sampleValues: result.values.slice(-20).map((v, i) => ({
        index: result.length - 20 + i,
        value: v,
      })),
    })
  } catch (error) {
    logger.error('Formula evaluation failed', error)
    return NextResponse.json({ error: 'Formula evaluation failed', code: 'EVALUATION_ERROR' }, { status: 500 })
  }
}
