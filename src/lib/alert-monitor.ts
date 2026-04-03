import { prisma } from './prisma'

let monitoringInterval: NodeJS.Timeout | null = null

export async function checkAlerts() {
  try {
    const alerts = await prisma.alert.findMany({
      where: { isActive: true },
    })

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

        console.log(`Alert triggered: ${alert.symbol} ${alert.condition} ${alert.targetValue}`)
      }
    }
  } catch (error) {
    console.error('Error checking alerts:', error)
  }
}

export function startAlertMonitor(intervalMs: number = 30000) {
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
  }

  console.log(`Starting alert monitor (interval: ${intervalMs}ms)`)
  monitoringInterval = setInterval(checkAlerts, intervalMs)
}

export function stopAlertMonitor() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
    monitoringInterval = null
    console.log('Alert monitor stopped')
  }
}