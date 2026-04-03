import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, symbols, startDate, endDate, initialCapital } = body

    if (!name || !symbols || !startDate || !endDate || !initialCapital) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const backtest = await prisma.backtestPlan.create({
      data: {
        name,
        symbols: Array.isArray(symbols) ? symbols.join(',') : symbols,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        initialCapital: parseFloat(initialCapital),
      },
    })

    return NextResponse.json(backtest, { status: 201 })
  } catch (error) {
    console.error('Error creating backtest:', error)
    return NextResponse.json(
      { error: 'Failed to create backtest' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const backtests = await prisma.backtestPlan.findMany({
      include: {
        trades: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json(backtests)
  } catch (error) {
    console.error('Error fetching backtests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch backtests' },
      { status: 500 }
    )
  }
}