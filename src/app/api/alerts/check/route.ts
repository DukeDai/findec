import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const alerts = await prisma.alert.findMany({
      where: { isActive: true },
    })

    const triggeredAlerts = []

    for (const alert of alerts) {
      const response = await fetch(
        `http://localhost:3000/api/quotes?symbol=${alert.symbol}`
      )

      if (!response.ok) continue

      const data = await response.json()
      const currentPrice = data.price || data.regularMarketPrice

      if (!currentPrice) continue

      let triggered = false

      switch (alert.condition) {
        case 'above':
          triggered = currentPrice > (alert.targetValue || 0)
          break
        case 'below':
          triggered = currentPrice < (alert.targetValue || 0)
          break
        case 'change_above':
          const changePercent = Math.abs(data.changePercent || 0)
          triggered = changePercent > (alert.targetValue || 0)
          break
        case 'change_below':
          const changeNeg = data.changePercent || 0
          triggered = changeNeg < -(alert.targetValue || 0)
          break
      }

      if (triggered && !alert.triggeredAt) {
        await prisma.alert.update({
          where: { id: alert.id },
          data: {
            triggeredAt: new Date(),
          },
        })

        triggeredAlerts.push({
          id: alert.id,
          symbol: alert.symbol,
          condition: alert.condition,
          targetValue: alert.targetValue,
          currentPrice,
          message: alert.message || `${alert.symbol} ${alert.condition} ${alert.targetValue}`,
        })
      }
    }

    return NextResponse.json({
      checked: alerts.length,
      triggered: triggeredAlerts.length,
      alerts: triggeredAlerts,
    })
  } catch (error) {
    console.error('Error checking alerts:', error)
    return NextResponse.json(
      { error: 'Failed to check alerts' },
      { status: 500 }
    )
  }
}