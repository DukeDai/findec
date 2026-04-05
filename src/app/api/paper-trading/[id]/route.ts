import { NextRequest, NextResponse } from 'next/server'
import { getAccount, updatePositionPrices } from '@/lib/paper-trade'
import { createLogger } from '@/lib/logger'

const logger = createLogger('paper-trading-api')

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const summary = await getAccount(id)
    if (!summary) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    return NextResponse.json(summary)
  } catch (error) {
    logger.error('Failed to get paper account', error)
    return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { prisma } = await import('@/lib/prisma')
    await prisma.paperAccount.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to delete paper account', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
