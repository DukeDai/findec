'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useBrowserNotifications } from '@/lib/hooks/useBrowserNotifications'
import { AlertCircle, X } from 'lucide-react'

interface AlertEvent {
  id: string
  type: 'price' | 'indicator' | 'factor' | 'risk' | 'portfolio'
  metric: string
  symbol?: string
  severity: 'info' | 'warning' | 'critical'
  currentValue: number
  threshold: number
  message: string
  triggeredAt: string
}

interface Toast {
  id: string
  title: string
  body: string
  severity: 'info' | 'warning' | 'critical'
}

const NOTIFICATION_COOLDOWN = 60000

export function AlertNotificationBridge() {
  const {
    permission,
    isSupported,
    userPreference,
    sendNotification,
    requestPermission,
  } = useBrowserNotifications()
  const socketRef = useRef<Socket | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const lastNotificationRef = useRef<Map<string, number>>(new Map())

  const canSendNotification = useCallback(
    (tag: string): boolean => {
      const lastSent = lastNotificationRef.current.get(tag)
      const now = Date.now()
      if (!lastSent || now - lastSent > NOTIFICATION_COOLDOWN) {
        lastNotificationRef.current.set(tag, now)
        return true
      }
      return false
    },
    []
  )

  const showToast = useCallback(
    (title: string, body: string, severity: 'info' | 'warning' | 'critical') => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((prev) => [...prev, { id, title, body, severity }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 10000)
    },
    []
  )

  const formatNotificationContent = useCallback(
    (alert: AlertEvent): { title: string; body: string } => {
      const symbol = alert.symbol || '组合'
      const value = alert.currentValue.toFixed(2)
      const threshold = alert.threshold.toFixed(2)

      switch (alert.type) {
        case 'price':
          return {
            title: `${symbol} 价格预警`,
            body: `当前价格 $${value}，阈值 $${threshold}`,
          }
        case 'indicator':
          return {
            title: `${symbol} 指标预警`,
            body: `${alert.metric}: ${value}，阈值 ${threshold}`,
          }
        case 'risk':
          return {
            title: `${symbol} 风险预警`,
            body: `${alert.metric}: ${value}，阈值 ${threshold}`,
          }
        case 'portfolio':
          return {
            title: '组合预警',
            body: `${alert.metric}: ${value}，阈值 ${threshold}`,
          }
        default:
          return {
            title: '预警通知',
            body: alert.message,
          }
      }
    },
    []
  )

  const handleAlertTriggered = useCallback(
    (alert: AlertEvent) => {
      if (!userPreference) return
      if (alert.type !== 'price' && alert.type !== 'indicator') return

      const tag = `${alert.type}-${alert.symbol || alert.metric}`
      const { title, body } = formatNotificationContent(alert)

      if (permission.granted && canSendNotification(tag)) {
        sendNotification({
          title,
          body,
          tag,
          data: { alert },
        })
      } else {
        showToast(title, body, alert.severity)
      }
    },
    [
      userPreference,
      permission.granted,
      canSendNotification,
      sendNotification,
      formatNotificationContent,
      showToast,
    ]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const socket = io(`${window.location.protocol}//${window.location.host}:3001`)

    socket.on('connect', () => {
      socket.emit('subscribe', { channel: 'alerts' })
    })

    socket.on('alert-event', (alert: AlertEvent) => {
      handleAlertTriggered(alert)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [handleAlertTriggered])

  useEffect(() => {
    if (
      userPreference &&
      isSupported &&
      permission.notDetermined &&
      typeof window !== 'undefined'
    ) {
      requestPermission()
    }
  }, [userPreference, isSupported, permission.notDetermined, requestPermission])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 border-red-600'
      case 'warning':
        return 'bg-yellow-500 border-yellow-600'
      default:
        return 'bg-blue-500 border-blue-600'
    }
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getSeverityColor(toast.severity)} text-white px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-bottom duration-300`}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{toast.title}</p>
              <p className="text-sm opacity-90">{toast.body}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-white/80 hover:text-white flex-shrink-0"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
