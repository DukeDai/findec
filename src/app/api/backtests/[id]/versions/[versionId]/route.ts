import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, versionId } = await params

    const backtest = await prisma.backtestPlan.findUnique({
      where: { id },
    })

    if (!backtest) {
      return NextResponse.json(
        { error: '回测不存在' },
        { status: 404 }
      )
    }

    const version = await prisma.backtestVersion.findFirst({
      where: {
        backtestId: id,
        id: versionId,
      },
    })

    if (!version) {
      return NextResponse.json(
        { error: '版本不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(version)
  } catch (error) {
    console.error('Error fetching backtest version:', error)
    return NextResponse.json(
      { error: '获取版本详情失败' },
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
        { error: '无效的操作' },
        { status: 400 }
      )
    }

    const backtest = await prisma.backtestPlan.findUnique({
      where: { id },
    })

    if (!backtest) {
      return NextResponse.json(
        { error: '回测不存在' },
        { status: 404 }
      )
    }

    const version = await prisma.backtestVersion.findFirst({
      where: {
        backtestId: id,
        id: versionId,
      },
    })

    if (!version) {
      return NextResponse.json(
        { error: '版本不存在' },
        { status: 404 }
      )
    }

    const updatedBacktest = await prisma.backtestPlan.update({
      where: { id },
      data: {
        name: version.name,
      },
    })

    return NextResponse.json(updatedBacktest)
  } catch (error) {
    console.error('Error restoring backtest version:', error)
    return NextResponse.json(
      { error: '恢复版本失败' },
      { status: 500 }
    )
  }
}
