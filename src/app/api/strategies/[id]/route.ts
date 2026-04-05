import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const strategy = await prisma.customStrategy.findUnique({
      where: { id },
    })

    if (!strategy) {
      return NextResponse.json(
        { error: '策略不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(strategy)
  } catch (error) {
    console.error('Error fetching strategy:', error)
    return NextResponse.json(
      { error: '获取策略失败' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, rules, actions } = body

    const existingStrategy = await prisma.customStrategy.findUnique({
      where: { id },
    })

    if (!existingStrategy) {
      return NextResponse.json(
        { error: '策略不存在' },
        { status: 404 }
      )
    }

    const strategy = await prisma.customStrategy.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(rules !== undefined && { rules }),
        ...(actions !== undefined && { actions }),
      },
    })

    return NextResponse.json(strategy)
  } catch (error) {
    console.error('Error updating strategy:', error)
    return NextResponse.json(
      { error: '更新策略失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const existingStrategy = await prisma.customStrategy.findUnique({
      where: { id },
    })

    if (!existingStrategy) {
      return NextResponse.json(
        { error: '策略不存在' },
        { status: 404 }
      )
    }

    await prisma.customStrategy.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting strategy:', error)
    return NextResponse.json(
      { error: '删除策略失败' },
      { status: 500 }
    )
  }
}
