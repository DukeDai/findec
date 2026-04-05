import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError, Errors } from '@/lib/errors'

export async function GET() {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json(alerts)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, condition, targetValue, message } = body

    if (!symbol || !condition) {
      throw Errors.badRequest('股票代码和条件是必填项')
    }

    const alert = await prisma.alert.create({
      data: {
        symbol: symbol.toUpperCase(),
        condition,
        targetValue: targetValue ? parseFloat(targetValue) : null,
        message: message || null,
      },
    })

    return NextResponse.json(alert, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}