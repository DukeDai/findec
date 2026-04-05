import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, versionId } = await params

    const strategy = await prisma.customStrategy.findUnique({
      where: { id },
    })

    if (!strategy) {
      return NextResponse.json(
        { error: '策略不存在', code: 'STRATEGY_NOT_FOUND' },
        { status: 404 }
      )
    }

    const version = await prisma.strategyVersion.findFirst({
      where: {
        strategyId: id,
        id: versionId,
      },
    })

    if (!version) {
      return NextResponse.json(
        { error: '版本不存在', code: 'VERSION_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json(version)
  } catch (error) {
    console.error('Error fetching strategy version:', error)
    return NextResponse.json(
      { error: '获取版本详情失败', code: 'FETCH_VERSION_FAILED' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, versionId } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action !== 'restore') {
      return NextResponse.json(
        { error: '无效的操作', code: 'INVALID_ACTION' },
        { status: 400 }
      )
    }

    const strategy = await prisma.customStrategy.findUnique({
      where: { id },
    })

    if (!strategy) {
      return NextResponse.json(
        { error: '策略不存在', code: 'STRATEGY_NOT_FOUND' },
        { status: 404 }
      )
    }

    const version = await prisma.strategyVersion.findFirst({
      where: {
        strategyId: id,
        id: versionId,
      },
    })

    if (!version) {
      return NextResponse.json(
        { error: '版本不存在', code: 'VERSION_NOT_FOUND' },
        { status: 404 }
      )
    }

    const updatedStrategy = await prisma.customStrategy.update({
      where: { id },
      data: {
        name: version.name,
        description: version.description,
        rules: version.rules as unknown as Prisma.InputJsonValue,
        actions: version.actions as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json(updatedStrategy)
  } catch (error) {
    console.error('Error restoring strategy version:', error)
    return NextResponse.json(
      { error: '恢复版本失败', code: 'RESTORE_VERSION_FAILED' },
      { status: 500 }
    )
  }
}
