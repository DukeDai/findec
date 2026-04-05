import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAlertEmail } from '@/lib/realtime/email-notifier'
import { handleApiError, Errors } from '@/lib/errors'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: alertId } = await params

    if (!alertId) {
      throw Errors.badRequest('预警ID不能为空')
    }

    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    })

    if (!alert) {
      throw Errors.notFound('预警不存在')
    }

    const userConfig = await prisma.userConfig.findFirst({
      where: { emailAlertsEnabled: true },
    })

    if (!userConfig?.email) {
      throw Errors.badRequest('未配置邮箱或邮件通知未启用')
    }

    const currentPrice = await getCurrentPrice(alert.symbol)
    if (!currentPrice) {
      throw Errors.internal('无法获取当前价格')
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

    throw Errors.internal('邮件发送失败')
  } catch (error) {
    return handleApiError(error)
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
