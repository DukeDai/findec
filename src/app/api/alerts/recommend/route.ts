import { NextRequest, NextResponse } from 'next/server'
import { getAlertRecommendations } from '@/lib/realtime/smart-alert-recommender'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json(
        { error: '缺少股票代码参数' },
        { status: 400 }
      )
    }

    const recommendations = await getAlertRecommendations(symbol.toUpperCase())

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error('获取预警推荐失败:', error)
    return NextResponse.json(
      { error: '获取推荐失败', code: 'RECOMMEND_ERROR' },
      { status: 500 }
    )
  }
}
