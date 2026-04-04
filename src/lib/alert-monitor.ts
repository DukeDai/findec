import { prisma } from './prisma'
import { AlertEngine, AlertEvent, createPriceAlert, createPortfolioAlert } from './realtime/alert-engine'
import { RiskMonitor, getDefaultThresholds, EquityPoint, PortfolioState, RiskAlert } from './portfolio/risk-monitor'
import { io } from './websocket-server'

let monitoringInterval: NodeJS.Timeout | null = null

// Alert engine instance for advanced alert handling
let alertEngine: AlertEngine | null = null

export function initializeAlertEngine() {
  if (io) {
    alertEngine = new AlertEngine(io)
    console.log('Alert engine initialized with WebSocket')
  }
}

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

        // Check alerts with new engine
        if (alertEngine) {
          const priceMap = new Map<string, number>()
          priceMap.set(alert.symbol, currentPrice)

          const alertEvents = alertEngine.checkAlerts({
            prices: priceMap,
          })

          // Store in database
          for (const event of alertEvents) {
            await logAlertEvent(event)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking alerts:', error)
  }
}

export async function checkPortfolioAlerts() {
  try {
    // Fetch active portfolios
    const portfolios = await prisma.portfolio.findMany({
      include: {
        positions: true,
      },
    })

    for (const portfolio of portfolios) {
      // Get current prices
      const positions: PortfolioState['positions'] = []
      let totalValue = 0

      for (const position of portfolio.positions) {
        const response = await fetch(
          `http://localhost:3000/api/quotes?symbol=${position.symbol}`
        )
        const quote = response.ok ? await response.json() : {}
        const currentPrice = quote.price || quote.regularMarketPrice || position.avgCost
        const currentValue = position.quantity * currentPrice

        positions.push({
          symbol: position.symbol,
          quantity: position.quantity,
          currentPrice,
          currentValue,
        })

        totalValue += currentValue
      }

      const portfolioState: PortfolioState = {
        positions,
        totalValue,
      }

      // Get thresholds from config or use defaults
      const config = await prisma.userConfig.findUnique({
        where: { key: `portfolio_risk_thresholds_${portfolio.id}` },
      })

      const thresholds = config
        ? JSON.parse(config.value)
        : getDefaultThresholds()

      // Check risk for each portfolio
      const riskMonitor = new RiskMonitor(thresholds)
      const history: EquityPoint[] = []
      const alerts = riskMonitor.checkRisk(portfolioState, history)

      // Log triggered alerts
      for (const alert of alerts) {
        await logRiskAlert(portfolio.id, alert)

        // Broadcast alert event to connected clients
        if (io) {
          io.emit('portfolio-risk-alert', {
            portfolioId: portfolio.id,
            alertId: alert.id,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            current: alert.current,
            threshold: alert.threshold,
            recommendations: alert.recommendations,
            triggeredAt: alert.triggeredAt.toISOString(),
          })
        }
      }
    }
  } catch (error) {
    console.error('Error checking portfolio alerts:', error)
  }
}

async function logRiskAlert(portfolioId: string, alert: RiskAlert) {
  try {
    await prisma.riskAlertLog.create({
      data: {
        portfolioId,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        current: alert.current,
        threshold: alert.threshold,
        triggeredAt: alert.triggeredAt,
      },
    })
  } catch (error) {
    console.error('Error logging risk alert:', error)
  }
}

async function logAlertEvent(event: AlertEvent) {
  try {
    // Log to alert history table or console
    console.log(`Alert event logged: ${event.message}`, {
      alertId: event.alertId,
      type: event.condition.type,
      severity: event.condition.severity,
      currentValue: event.currentValue,
      triggeredAt: event.triggeredAt,
    })
  } catch (error) {
    console.error('Error logging alert event:', error)
  }
}

export function startAlertMonitor(intervalMs: number = 30000) {
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
  }

  // Initialize alert engine
  initializeAlertEngine()

  console.log(`Starting alert monitor (interval: ${intervalMs}ms)`)
  monitoringInterval = setInterval(() => {
    checkAlerts()
    checkPortfolioAlerts()
  }, intervalMs)
}

export function stopAlertMonitor() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
    monitoringInterval = null
    console.log('Alert monitor stopped')
  }
}

// Helper to register a price alert
export function registerPriceAlert(
  symbol: string,
  condition: '>' | '<',
  threshold: number,
  severity: 'info' | 'warning' | 'critical' = 'warning'
) {
  if (alertEngine) {
    const alert = createPriceAlert(symbol, condition === '>' ? '>' : '<', threshold, severity)
    alertEngine.registerAlert(alert)
    return alert.id
  }
  return null
}

// Helper to register a portfolio alert
export function registerPortfolioAlert(
  metric: string,
  condition: '>' | '<',
  threshold: number,
  severity: 'info' | 'warning' | 'critical' = 'warning'
) {
  if (alertEngine) {
    const alert = createPortfolioAlert(metric, condition === '>' ? '>' : '<', threshold, severity)
    alertEngine.registerAlert(alert)
    return alert.id
  }
  return null
}
