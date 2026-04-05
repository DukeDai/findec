import { NextResponse } from 'next/server'
import { calculatePortfolioMetrics } from '@/lib/portfolio-metrics'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const metrics = await calculatePortfolioMetrics(id)

    if (!metrics) {
      return NextResponse.json(
        { error: 'Portfolio not found', code: 'PORTFOLIO_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error calculating portfolio metrics:', error)
    return NextResponse.json(
      { error: 'Failed to calculate metrics', code: 'METRICS_ERROR' },
      { status: 500 }
    )
  }
}