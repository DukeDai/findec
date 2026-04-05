'use client'

import { useState, useEffect, useCallback } from 'react'

interface NotificationPermission {
  granted: boolean
  denied: boolean
  notDetermined: boolean
}

const STORAGE_KEY = 'findec-notification-permission'

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    notDetermined: true,
  })
  const [isSupported, setIsSupported] = useState(false)
  const [userPreference, setUserPreference] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'true'
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setIsSupported(false)
      return
    }
    setIsSupported(true)
    const current = Notification.permission
    setPermission({
      granted: current === 'granted',
      denied: current === 'denied',
      notDetermined: current === 'default',
    })
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported || typeof window === 'undefined') return false
    const result = await Notification.requestPermission()
    const granted = result === 'granted'
    setPermission({
      granted,
      denied: result === 'denied',
      notDetermined: result === 'default',
    })
    return granted
  }, [isSupported])

  const sendNotification = useCallback(
    (options: {
      title: string
      body?: string
      icon?: string
      tag?: string
      data?: Record<string, unknown>
    }) => {
      if (!permission.granted || !isSupported || typeof window === 'undefined') {
        return null
      }

      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: false,
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      return notification
    },
    [permission.granted, isSupported]
  )

  const setNotificationPreference = useCallback((enabled: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(enabled))
    }
    setUserPreference(enabled)
  }, [])

  return {
    permission,
    isSupported,
    userPreference,
    requestPermission,
    sendNotification,
    setNotificationPreference,
  }
}
