import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  Strategy,
  findSimilarStrategies,
} from '@/lib/strategies/similarity-search'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetStrategy } = body

    if (!targetStrategy) {
      return NextResponse.json(
        { error: '目标策略不能为空', code: 'STRATEGY_REQUIRED' },
        { status: 400 }
      )
    }

    const dbStrategies = await prisma.customStrategy.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    const allStrategies: Strategy[] = dbStrategies.map(s => ({
      id: s.id,
      name: s.name,
      type: 'custom',
      symbols: [],
      parameters: {},
      createdAt: s.createdAt,
    }))

    const target: Strategy = {
      id: targetStrategy.id,
      name: targetStrategy.name,
      type: targetStrategy.type || 'custom',
      symbols: targetStrategy.symbols || [],
      parameters: targetStrategy.parameters || {},
      dateRange: targetStrategy.dateRange,
      createdAt: targetStrategy.createdAt
        ? new Date(targetStrategy.createdAt)
        : undefined,
    }

    const similarStrategies = await findSimilarStrategies(
      target,
      allStrategies,
      5
    )

    return NextResponse.json({
      target: target.name,
      results: similarStrategies,
    })
  } catch (error) {
    console.error('Error finding similar strategies:', error)
    return NextResponse.json(
      { error: '查找相似策略失败', code: 'SIMILARITY_SEARCH_FAILED' },
      { status: 500 }
    )
  }
}
