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
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error calculating portfolio metrics:', error)
    return NextResponse.json(
      { error: 'Failed to calculate metrics' },
      { status: 500 }
    )
  }
}