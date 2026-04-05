'use client'

import { useCallback, useState } from 'react'
import { useBrowserNotifications } from '@/lib/hooks/useBrowserNotifications'
import { Bell, BellOff, Check, X } from 'lucide-react'

export function NotificationSettings() {
  const {
    permission,
    isSupported,
    userPreference,
    requestPermission,
    setNotificationPreference,
  } = useBrowserNotifications()
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = useCallback(async () => {
    if (!isSupported) return

    setIsLoading(true)

    if (userPreference) {
      setNotificationPreference(false)
    } else {
      if (permission.granted) {
        setNotificationPreference(true)
      } else {
        const granted = await requestPermission()
        if (granted) {
          setNotificationPreference(true)
        }
      }
    }

    setIsLoading(false)
  }, [
    isSupported,
    userPreference,
    permission.granted,
    requestPermission,
    setNotificationPreference,
  ])

  const getStatusText = () => {
    if (!isSupported) return '浏览器不支持通知'
    if (permission.denied) return '通知权限被拒绝'
    if (userPreference && permission.granted) return '已启用'
    return '未启用'
  }

  const getStatusColor = () => {
    if (!isSupported || permission.denied) return 'text-gray-400'
    if (userPreference && permission.granted) return 'text-green-600'
    return 'text-yellow-600'
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
      <div className="flex items-center gap-2 flex-1">
        {userPreference && permission.granted ? (
          <Bell className="w-5 h-5 text-green-600" />
        ) : (
          <BellOff className="w-5 h-5 text-gray-400" />
        )}
        <div>
          <p className="font-medium">浏览器通知</p>
          <p className={`text-sm ${getStatusColor()}`}>
            {getStatusText()}
          </p>
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={isLoading || !isSupported || permission.denied}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${userPreference && permission.granted ? 'bg-green-600' : 'bg-gray-200'}
          ${isLoading || !isSupported || permission.denied ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        role="switch"
        aria-checked={userPreference && permission.granted}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${userPreference && permission.granted ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  )
}
