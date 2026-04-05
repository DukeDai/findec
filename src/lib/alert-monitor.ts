import { prisma } from './prisma'
import { AlertEngine, AlertEvent, createPriceAlert, createPortfolioAlert } from './realtime/alert-engine'
import { RiskMonitor, getDefaultThresholds, EquityPoint, PortfolioState, RiskAlert } from './portfolio/risk-monitor'
import { io } from './websocket-server'
import { createLogger } from './logger'

const logger = createLogger('alert-monitor')

let monitoringInterval: NodeJS.Timeout | null = null
let alertEngine: AlertEngine | null = null
let isRunning = false

const DEFAULT_INTERVAL_MS = 30000
const MAX_RETRIES = 3
const BASE_RETRY_DELAY_MS = 1000

async function withRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES
): Promise<T | null> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt)
        logger.warn(`[${operation}] attempt ${attempt + 1} failed, retrying in ${delay}ms`, { error: String(error) })
        await sleep(delay)
      }
    }
  }

  logger.error(`[${operation}] all ${maxRetries + 1} attempts failed`, lastError)
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50
  let gains = 0, losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1]
    if (delta >= 0) gains += delta
    else losses += Math.abs(delta)
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

export function initializeAlertEngine() {
  if (io && !alertEngine) {
    alertEngine = new AlertEngine(io)
    logger.info('Alert engine initialized with WebSocket')
  }
}

export async function checkAlerts() {
  const result = await withRetry('checkAlerts', async () => {
    const alerts = await prisma.alert.findMany({
      where: { isActive: true },
    })

    for (const alert of alerts) {
      const quoteRes = await fetch(
        `http://localhost:3000/api/quotes?symbol=${alert.symbol}`
      )

      if (!quoteRes.ok) {
        logger.warn('Failed to fetch quote for alert check', {
          alertId: alert.id,
          symbol: alert.symbol,
          status: quoteRes.status,
        })
        continue
      }

      const data = await quoteRes.json()
      const currentPrice = data.price || data.regularMarketPrice

      if (!currentPrice) {
        logger.warn('No price data for alert check', { alertId: alert.id, symbol: alert.symbol })
        continue
      }

      let triggered = false

      switch (alert.condition) {
        case 'above':
          triggered = currentPrice > (alert.targetValue || 0)
          break
        case 'below':
          triggered = currentPrice < (alert.targetValue || 0)
          break
        case 'change_above':
          triggered = Math.abs(data.changePercent || 0) > (alert.targetValue || 0)
          break
        case 'change_below':
          triggered = (data.changePercent || 0) < -(alert.targetValue || 0)
          break
        case 'rsi_overbought':
        case 'rsi_oversold': {
          const historyRes = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/history?symbol=${alert.symbol}&range=3mo`
          )
          if (historyRes.ok) {
            const historyData = await historyRes.json()
            const closes = (historyData.data || []).map((d: { close: number }) => d.close)
            if (closes.length >= 15) {
              const rsiValue = calculateRSI(closes, 14)
              const threshold = alert.targetValue ?? (alert.condition === 'rsi_overbought' ? 70 : 30)
              triggered = alert.condition === 'rsi_overbought'
                ? rsiValue > threshold
                : rsiValue < threshold
            }
          } else {
            logger.warn(`Failed to fetch history for RSI alert: ${alert.symbol}`, {
              status: historyRes.status,
              alertId: alert.id,
            })
          }
          break
        }
      }

      if (triggered && !alert.triggeredAt) {
        await prisma.alert.update({
          where: { id: alert.id },
          data: { triggeredAt: new Date() },
        })

        logger.info('Alert triggered', {
          alertId: alert.id,
          symbol: alert.symbol,
          condition: alert.condition,
          targetValue: alert.targetValue,
          currentPrice,
        })

        if (alertEngine) {
          const priceMap = new Map<string, number>()
          priceMap.set(alert.symbol, currentPrice)

          const alertEvents = alertEngine.checkAlerts({ prices: priceMap })

          for (const event of alertEvents) {
            await logAlertEvent(event)
          }
        }
      }
    }
  })

  return result !== null
}

export async function checkPortfolioAlerts() {
  const result = await withRetry('checkPortfolioAlerts', async () => {
    const portfolios = await prisma.portfolio.findMany({
      include: { positions: true },
    })

    for (const portfolio of portfolios) {
      const positions: PortfolioState['positions'] = []
      let totalValue = 0

      for (const position of portfolio.positions) {
        const quoteRes = await fetch(
          `http://localhost:3000/api/quotes?symbol=${position.symbol}`
        )
        const quote = quoteRes.ok ? await quoteRes.json() : {}
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

      const portfolioState: PortfolioState = { positions, totalValue }

      const config = await prisma.userConfig.findUnique({
        where: { key: `portfolio_risk_thresholds_${portfolio.id}` },
      })

      const thresholds = config ? JSON.parse(config.value) : getDefaultThresholds()
      const riskMonitor = new RiskMonitor(thresholds)
      const history: EquityPoint[] = []
      const alerts = riskMonitor.checkRisk(portfolioState, history)

      for (const alert of alerts) {
        await logRiskAlert(portfolio.id, alert)

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
  })

  return result !== null
}

async function logRiskAlert(portfolioId: string, alert: RiskAlert): Promise<void> {
  await withRetry('logRiskAlert', async () => {
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
  }, 2)
}

async function logAlertEvent(event: AlertEvent): Promise<void> {
  await withRetry('logAlertEvent', async () => {
    logger.info('Alert event', {
      alertId: event.alertId,
      type: event.condition.type,
      severity: event.condition.severity,
      currentValue: event.currentValue,
      triggeredAt: event.triggeredAt.toISOString(),
      message: event.message,
    })
  }, 2)
}

export function startAlertMonitor(intervalMs: number = DEFAULT_INTERVAL_MS) {
  if (isRunning) {
    logger.warn('Alert monitor already running, stopping first')
    stopAlertMonitor()
  }

  initializeAlertEngine()
  isRunning = true
  logger.info('Alert monitor started', { intervalMs })

  const runCycle = async () => {
    if (!isRunning) return
    try {
      await checkAlerts()
    } catch (e) {
      logger.error('checkAlerts cycle threw unexpectedly', e)
    }
    if (isRunning) {
      try {
        await checkPortfolioAlerts()
      } catch (e) {
        logger.error('checkPortfolioAlerts cycle threw unexpectedly', e)
      }
    }
  }

  void runCycle()
  monitoringInterval = setInterval(runCycle, intervalMs)
}

export function stopAlertMonitor() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
    monitoringInterval = null
  }
  isRunning = false
  logger.info('Alert monitor stopped')
}

export function registerPriceAlert(
  symbol: string,
  condition: '>' | '<',
  threshold: number,
  severity: 'info' | 'warning' | 'critical' = 'warning'
) {
  if (!alertEngine) {
    logger.warn('Cannot register price alert: alert engine not initialized')
    return null
  }
  const alert = createPriceAlert(symbol, condition === '>' ? '>' : '<', threshold, severity)
  alertEngine.registerAlert(alert)
  logger.info('Price alert registered', { alertId: alert.id, symbol, condition, threshold, severity })
  return alert.id
}

export function registerPortfolioAlert(
  metric: string,
  condition: '>' | '<',
  threshold: number,
  severity: 'info' | 'warning' | 'critical' = 'warning'
) {
  if (!alertEngine) {
    logger.warn('Cannot register portfolio alert: alert engine not initialized')
    return null
  }
  const alert = createPortfolioAlert(metric, condition === '>' ? '>' : '<', threshold, severity)
  alertEngine.registerAlert(alert)
  logger.info('Portfolio alert registered', { alertId: alert.id, metric, condition, threshold, severity })
  return alert.id
}
