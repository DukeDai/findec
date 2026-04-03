import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const strategies = await prisma.factorStrategy.findMany({
      include: {
        rules: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json(strategies)
  } catch (error) {
    console.error('Error fetching strategies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch strategies' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, rules } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const strategy = await prisma.factorStrategy.create({
      data: {
        name,
        description,
        rules: rules ? {
          create: rules.map((rule: any) => ({
            field: rule.field,
            operator: rule.operator,
            value: rule.value,
            weight: rule.weight || 1.0,
          })),
        } : undefined,
      },
      include: {
        rules: true,
      },
    })

    return NextResponse.json(strategy, { status: 201 })
  } catch (error) {
    console.error('Error creating strategy:', error)
    return NextResponse.json(
      { error: 'Failed to create strategy' },
      { status: 500 }
    )
  }
}