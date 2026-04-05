import { NextRequest, NextResponse } from 'next/server'
import { calculateReliability, TradeData } from '@/lib/backtest/reliability-scorer'
import type { EquityPoint } from '@/lib/backtest/risk-metrics'
import type { BacktestConfig } from '@/lib/backtest/engine'
import { handleApiError, Errors } from '@/lib/errors'

interface ReliabilityRequest {
  trades: TradeData[]
  equityCurve: EquityPoint[]
  config: BacktestConfig
}

export async function POST(request: NextRequest) {
  try {
    const body: ReliabilityRequest = await request.json()
    const { trades, equityCurve, config } = body

    if (!trades || !Array.isArray(trades)) {
      throw Errors.badRequest('交易数据格式错误，需提供有效的 trades 数组')
    }

    if (!equityCurve || !Array.isArray(equityCurve)) {
      throw Errors.badRequest('权益曲线数据格式错误，需提供有效的 equityCurve 数组')
    }

    if (!config || typeof config !== 'object') {
      throw Errors.badRequest('回测配置格式错误，需提供有效的 config 对象')
    }

    const score = calculateReliability(trades, equityCurve, config)

    return NextResponse.json(score)
  } catch (error) {
    return handleApiError(error)
  }
}
