import { Server } from 'socket.io'
import { createServer } from 'http'
import { createAlertEngine } from '@/lib/realtime/alert-engine'
import { RiskMonitor, getDefaultThresholds, EquityPoint, PortfolioState } from '@/lib/portfolio/risk-monitor'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'

const logger = createLogger('websocket-server')

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

// Initialize alert engine with Socket.io server
export const alertEngine = createAlertEngine(io)

interface ClientInfo {
  symbols: string[]
  alertId?: string
  portfolioId?: string
}

const clients = new Map<string, ClientInfo>()

io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id })

  socket.on('subscribe', (data: { symbols: string[] }) => {
    clients.set(socket.id, { symbols: data.symbols || [] })
    logger.info('Client subscribed', { socketId: socket.id, symbols: data.symbols })
  })

  socket.on('subscribe-alert', (data: { alertId: string }) => {
    const client = clients.get(socket.id) || { symbols: [] }
    client.alertId = data.alertId
    clients.set(socket.id, client)
    logger.info('Client subscribed to alert', { socketId: socket.id, alertId: data.alertId })
  })

  socket.on('subscribe-portfolio', (data: { portfolioId: string }) => {
    const client = clients.get(socket.id) || { symbols: [] }
    client.portfolioId = data.portfolioId
    clients.set(socket.id, client)
    logger.info('Client subscribed to portfolio', { socketId: socket.id, portfolioId: data.portfolioId })
  })

  socket.on('disconnect', () => {
    clients.delete(socket.id)
    logger.info('Client disconnected', { socketId: socket.id })
  })
})

export function broadcastPriceUpdate(data: { symbol: string; price: number; change: number }) {
  io.emit('price-update', data)

  // Check alerts with alert engine on price updates
  alertEngine.checkAlerts({
    prices: new Map([[data.symbol, data.price]]),
  })
}

export function broadcastAlert(data: {
  id: string
  symbol: string
  condition: string
  targetValue: number
  currentPrice: number
  message: string
}) {
  io.emit('alert-triggered', data)
}

export function broadcastMarketStatus(data: { isOpen: boolean; nextOpen: string; nextClose: string }) {
  io.emit('market-status', data)
}

export function broadcastPortfolioRiskAlert(data: {
  portfolioId: string
  alertType: string
  severity: string
  message: string
  current: number
  threshold: number
}) {
  io.emit('portfolio-risk-alert', data)
}

export function getConnectedClients() {
  return clients.size
}

// Monitor portfolio risk and send alerts
export async function checkPortfolioRiskAlerts() {
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
      const history: EquityPoint[] = [] // Would fetch from database
      const alerts = riskMonitor.checkRisk(portfolioState, history)

      // Log triggered alerts
      for (const alert of alerts) {
        await prisma.riskAlertLog.create({
          data: {
            portfolioId: portfolio.id,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            current: alert.current,
            threshold: alert.threshold,
            triggeredAt: alert.triggeredAt,
          },
        })

        // Broadcast to WebSocket
        broadcastPortfolioRiskAlert({
          portfolioId: portfolio.id,
          alertType: alert.type,
          severity: alert.severity,
          message: alert.message,
          current: alert.current,
          threshold: alert.threshold,
        })
      }
    }
  } catch (error) {
    logger.error('Error checking portfolio risk', error)
  }
}

const PORT = parseInt(process.env.WS_PORT || '3001')

httpServer.listen(PORT, () => {
  logger.info('WebSocket server started', { port: PORT })

  // Start periodic risk monitoring
  setInterval(checkPortfolioRiskAlerts, 60000) // Check every minute
})

export { io }
