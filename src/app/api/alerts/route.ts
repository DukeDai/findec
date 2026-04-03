import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, condition, targetValue, message } = body

    if (!symbol || !condition) {
      return NextResponse.json(
        { error: 'Symbol and condition are required' },
        { status: 400 }
      )
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
    console.error('Error creating alert:', error)
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}