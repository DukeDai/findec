import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const strategies = await prisma.customStrategy.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json(strategies)
  } catch (error) {
    console.error('Error fetching strategies:', error)
    return NextResponse.json(
      { error: '获取策略列表失败', code: 'FETCH_STRATEGIES_FAILED' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, rules, actions } = body

    if (!name) {
      return NextResponse.json(
        { error: '策略名称不能为空', code: 'NAME_REQUIRED' },
        { status: 400 }
      )
    }

    if (!rules) {
      return NextResponse.json(
        { error: '策略规则不能为空', code: 'RULES_REQUIRED' },
        { status: 400 }
      )
    }

    const strategy = await prisma.customStrategy.create({
      data: {
        name,
        description,
        rules,
        actions: actions || {},
      },
    })

    return NextResponse.json(strategy, { status: 201 })
  } catch (error) {
    console.error('Error creating strategy:', error)
    return NextResponse.json(
      { error: '创建策略失败', code: 'CREATE_STRATEGY_FAILED' },
      { status: 500 }
    )
  }
}
