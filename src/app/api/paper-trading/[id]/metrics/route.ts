import { NextRequest, NextResponse } from 'next/server'
import { paperTradingEngine } from '@/lib/trading/paper-trading'

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
    const metrics = paperTradingEngine.calculateMetrics(id)
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('GET /api/paper-trading/[id]/metrics error:', error)
    return NextResponse.json({ error: '获取绩效指标失败' }, { status: 500 })
  }
}
