import { Server } from 'socket.io'
import { createServer } from 'http'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

interface ClientInfo {
  symbols: string[]
  alertId?: string
}

const clients = new Map<string, ClientInfo>()

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  socket.on('subscribe', (data: { symbols: string[] }) => {
    clients.set(socket.id, { symbols: data.symbols || [] })
    console.log(`Client ${socket.id} subscribed to: ${data.symbols?.join(', ')}`)
  })

  socket.on('subscribe-alert', (data: { alertId: string }) => {
    const client = clients.get(socket.id) || { symbols: [] }
    client.alertId = data.alertId
    clients.set(socket.id, client)
    console.log(`Client ${socket.id} subscribed to alert: ${data.alertId}`)
  })

  socket.on('disconnect', () => {
    clients.delete(socket.id)
    console.log(`Client disconnected: ${socket.id}`)
  })
})

export function broadcastPriceUpdate(data: { symbol: string; price: number; change: number }) {
  io.emit('price-update', data)
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

export function getConnectedClients() {
  return clients.size
}

const PORT = parseInt(process.env.WS_PORT || '3001')

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})

export { io }