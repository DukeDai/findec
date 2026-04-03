import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const portfolios = await prisma.portfolio.findMany({
      include: {
        positions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json(portfolios)
  } catch (error) {
    console.error('Error fetching portfolios:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolios' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        name,
        description,
      },
      include: {
        positions: true,
      },
    })

    return NextResponse.json(portfolio, { status: 201 })
  } catch (error) {
    console.error('Error creating portfolio:', error)
    return NextResponse.json(
      { error: 'Failed to create portfolio' },
      { status: 500 }
    )
  }
}