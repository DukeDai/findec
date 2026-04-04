'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Info, AlertCircle } from 'lucide-react'

interface RiskAlert {
  id: string
  type: 'drawdown' | 'concentration' | 'volatility' | 'correlation' | 'var'
  severity: 'info' | 'warning' | 'critical'
  message: string
  current: number
  threshold: number
  recommendations: string[]
  triggeredAt: string
}

interface RiskThreshold {
  maxDrawdown: number
  maxConcentration: number
  maxVolatility: number
  maxVaR: number
  correlationWarning: number
}

interface RiskMetrics {
  currentDrawdown: number
  maxConcentration: number
  annualizedVolatility: number
  var95: number
  avgCorrelation: number
}

interface RiskHistory {
  date: string
  var95: number
  drawdown: number
}

interface PortfolioRiskData {
  currentMetrics: RiskMetrics
  alerts: RiskAlert[]
  thresholds: RiskThreshold
  history: RiskHistory[]
}

interface PortfolioRiskPanelProps {
  portfolioId: string
}

export function PortfolioRiskPanel({ portfolioId }: PortfolioRiskPanelProps) {
  const [data, setData] = useState<PortfolioRiskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)

  useEffect(() => {
    fetchRiskData()
  }, [portfolioId])

  const fetchRiskData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/portfolio/${portfolioId}/risk`)
      if (!response.ok) throw new Error('Failed to fetch risk data')
      const data = await response.json()
      setData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleOptimize = async (method: string) => {
    setOptimizing(true)
    try {
      const response = await fetch(`/api/portfolio/${portfolioId}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      })
      if (!response.ok) throw new Error('Optimization failed')
      const result = await response.json()
      alert(`优化建议已生成：${result.suggestion.reason}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Optimization failed')
    } finally {
      setOptimizing(false)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />
      default:
        return <Info className="w-5 h-5 text-gray-500" />
    }
  }

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-900'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900'
    }
  }

  const getRiskLevel = (metrics: RiskMetrics): { level: string; color: string } => {
    let score = 0
    if (metrics.currentDrawdown > 0.1) score += 2
    if (metrics.maxConcentration > 0.25) score += 2
    if (metrics.annualizedVolatility > 0.2) score += 1
    if (metrics.var95 > 0.03) score += 1

    if (score >= 5) return { level: '高风险', color: 'text-red-600' }
    if (score >= 3) return { level: '中高风险', color: 'text-yellow-600' }
    if (score >= 1) return { level: '中等风险', color: 'text-blue-600' }
    return { level: '低风险', color: 'text-green-600' }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>组合风险监控</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>组合风险监控</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">{error}</div>
          <Button onClick={fetchRiskData} className="mt-4">
            重试
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const riskLevel = getRiskLevel(data.currentMetrics)
  const criticalAlerts = data.alerts.filter(a => a.severity === 'critical')
  const warningAlerts = data.alerts.filter(a => a.severity === 'warning')

  return (
    <div className="space-y-6">
      {/* Risk Gauge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>风险仪表盘</span>
            <span className={`text-lg font-bold ${riskLevel.color}`}>
              {riskLevel.level}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">
                {(data.currentMetrics.currentDrawdown * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">当前回撤</div>
              <div className="text-xs text-gray-400">
                阈值: {(data.thresholds.maxDrawdown * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">
                {(data.currentMetrics.maxConcentration * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">最大持仓占比</div>
              <div className="text-xs text-gray-400">
                阈值: {(data.thresholds.maxConcentration * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">
                {(data.currentMetrics.annualizedVolatility * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">年化波动率</div>
              <div className="text-xs text-gray-400">
                阈值: {(data.thresholds.maxVolatility * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">
                {(data.currentMetrics.var95 * 100).toFixed(2)}%
              </div>
              <div className="text-sm text-gray-500">VaR (95%)</div>
              <div className="text-xs text-gray-400">
                阈值: {(data.thresholds.maxVaR * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">
                {(data.currentMetrics.avgCorrelation * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-500">平均相关性</div>
              <div className="text-xs text-gray-400">
                阈值: {(data.thresholds.correlationWarning * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            风险预警
            {criticalAlerts.length > 0 && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                {criticalAlerts.length} 严重
              </span>
            )}
            {warningAlerts.length > 0 && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                {warningAlerts.length} 警告
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.alerts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Info className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>当前没有风险预警</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${getSeverityClass(alert.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-sm opacity-75 mt-1">
                        当前: {(alert.current * 100).toFixed(2)}% | 阈值:{' '}
                        {(alert.threshold * 100).toFixed(2)}%
                      </div>
                      {alert.recommendations.length > 0 && (
                        <ul className="mt-2 text-sm list-disc list-inside opacity-75">
                          {alert.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization */}
      <Card>
        <CardHeader>
          <CardTitle>组合优化</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            基于当前持仓情况，选择优化策略：
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={() => handleOptimize('risk_parity')}
              disabled={optimizing}
              className="h-auto py-4"
            >
              <div className="text-center">
                <div className="font-medium">风险平价</div>
                <div className="text-xs text-gray-500 mt-1">均衡风险贡献</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOptimize('min_variance')}
              disabled={optimizing}
              className="h-auto py-4"
            >
              <div className="text-center">
                <div className="font-medium">最小方差</div>
                <div className="text-xs text-gray-500 mt-1">降低波动率</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOptimize('max_sharpe')}
              disabled={optimizing}
              className="h-auto py-4"
            >
              <div className="text-center">
                <div className="font-medium">最大夏普</div>
                <div className="text-xs text-gray-500 mt-1">优化风险收益</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOptimize('equal_weight')}
              disabled={optimizing}
              className="h-auto py-4"
            >
              <div className="text-center">
                <div className="font-medium">等权重</div>
                <div className="text-xs text-gray-500 mt-1">简单分散</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
