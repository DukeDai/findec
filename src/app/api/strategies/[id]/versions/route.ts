import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const strategy = await prisma.customStrategy.findUnique({
      where: { id },
    })

    if (!strategy) {
      return NextResponse.json(
        { error: '策略不存在', code: 'STRATEGY_NOT_FOUND' },
        { status: 404 }
      )
    }

    const versions = await prisma.strategyVersion.findMany({
      where: { strategyId: id },
      orderBy: { version: 'desc' },
      take: limit,
      select: {
        id: true,
        version: true,
        name: true,
        description: true,
        note: true,
        createdAt: true,
      },
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Error fetching strategy versions:', error)
    return NextResponse.json(
      { error: '获取版本历史失败', code: 'FETCH_VERSIONS_FAILED' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, note } = body

    const strategy = await prisma.customStrategy.findUnique({
      where: { id },
    })

    if (!strategy) {
      return NextResponse.json(
        { error: '策略不存在', code: 'STRATEGY_NOT_FOUND' },
        { status: 404 }
      )
    }

    const lastVersion = await prisma.strategyVersion.findFirst({
      where: { strategyId: id },
      orderBy: { version: 'desc' },
    })

    const newVersionNumber = (lastVersion?.version || 0) + 1

    const version = await prisma.strategyVersion.create({
      data: {
        strategyId: id,
        version: newVersionNumber,
        name: name || `版本 ${newVersionNumber}`,
        description: description || strategy.description,
        note: note || null,
        config: {},
        rules: strategy.rules as Prisma.InputJsonValue,
        actions: strategy.actions as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    console.error('Error creating strategy version:', error)
    return NextResponse.json(
      { error: '创建版本失败', code: 'CREATE_VERSION_FAILED' },
      { status: 500 }
    )
  }
}
