'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Info, Sparkles } from 'lucide-react'
import { io, Socket } from 'socket.io-client'

interface Alert {
  id: string
  symbol: string
  condition: string
  targetValue: number | null
  message: string | null
  isActive: boolean
  triggeredAt: string | null
  createdAt: string
}

const CONDITIONS = [
  { id: 'above', name: '价格高于', unit: '$' },
  { id: 'below', name: '价格低于', unit: '$' },
  { id: 'change_above', name: '涨幅超过', unit: '%' },
  { id: 'change_below', name: '跌幅超过', unit: '%' },
  { id: 'rsi_overbought', name: 'RSI 超买', unit: '' },
  { id: 'rsi_oversold', name: 'RSI 超卖', unit: '' },
  { id: 'volume_spike', name: '成交量放大', unit: '倍' },
]

interface AlertRecommendation {
  priceChangeThreshold: number
  volumeSpikeThreshold: number
  rsiOverbought: number
  rsiOversold: number
  atrMultiplier: number
  reasoning: string
}

export function AlertManager() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    symbol: '',
    condition: 'above',
    targetValue: '',
    message: '',
  })

  const [recommendation, setRecommendation] = useState<AlertRecommendation | null>(null)
  const [recommending, setRecommending] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [latestAlert, setLatestAlert] = useState<Alert | null>(null)

  const loadAlerts = async () => {
    try {
      const res = await fetch('/api/alerts')
      const data = await res.json()
      setAlerts(data)
    } catch (error) {
      console.error('Failed to load alerts:', error)
    }
  }

  const createAlert = async () => {
    if (!formData.symbol || !formData.targetValue) return

    setLoading(true)
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: formData.symbol.toUpperCase(),
          condition: formData.condition,
          targetValue: parseFloat(formData.targetValue),
          message: formData.message || `${formData.symbol} ${CONDITIONS.find(c => c.id === formData.condition)?.name} ${formData.targetValue}`,
        }),
      })
      if (res.ok) {
        loadAlerts()
        setShowForm(false)
        setFormData({ symbol: '', condition: 'above', targetValue: '', message: '' })
      }
    } catch (error) {
      console.error('Failed to create alert:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAlert = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      loadAlerts()
    } catch (error) {
      console.error('Failed to toggle alert:', error)
    }
  }

  const deleteAlert = async (id: string) => {
    if (!confirm('确定删除此预警?')) return
    try {
      await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
      loadAlerts()
    } catch (error) {
      console.error('Failed to delete alert:', error)
    }
  }

  const checkAlerts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/alerts/check', { method: 'POST' })
      const data = await res.json()
      if (data.triggered > 0) {
        alert(`${data.triggered} 个预警已触发!`)
      } else {
        alert('检查完成，暂无触发预警')
      }
      loadAlerts()
    } catch (error) {
      console.error('Failed to check alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  useEffect(() => {
    const socket = io(`${window.location.protocol}//${window.location.host}:3001`)

    socket.on('connect', () => {
      console.log('Socket.io connected')
      setWsConnected(true)
      socket.emit('subscribe', { channel: 'alerts' })
    })

    socket.on('alert-triggered', (data: Alert) => {
      setLatestAlert(data)
      playNotificationSound()
      setAlerts(prev => prev.map(a =>
        a.id === data.id ? { ...a, triggeredAt: data.triggeredAt, isActive: false } : a
      ))
    })

    socket.on('disconnect', () => {
      console.log('Socket.io disconnected')
      setWsConnected(false)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (latestAlert) {
      const timeout = setTimeout(() => setLatestAlert(null), 10000)
      return () => clearTimeout(timeout)
    }
  }, [latestAlert])

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.frequency.value = 800
      gainNode.gain.value = 0.1
      oscillator.start()
      setTimeout(() => oscillator.stop(), 200)
    } catch (e) {
    }
  }

  const selectedCondition = CONDITIONS.find(c => c.id === formData.condition)

  const getSmartRecommendation = async () => {
    if (!formData.symbol) {
      alert('请先输入股票代码')
      return
    }

    setRecommending(true)
    try {
      const res = await fetch(`/api/alerts/recommend?symbol=${formData.symbol.toUpperCase()}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '获取推荐失败')
      }
      const data: AlertRecommendation = await res.json()
      setRecommendation(data)

      // 根据当前选择的条件类型自动填充合适的推荐值
      if (formData.condition === 'change_above' || formData.condition === 'change_below') {
        setFormData(prev => ({ ...prev, targetValue: data.priceChangeThreshold.toString() }))
      } else if (formData.condition === 'rsi_overbought') {
        setFormData(prev => ({ ...prev, targetValue: data.rsiOverbought.toString() }))
      } else if (formData.condition === 'rsi_oversold') {
        setFormData(prev => ({ ...prev, targetValue: data.rsiOversold.toString() }))
      } else if (formData.condition === 'volume_spike') {
        setFormData(prev => ({ ...prev, targetValue: data.volumeSpikeThreshold.toString() }))
      }
    } catch (error) {
      console.error('获取智能推荐失败:', error)
      alert(error instanceof Error ? error.message : '获取智能推荐失败')
    } finally {
      setRecommending(false)
    }
  }

  return (
    <div className="space-y-4">
      {latestAlert && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom">
          <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-4">
            <div className="flex-1">
              <p className="font-bold">{latestAlert.symbol} 预警触发</p>
              <p className="text-sm opacity-90">{latestAlert.message || `${latestAlert.condition} ${latestAlert.targetValue}`}</p>
            </div>
            <button
              onClick={() => setLatestAlert(null)}
              className="text-white/80 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <Button onClick={() => setShowForm(true)} disabled={loading}>
          新建预警
        </Button>
        <Button variant="outline" onClick={checkAlerts} disabled={loading}>
          {loading ? '检查中...' : '检查预警'}
        </Button>
        <Button variant="outline" onClick={loadAlerts}>
          刷新
        </Button>
        <div className={`text-xs px-2 py-1 rounded ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {wsConnected ? '实时连接' : '离线'}
        </div>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">新建价格预警</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={getSmartRecommendation}
              disabled={recommending || !formData.symbol}
              className="flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              {recommending ? '计算中...' : '智能推荐'}
            </Button>
          </div>

          {recommendation && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4" />
                <span className="text-sm font-medium">基于历史波动率的智能推荐</span>
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-auto"
                >
                  {showReasoning ? '收起详情' : '查看详情'}
                </button>
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400 grid grid-cols-2 gap-2">
                <div>价格变动阈值: <strong>{recommendation.priceChangeThreshold}%</strong></div>
                <div>成交量放大: <strong>{recommendation.volumeSpikeThreshold}倍</strong></div>
                <div>RSI超买: <strong>{recommendation.rsiOverbought}</strong></div>
                <div>RSI超卖: <strong>{recommendation.rsiOversold}</strong></div>
              </div>
              {showReasoning && (
                <div className="text-xs text-blue-600 dark:text-blue-400 whitespace-pre-line border-t border-blue-200 dark:border-blue-800 pt-2 mt-2">
                  {recommendation.reasoning}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">股票代码</label>
              <input
                type="text"
                placeholder="AAPL"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">条件</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              >
                {CONDITIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
              <div>
              <label className="text-sm text-muted-foreground">目标值{selectedCondition?.unit ? ` (${selectedCondition.unit})` : ' (RSI默认70/30)'}</label>
              <input
                type="number"
                step="0.01"
                placeholder="150"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">提示消息 (可选)</label>
              <input
                type="text"
                placeholder="AAPL突破$150"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={createAlert} disabled={!formData.symbol || !formData.targetValue}>
              创建
            </Button>
            <Button variant="outline" onClick={() => {
              setShowForm(false)
              setRecommendation(null)
              setShowReasoning(false)
            }}>取消</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {alerts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无预警，点击&quot;新建预警&quot;添加
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                alert.triggeredAt ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''
              } ${!alert.isActive ? 'opacity-50' : ''}`}
            >
              <div className="flex-1">
                <div className="font-medium">
                  {alert.symbol}{' '}
                  <span className="text-muted-foreground">
                    {CONDITIONS.find(c => c.id === alert.condition)?.name} {alert.targetValue}
                  </span>
                </div>
                {alert.message && (
                  <div className="text-sm text-muted-foreground">{alert.message}</div>
                )}
                <div className="text-xs text-muted-foreground">
                  创建于: {new Date(alert.createdAt).toLocaleString()}
                  {alert.triggeredAt && (
                    <span className="ml-2 text-green-600 dark:text-green-400">
                      ✓ 触发于: {new Date(alert.triggeredAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleAlert(alert.id, alert.isActive)}
                >
                  {alert.isActive ? '禁用' : '启用'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteAlert(alert.id)}
                >
                  删除
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}