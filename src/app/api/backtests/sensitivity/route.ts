import { NextRequest, NextResponse } from 'next/server'
import { runSensitivityAnalysis, SensitivityResult } from '@/lib/backtest/sensitivity-analysis'
import { BacktestConfig } from '@/lib/backtest-engine'
import { getHistoricalData } from '@/lib/yahoo-finance'
import { handleApiError, Errors } from '@/lib/errors'

interface SensitivityRequest {
  symbol: string
  config: BacktestConfig
  targetParam: string
  paramRange: number[]
  targetMetric: 'totalReturn' | 'sharpeRatio' | 'maxDrawdown'
}

export async function POST(request: NextRequest) {
  try {
    const body: SensitivityRequest = await request.json()
    const { symbol, config, targetParam, paramRange, targetMetric } = body

    if (!symbol || !config || !targetParam || !paramRange || !targetMetric) {
      throw Errors.badRequest('缺少必要参数')
    }

    if (!Array.isArray(paramRange) || paramRange.length === 0) {
      throw Errors.badRequest('参数范围必须是非空数组')
    }

    const data = await getHistoricalData(symbol, '1y')
    
    if (!data || data.length === 0) {
      throw Errors.notFound('无法获取历史数据')
    }

    const result = await runSensitivityAnalysis(
      data,
      config,
      targetParam,
      paramRange,
      targetMetric
    )

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
