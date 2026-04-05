'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getCorrelationColor,
  getCorrelationTextColor,
  formatCorrelation,
  CorrelationResult,
} from '@/lib/factors/factor-correlation'
import { cn } from '@/lib/utils'

interface FactorCorrelationHeatmapProps {
  onClose?: () => void
}

export function FactorCorrelationHeatmap({ onClose }: FactorCorrelationHeatmapProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CorrelationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)

  const fetchCorrelation = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/factors/correlation')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '计算失败')
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '计算因子相关性时出错')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCorrelation()
  }, [])

  const getFactorDisplayName = (factorId: string) => {
    // Map factor IDs to Chinese names
    const nameMap: Record<string, string> = {
      'ma20_position': 'MA20位置',
      'ma50_position': 'MA50位置',
      'rsi_14': 'RSI(14)',
      'macd_signal': 'MACD信号',
      'bollinger_position': '布林带位置',
      'momentum_10d': '10日动量',
      'volatility_20d': '20日波动率',
      'atr_ratio': 'ATR比率',
      'price_volume_trend': '价量趋势',
      'stoch_k': '随机K值',
    }
    return nameMap[factorId] || factorId
  }

  const renderHeatmap = () => {
    if (!data || data.factors.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          暂无因子数据
        </div>
      )
    }

    const cellSize = 60
    const labelWidth = 100
    const headerHeight = 100

    return (
      <div className="overflow-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${labelWidth}px repeat(${data.factors.length}, ${cellSize}px)`,
            gridTemplateRows: `${headerHeight}px repeat(${data.factors.length}, ${cellSize}px)`,
          }}
        >
          {/* Top-left empty cell */}
          <div />

          {/* Column headers (rotated) */}
          {data.factors.map((factorId, col) => (
            <div
              key={`header-${col}`}
              className="flex items-end justify-center pb-2"
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
            >
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {getFactorDisplayName(factorId)}
              </span>
            </div>
          ))}

          {/* Rows */}
          {data.factors.map((factorId, row) => (
            <>
              {/* Row label */}
              <div
                key={`label-${row}`}
                className="flex items-center justify-end pr-3"
              >
                <span className="text-xs text-muted-foreground text-right">
                  {getFactorDisplayName(factorId)}
                </span>
              </div>

              {/* Cells */}
              {data.factors.map((_, col) => {
                const correlation = data.matrix[row]?.[col] ?? 0
                const isHovered = hoveredCell?.row === row && hoveredCell?.col === col
                const isSymmetric = hoveredCell?.row === col && hoveredCell?.col === row
                const isDiagonal = row === col

                return (
                  <div
                    key={`cell-${row}-${col}`}
                    className={cn(
                      'flex items-center justify-center text-xs font-medium cursor-pointer transition-all',
                      isHovered && 'ring-2 ring-primary z-10',
                      isSymmetric && 'ring-2 ring-primary/50'
                    )}
                    style={{
                      backgroundColor: getCorrelationColor(correlation),
                      color: getCorrelationTextColor(correlation),
                      width: cellSize,
                      height: cellSize,
                    }}
                    onMouseEnter={() => setHoveredCell({ row, col })}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${getFactorDisplayName(data.factors[row])} vs ${getFactorDisplayName(data.factors[col])}: ${formatCorrelation(correlation)}`}
                  >
                    {isDiagonal ? '1.00' : formatCorrelation(correlation)}
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>
    )
  }

  const renderWarnings = () => {
    if (!data || data.warnings.length === 0) return null

    return (
      <div className="mt-6 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h4 className="font-medium text-amber-900 dark:text-amber-100">
            高相关性警告
          </h4>
          <span className="text-sm text-amber-700 dark:text-amber-300">
            ({data.warnings.length} 对因子)
          </span>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.warnings.map((warning, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200"
            >
              <span className="font-medium">
                {getFactorDisplayName(warning.factorA)}
              </span>
              <span>与</span>
              <span className="font-medium">
                {getFactorDisplayName(warning.factorB)}
              </span>
              <span>相关性</span>
              <span
                className={cn(
                  'font-mono font-bold',
                  warning.correlation > 0 ? 'text-red-500' : 'text-blue-500'
                )}
              >
                {formatCorrelation(warning.correlation)}
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                — 建议避免同时使用
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderLegend = () => (
    <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
      <span>负相关 (-1)</span>
      <div className="flex h-4 w-48 rounded overflow-hidden">
        <div className="flex-1" style={{ backgroundColor: getCorrelationColor(-1) }} />
        <div className="flex-1" style={{ backgroundColor: getCorrelationColor(-0.67) }} />
        <div className="flex-1" style={{ backgroundColor: getCorrelationColor(-0.33) }} />
        <div className="flex-1 border" style={{ backgroundColor: getCorrelationColor(0) }} />
        <div className="flex-1" style={{ backgroundColor: getCorrelationColor(0.33) }} />
        <div className="flex-1" style={{ backgroundColor: getCorrelationColor(0.67) }} />
        <div className="flex-1" style={{ backgroundColor: getCorrelationColor(1) }} />
      </div>
      <span>正相关 (+1)</span>
    </div>
  )

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-medium">因子相关性热力图</h3>
          <p className="text-sm text-muted-foreground">
            显示因子之间的皮尔逊相关系数，识别高度相关的因子对
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchCorrelation}
            disabled={loading}
            size="sm"
          >
            {loading ? '计算中...' : '重新计算'}
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        {loading && !data && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground mt-2">正在计算因子相关性...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-center">
            {error}
          </div>
        )}

        {data && (
          <>
            {renderHeatmap()}
            {renderLegend()}
            {renderWarnings()}
          </>
        )}
      </div>
    </div>
  )
}
