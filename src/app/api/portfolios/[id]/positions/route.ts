import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const positions = await prisma.position.findMany({
      where: { portfolioId: id },
    })
    return NextResponse.json(positions)
  } catch (error) {
    console.error('Error fetching positions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch positions', code: 'FETCH_POSITIONS_FAILED' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { symbol, quantity, price, type } = body

    if (!symbol || !quantity || !price || !type) {
      return NextResponse.json(
        { error: 'symbol, quantity, price, and type are required', code: 'POSITION_PARAMS_REQUIRED' },
        { status: 400 }
      )
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found', code: 'PORTFOLIO_NOT_FOUND' },
        { status: 404 }
      )
    }

    const quantityNum = parseFloat(quantity)
    const priceNum = parseFloat(price)
    const total = quantityNum * priceNum

    const position = await prisma.position.upsert({
      where: {
        id: `${id}-${symbol.toUpperCase()}`,
      },
      create: {
        portfolioId: id,
        symbol: symbol.toUpperCase(),
        quantity: quantityNum,
        avgCost: priceNum,
        currentPrice: priceNum,
      },
      update: {
        quantity: type === 'buy' 
          ? { increment: quantityNum }
          : { decrement: quantityNum },
        avgCost: priceNum,
      },
    })

    await prisma.transaction.create({
      data: {
        portfolioId: id,
        symbol: symbol.toUpperCase(),
        type,
        quantity: quantityNum,
        price: priceNum,
        total,
        date: new Date(),
      },
    })

    return NextResponse.json(position, { status: 201 })
  } catch (error) {
    console.error('Error adding position:', error)
    return NextResponse.json(
      { error: 'Failed to add position', code: 'ADD_POSITION_FAILED' },
      { status: 500 }
    )
  }
}