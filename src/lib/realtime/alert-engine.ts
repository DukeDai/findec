import type { Server as SocketIOServer } from 'socket.io'
import { randomUUID } from 'crypto'
import { sendAlertEmail, canSendEmail } from '@/lib/realtime/email-notifier'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'

const logger = createLogger('alert-engine')

export interface AlertCondition {
  id: string
  type: 'price' | 'indicator' | 'factor' | 'risk' | 'portfolio'
  symbol?: string
  metric: string
  operator: '>' | '<' | 'cross_above' | 'cross_below' | 'change_gt'
  threshold: number
  severity: 'info' | 'warning' | 'critical'
}

export interface AlertEvent {
  alertId: string
  condition: AlertCondition
  triggeredAt: Date
  currentValue: number
  message: string
}

export interface AlertData {
  prices?: Map<string, number>
  indicators?: Map<string, number>
  portfolio?: PortfolioState
}

export interface PortfolioState {
  id: string
  totalValue: number
  positions: Array<{
    symbol: string
    quantity: number
    currentPrice: number
    currentValue: number
  }>
}

export class AlertEngine {
  private wsServer: SocketIOServer | null
  private activeAlerts: Map<string, AlertCondition>
  private alertHistory: Map<string, AlertEvent[]>
  private lastValues: Map<string, number>

  constructor(wsServer: SocketIOServer | null) {
    this.wsServer = wsServer
    this.activeAlerts = new Map()
    this.alertHistory = new Map()
    this.lastValues = new Map()
  }

  // Register a new alert condition
  registerAlert(condition: AlertCondition): void {
    this.activeAlerts.set(condition.id, condition)
    logger.info('Alert registered', { alertId: condition.id, type: condition.type, metric: condition.metric })
  }

  // Remove alert
  unregisterAlert(alertId: string): void {
    this.activeAlerts.delete(alertId)
    logger.info('Alert unregistered', { alertId })
  }

  // Check alerts against current data
  checkAlerts(data: AlertData): AlertEvent[] {
    const triggered: AlertEvent[] = []

    for (const alert of this.activeAlerts.values()) {
      const event = this.checkSingleAlert(alert, data)
      if (event) {
        triggered.push(event)
        this.recordAlertHistory(event)
        this.broadcast(event)
      }
    }

    return triggered
  }

  private checkSingleAlert(condition: AlertCondition, data: AlertData): AlertEvent | null {
    switch (condition.type) {
      case 'price':
        return this.checkPriceAlert(condition, data.prices)
      case 'indicator':
        return this.checkIndicatorAlert(condition, data.indicators)
      case 'risk':
        return this.checkRiskAlert(condition, data.portfolio)
      case 'portfolio':
        return this.checkPortfolioAlert(condition, data.portfolio)
      default:
        return null
    }
  }

  private checkPriceAlert(
    condition: AlertCondition,
    prices: Map<string, number> | undefined
  ): AlertEvent | null {
    if (!prices || !condition.symbol) return null

    const price = prices.get(condition.symbol)
    if (price === undefined) return null

    const lastValue = this.lastValues.get(`price:${condition.symbol}`)
    this.lastValues.set(`price:${condition.symbol}`, price)

    let triggered = false

    switch (condition.operator) {
      case '>':
        triggered = price > condition.threshold
        break
      case '<':
        triggered = price < condition.threshold
        break
      case 'cross_above':
        triggered = lastValue !== undefined && lastValue <= condition.threshold && price > condition.threshold
        break
      case 'cross_below':
        triggered = lastValue !== undefined && lastValue >= condition.threshold && price < condition.threshold
        break
      case 'change_gt':
        if (lastValue !== undefined && lastValue > 0) {
          const change = Math.abs((price - lastValue) / lastValue)
          triggered = change > condition.threshold
        }
        break
    }

    if (triggered) {
      return {
        alertId: randomUUID(),
        condition,
        triggeredAt: new Date(),
        currentValue: price,
        message: `${condition.symbol} 价格 ${condition.operator === '>' ? '超过' : condition.operator === '<' ? '低于' : condition.operator === 'change_gt' ? '变动超过' : '触发'} ${condition.threshold}`,
      }
    }

    return null
  }

  private checkIndicatorAlert(
    condition: AlertCondition,
    indicators: Map<string, number> | undefined
  ): AlertEvent | null {
    if (!indicators) return null

    const value = indicators.get(condition.metric)
    if (value === undefined) return null

    const lastValue = this.lastValues.get(`indicator:${condition.metric}`)
    this.lastValues.set(`indicator:${condition.metric}`, value)

    let triggered = false

    switch (condition.operator) {
      case '>':
        triggered = value > condition.threshold
        break
      case '<':
        triggered = value < condition.threshold
        break
      case 'cross_above':
        triggered = lastValue !== undefined && lastValue <= condition.threshold && value > condition.threshold
        break
      case 'cross_below':
        triggered = lastValue !== undefined && lastValue >= condition.threshold && value < condition.threshold
        break
      case 'change_gt':
        if (lastValue !== undefined) {
          const change = Math.abs(value - lastValue)
          triggered = change > condition.threshold
        }
        break
    }

    if (triggered) {
      return {
        alertId: randomUUID(),
        condition,
        triggeredAt: new Date(),
        currentValue: value,
        message: `指标 ${condition.metric} ${condition.operator === '>' ? '超过' : condition.operator === '<' ? '低于' : '触发'} ${condition.threshold}`,
      }
    }

    return null
  }

  private checkRiskAlert(
    condition: AlertCondition,
    portfolio: PortfolioState | undefined
  ): AlertEvent | null {
    if (!portfolio) return null

    // Risk alerts are checked by the RiskMonitor, this is for WebSocket broadcasting
    // Return null as risk monitoring happens separately
    return null
  }

  private checkPortfolioAlert(
    condition: AlertCondition,
    portfolio: PortfolioState | undefined
  ): AlertEvent | null {
    if (!portfolio) return null

    let value = 0

    switch (condition.metric) {
      case 'totalValue':
        value = portfolio.totalValue
        break
      case 'positionCount':
        value = portfolio.positions.length
        break
      case 'maxPositionWeight':
        if (portfolio.totalValue > 0) {
          value = Math.max(...portfolio.positions.map(p => p.currentValue / portfolio.totalValue))
        }
        break
      default:
        return null
    }

    const lastValue = this.lastValues.get(`portfolio:${condition.metric}`)
    this.lastValues.set(`portfolio:${condition.metric}`, value)

    let triggered = false

    switch (condition.operator) {
      case '>':
        triggered = value > condition.threshold
        break
      case '<':
        triggered = value < condition.threshold
        break
      case 'cross_above':
        triggered = lastValue !== undefined && lastValue <= condition.threshold && value > condition.threshold
        break
      case 'cross_below':
        triggered = lastValue !== undefined && lastValue >= condition.threshold && value < condition.threshold
        break
    }

    if (triggered) {
      return {
        alertId: randomUUID(),
        condition,
        triggeredAt: new Date(),
        currentValue: value,
        message: `组合 ${condition.metric} ${condition.operator === '>' ? '超过' : '低于'} ${condition.threshold}`,
      }
    }

    return null
  }

  // Broadcast alert event via WebSocket
  broadcast(event: AlertEvent): void {
    if (this.wsServer) {
      this.wsServer.emit('alert-event', {
        id: event.alertId,
        type: event.condition.type,
        metric: event.condition.metric,
        symbol: event.condition.symbol,
        severity: event.condition.severity,
        currentValue: event.currentValue,
        threshold: event.condition.threshold,
        message: event.message,
        triggeredAt: event.triggeredAt.toISOString(),
      })
      logger.info('Alert broadcast', { alertId: event.alertId, message: event.message, severity: event.condition.severity })
    }

    this.sendEmailNotification(event).catch(() => {})
  }

  private async sendEmailNotification(event: AlertEvent): Promise<void> {
    try {
      const userConfig = await prisma.userConfig.findFirst({
        where: { emailAlertsEnabled: true },
      })
      if (!userConfig?.email || !canSendEmail(event.alertId)) {
        return
      }
      await sendAlertEmail({
        alertId: event.alertId,
        to: userConfig.email,
        symbol: event.condition.symbol || 'N/A',
        alertType: event.condition.type,
        currentPrice: event.currentValue,
        threshold: `${event.condition.operator} ${event.condition.threshold}`,
        triggeredAt: event.triggeredAt,
        targetUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      })
    } catch {
      // Fail silently - email notification should not break alert functionality
    }
  }

  // Get all active alerts
  getActiveAlerts(): AlertCondition[] {
    return Array.from(this.activeAlerts.values())
  }

  // Get alert history for a specific alert
  getAlertHistory(alertId: string): AlertEvent[] {
    return this.alertHistory.get(alertId) || []
  }

  // Get all alert history
  getAllAlertHistory(): AlertEvent[] {
    const allHistory: AlertEvent[] = []
    for (const history of this.alertHistory.values()) {
      allHistory.push(...history)
    }
    return allHistory.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
  }

  private recordAlertHistory(event: AlertEvent): void {
    const history = this.alertHistory.get(event.condition.id) || []
    history.push(event)
    // Keep only last 100 events per alert
    if (history.length > 100) {
      history.shift()
    }
    this.alertHistory.set(event.condition.id, history)
  }

  // Clear all alerts and history
  clear(): void {
    this.activeAlerts.clear()
    this.alertHistory.clear()
    this.lastValues.clear()
    logger.info('Alert engine cleared')
  }

  // Export alerts configuration
  exportAlerts(): AlertCondition[] {
    return this.getActiveAlerts()
  }

  // Import alerts configuration
  importAlerts(conditions: AlertCondition[]): void {
    for (const condition of conditions) {
      this.registerAlert(condition)
    }
  }
}

// Factory function
export function createAlertEngine(wsServer: SocketIOServer | null): AlertEngine {
  return new AlertEngine(wsServer)
}

// Helper to create common alert conditions
export function createPriceAlert(
  symbol: string,
  operator: AlertCondition['operator'],
  threshold: number,
  severity: AlertCondition['severity'] = 'warning'
): AlertCondition {
  return {
    id: randomUUID(),
    type: 'price',
    symbol,
    metric: 'price',
    operator,
    threshold,
    severity,
  }
}

export function createPortfolioAlert(
  metric: string,
  operator: AlertCondition['operator'],
  threshold: number,
  severity: AlertCondition['severity'] = 'warning'
): AlertCondition {
  return {
    id: randomUUID(),
    type: 'portfolio',
    metric,
    operator,
    threshold,
    severity,
  }
}
