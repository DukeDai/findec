import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError, Errors } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, symbols, startDate, endDate, initialCapital } = body

    if (!name || !symbols || !startDate || !endDate || !initialCapital) {
      throw Errors.badRequest('缺少必填字段')
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
    return handleApiError(error)
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
    return handleApiError(error)
  }
}