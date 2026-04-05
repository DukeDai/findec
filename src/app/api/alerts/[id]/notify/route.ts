import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAlertEmail } from '@/lib/realtime/email-notifier'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: alertId } = await params

    if (!alertId) {
      return NextResponse.json(
        { success: false, error: '预警ID不能为空' },
        { status: 400 }
      )
    }

    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    })

    if (!alert) {
      return NextResponse.json(
        { success: false, error: '预警不存在' },
        { status: 404 }
      )
    }

    const userConfig = await prisma.userConfig.findFirst({
      where: { emailAlertsEnabled: true },
    })

    if (!userConfig?.email) {
      return NextResponse.json(
        { success: false, error: '未配置邮箱或邮件通知未启用' },
        { status: 400 }
      )
    }

    const currentPrice = await getCurrentPrice(alert.symbol)
    if (!currentPrice) {
      return NextResponse.json(
        { success: false, error: '无法获取当前价格' },
        { status: 500 }
      )
    }

    const emailSent = await sendAlertEmail({
      alertId: alert.id,
      to: userConfig.email,
      symbol: alert.symbol,
      alertType: alert.type || 'price',
      currentPrice,
      threshold: alert.targetValue?.toString() || alert.condition,
      triggeredAt: alert.triggeredAt || new Date(),
      targetUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/analysis?tab=alerts`,
    })

    if (emailSent) {
      await prisma.userConfig.update({
        where: { id: userConfig.id },
        data: { lastEmailSentAt: new Date() },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: '邮件发送失败' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Error sending alert notification:', error)
    return NextResponse.json(
      { success: false, error: '发送通知失败' },
      { status: 500 }
    )
  }
}

async function getCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/quotes?symbol=${symbol}`
    )
    if (!res.ok) {
      return null
    }
    const data = await res.json()
    return data.price || null
  } catch {
    return null
  }
}
