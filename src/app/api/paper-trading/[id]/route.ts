import { NextRequest, NextResponse } from 'next/server'
import { paperTradingEngine } from '@/lib/trading/paper-trading'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const portfolio = paperTradingEngine.getSerializablePortfolio(id)
    if (!portfolio) {
      return NextResponse.json({ error: '组合不存在' }, { status: 404 })
    }
    return NextResponse.json(portfolio)
  } catch (error) {
    console.error('GET /api/paper-trading/[id] error:', error)
    return NextResponse.json({ error: '获取组合详情失败' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deleted = paperTradingEngine.deletePortfolio(id)
    if (!deleted) {
      return NextResponse.json({ error: '组合不存在' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/paper-trading/[id] error:', error)
    return NextResponse.json({ error: '删除组合失败' }, { status: 500 })
  }
}
