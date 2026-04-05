import { NextRequest, NextResponse } from 'next/server'
import { calculatePortfolioExposure, BARRA_FACTORS, getStockFactorProfile } from '@/lib/portfolio/factor-exposure'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { positions } = body

    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      return NextResponse.json({ error: '持仓数据不能为空', code: 'POSITIONS_REQUIRED' }, { status: 400 })
    }

    const normalized = positions.map((p: { symbol: string; weight?: number; shares?: number; price?: number }) => ({
      symbol: p.symbol,
      weight: p.weight ?? 0,
      shares: p.shares,
      price: p.price,
    }))

    const result = calculatePortfolioExposure(normalized)

    return NextResponse.json({
      ...result,
      availableFactors: BARRA_FACTORS,
    })
  } catch (error) {
    return NextResponse.json(
      { error: '因子暴露度分析失败', code: 'EXPOSURE_ERROR' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    description: '组合因子暴露度分析（Barra 风格）',
    factors: BARRA_FACTORS,
    mockProfiles: Object.keys({}).length,
  })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol } = body

    if (!symbol) {
      return NextResponse.json({ error: '股票代码不能为空', code: 'SYMBOL_REQUIRED' }, { status: 400 })
    }

    const profile = getStockFactorProfile(symbol)

    return NextResponse.json({ profile })
  } catch (error) {
    return NextResponse.json(
      { error: '获取因子画像失败', code: 'FACTOR_PROFILE_ERROR' },
      { status: 500 }
    )
  }
}
