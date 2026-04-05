import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const backtest = await prisma.backtestPlan.findUnique({
      where: { id },
    })

    if (!backtest) {
      return NextResponse.json(
        { error: '回测不存在' },
        { status: 404 }
      )
    }

    const versions = await prisma.backtestVersion.findMany({
      where: { backtestId: id },
      orderBy: { version: 'desc' },
      take: limit,
      select: {
        id: true,
        version: true,
        name: true,
        note: true,
        createdAt: true,
      },
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Error fetching backtest versions:', error)
    return NextResponse.json(
      { error: '获取版本历史失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, note, config } = body

    const backtest = await prisma.backtestPlan.findUnique({
      where: { id },
    })

    if (!backtest) {
      return NextResponse.json(
        { error: '回测不存在' },
        { status: 404 }
      )
    }

    const lastVersion = await prisma.backtestVersion.findFirst({
      where: { backtestId: id },
      orderBy: { version: 'desc' },
    })

    const newVersionNumber = (lastVersion?.version || 0) + 1

    const version = await prisma.backtestVersion.create({
      data: {
        backtestId: id,
        version: newVersionNumber,
        name: name || `版本 ${newVersionNumber}`,
        note: note || null,
        config: config || {},
      },
    })

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    console.error('Error creating backtest version:', error)
    return NextResponse.json(
      { error: '创建版本失败' },
      { status: 500 }
    )
  }
}
