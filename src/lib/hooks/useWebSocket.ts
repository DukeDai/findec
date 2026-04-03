'use client'

import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseWebSocketOptions {
  url?: string
  autoConnect?: boolean
}

interface PriceUpdate {
  symbol: string
  price: number
  change: number
}

interface AlertTriggered {
  id: string
  symbol: string
  condition: string
  targetValue: number
  currentPrice: number
  message: string
}

interface MarketStatus {
  isOpen: boolean
  nextOpen: string
  nextClose: string
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [priceUpdates, setPriceUpdates] = useState<PriceUpdate[]>([])
  const [alerts, setAlerts] = useState<AlertTriggered[]>([])
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null)

  const { url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', autoConnect = true } = options

  useEffect(() => {
    if (!autoConnect) return

    const newSocket = io(url, {
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    })

    newSocket.on('price-update', (data: PriceUpdate) => {
      setPriceUpdates(prev => [data, ...prev].slice(0, 100))
    })

    newSocket.on('alert-triggered', (data: AlertTriggered) => {
      setAlerts(prev => [data, ...prev].slice(0, 50))
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`Alert: ${data.symbol}`, {
            body: data.message,
          })
        }
      }
    })

    newSocket.on('market-status', (data: MarketStatus) => {
      setMarketStatus(data)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [url, autoConnect])

  const subscribe = useCallback((symbols: string[]) => {
    if (socket?.connected) {
      socket.emit('subscribe', { symbols })
    }
  }, [socket])

  const subscribeToAlert = useCallback((alertId: string) => {
    if (socket?.connected) {
      socket.emit('subscribe-alert', { alertId })
    }
  }, [socket])

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  return {
    isConnected,
    socket,
    priceUpdates,
    alerts,
    marketStatus,
    subscribe,
    subscribeToAlert,
    clearAlerts,
  }
}