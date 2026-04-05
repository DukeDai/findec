import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError, Errors } from '@/lib/errors'

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
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      throw Errors.badRequest('名称为必填项')
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
    return handleApiError(error)
  }
}