'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

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
]

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

  const selectedCondition = CONDITIONS.find(c => c.id === formData.condition)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={() => setShowForm(true)} disabled={loading}>
          新建预警
        </Button>
        <Button variant="outline" onClick={checkAlerts} disabled={loading}>
          {loading ? '检查中...' : '检查预警'}
        </Button>
        <Button variant="outline" onClick={loadAlerts}>
          刷新
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
          <h3 className="font-medium">新建价格预警</h3>
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
              <label className="text-sm text-muted-foreground">目标值 ({selectedCondition?.unit})</label>
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
            <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {alerts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无预警，点击"新建预警"添加
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