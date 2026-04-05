'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PredictionData {
  symbol: string
  upProbability: number
  signal: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
}

interface MLFactorPanelProps {
  symbol: string
  className?: string
}

function getSignalColor(signal: 'BUY' | 'SELL' | 'HOLD'): string {
  switch (signal) {
    case 'BUY':
      return 'bg-green-500'
    case 'SELL':
      return 'bg-red-500'
    case 'HOLD':
      return 'bg-amber-500'
    default:
      return 'bg-gray-500'
  }
}

function getSignalTextColor(signal: 'BUY' | 'SELL' | 'HOLD'): string {
  switch (signal) {
    case 'BUY':
      return 'text-green-600'
    case 'SELL':
      return 'text-red-600'
    case 'HOLD':
      return 'text-amber-600'
    default:
      return 'text-gray-600'
  }
}

function getSignalIcon(signal: 'BUY' | 'SELL' | 'HOLD') {
  switch (signal) {
    case 'BUY':
      return <TrendingUp className="w-5 h-5" />
    case 'SELL':
      return <TrendingDown className="w-5 h-5" />
    case 'HOLD':
      return <Minus className="w-5 h-5" />
    default:
      return <AlertCircle className="w-5 h-5" />
  }
}

function getSignalLabel(signal: 'BUY' | 'SELL' | 'HOLD'): string {
  switch (signal) {
    case 'BUY':
      return '买入'
    case 'SELL':
      return '卖出'
    case 'HOLD':
      return '观望'
    default:
      return '未知'
  }
}

export function MLFactorPanel({ symbol, className }: MLFactorPanelProps) {
  const [prediction, setPrediction] = useState<PredictionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPrediction = async () => {
    if (!symbol) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: [symbol],
          lookbackDays: 30,
        }),
      })

      if (!response.ok) {
        throw new Error('预测请求失败')
      }

      const data = await response.json()

      if (data.success && data.predictions.length > 0) {
        setPrediction(data.predictions[0])
      } else {
        setError(data.error || '无法获取预测结果')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '预测失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (symbol) {
      fetchPrediction()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <CardTitle className="text-base">ML方向预测</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPrediction}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-2 text-muted-foreground">加载预测...</span>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPrediction}
              className="mt-3"
            >
              重试
            </Button>
          </div>
        )}

        {!loading && !error && prediction && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    getSignalColor(prediction.signal).replace('bg-', 'bg-opacity-20 bg-')
                  )}
                >
                  <div className={getSignalTextColor(prediction.signal)}>
                    {getSignalIcon(prediction.signal)}
                  </div>
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    {getSignalLabel(prediction.signal)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    上涨概率: {(prediction.upProbability * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className={getSignalTextColor(prediction.signal)}
              >
                置信度 {(prediction.confidence * 100).toFixed(0)}%
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">看跌</span>
                <span className="text-muted-foreground">看涨</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-red-500 via-amber-500 to-green-500"
                  style={{ left: 0, right: 0 }}
                />
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                  style={{
                    left: `${prediction.upProbability * 100}%`,
                    transform: 'translateX(-50%)',
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">信号强度</span>
                <span className={getSignalTextColor(prediction.signal)}>
                  {prediction.confidence > 0.7
                    ? '强'
                    : prediction.confidence > 0.4
                      ? '中'
                      : '弱'}
                </span>
              </div>
              <Progress value={prediction.confidence * 100} className="h-1.5" />
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              基于LSTM神经网络模型分析历史价格数据预测未来方向
            </div>
          </div>
        )}

        {!loading && !error && !prediction && (
          <div className="text-center py-6 text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">选择股票以查看ML预测</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
