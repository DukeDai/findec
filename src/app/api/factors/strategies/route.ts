import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError, Errors } from '@/lib/errors'

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
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, rules } = body

    if (!name) {
      throw Errors.badRequest('策略名称是必填项')
    }

    const strategy = await prisma.factorStrategy.create({
      data: {
        name,
        description,
        rules: rules ? {
          create: rules.map((rule: { field: string; operator: string; value: unknown; weight?: number }) => ({
            field: rule.field,
            operator: rule.operator,
            value: rule.value,
            weight: rule.weight ?? 1.0,
          })),
        } : undefined,
      },
      include: {
        rules: true,
      },
    })

    return NextResponse.json(strategy, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}