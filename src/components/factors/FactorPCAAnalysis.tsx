'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine
} from 'recharts'

interface PCAResult {
  components: number
  explainedVariance: number[]
  cumulativeVariance: number[]
  loadings: number[][]
  factorNames: string[]
  factorNameMap: Record<string, string>
  factorGroupings: Array<{
    principalComponent: number
    varianceExplained: number
    factors: Array<{ id: string; name: string; loading: number }>
  }>
  recommendations: string[]
  symbolCount: number
  analyzedFactors: number
}

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM']
const DEFAULT_FACTORS = [
  'ma20_position', 'ma50_position', 'rsi_14', 'macd_signal',
  'bollinger_position', 'momentum_10d', 'volatility_20d',
  'atr_position', 'obv_normalized', 'adx_strength',
]

export function FactorPCAAnalysis() {
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS.join(', '))
  const [factorIds, setFactorIds] = useState<string[]>(DEFAULT_FACTORS)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PCAResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = async () => {
    const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean)
    if (symbolList.length < 3) {
      setError('至少需要 3 只股票')
      return
    }
    if (factorIds.length < 2) {
      setError('至少需要 2 个因子')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/factors/pca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorIds, symbols: symbolList }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'PCA 分析失败')
      }

      const data: PCAResult = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PCA 分析失败')
    } finally {
      setLoading(false)
    }
  }

  const varianceChartData = result
    ? result.explainedVariance.map((v, i) => ({
        component: `PC${i + 1}`,
        explained: +(v * 100).toFixed(2),
        cumulative: +(result.cumulativeVariance[i] * 100).toFixed(2),
      }))
    : []

  const loadingHeatmapData = result
    ? result.factorNames.flatMap((fid, fi) =>
        result!.loadings.slice(0, 5).map((loading, pi) => ({
          factor: result!.factorNameMap[fid] || fid,
          component: `PC${pi + 1}`,
          loading: loading[fi],
        }))
      )
    : []

  const barColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef']

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">因子 PCA 降维分析</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">股票列表（逗号分隔）</label>
            <input
              type="text"
              value={symbols}
              onChange={e => setSymbols(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">因子选择</label>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
              {DEFAULT_FACTORS.map(fid => (
                <label key={fid} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={factorIds.includes(fid)}
                    onChange={e => {
                      if (e.target.checked) {
                        setFactorIds(prev => [...prev, fid])
                      } else {
                        setFactorIds(prev => prev.filter(id => id !== fid))
                      }
                    }}
                  />
                  {fid}
                </label>
              ))}
            </div>
          </div>

          <Button onClick={runAnalysis} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />分析中...</> : '运行 PCA 分析'}
          </Button>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          {result.recommendations.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">分析结论</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-primary font-medium">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-muted-foreground text-sm">主成分数量</div>
                <div className="text-2xl font-bold">{result.components}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-muted-foreground text-sm">因子数量</div>
                <div className="text-2xl font-bold">{result.analyzedFactors}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-muted-foreground text-sm">股票数量</div>
                <div className="text-2xl font-bold">{result.symbolCount}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">方差解释率</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={varianceChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="component" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={v => `${v.toFixed(1)}%`} />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                  <ReferenceLine y={10} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: '10% 阈值', fontSize: 10, fill: 'hsl(var(--destructive))' }} />
                  <Bar dataKey="explained" name="方差解释率">
                    {varianceChartData.map((_, i) => (
                      <Cell key={i} fill={barColors[i] || '#6366f1'} />
                    ))}
                  </Bar>
                  <Bar dataKey="cumulative" name="累计方差" fill="hsl(var(--muted))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">因子分组（主成分载荷）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {result.factorGroupings.map(group => (
                  <div key={group.principalComponent} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">PC{group.principalComponent}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {(group.varianceExplained * 100).toFixed(1)}% 方差
                      </span>
                    </div>
                    <div className="space-y-1">
                      {group.factors.map(f => (
                        <div key={f.id} className="flex items-center gap-3 text-sm">
                          <span className="w-32 truncate text-muted-foreground">{f.name}</span>
                          <div className="flex-1 relative h-4 bg-muted rounded overflow-hidden">
                            <div
                              className="absolute top-0 h-full transition-all"
                              style={{
                                left: '50%',
                                width: `${Math.min(50, Math.abs(f.loading) * 50)}%`,
                                backgroundColor: f.loading >= 0 ? '#22c55e' : '#ef4444',
                                [f.loading >= 0 ? 'right' : 'left']: '50%',
                              }}
                            />
                          </div>
                          <span className="w-16 text-right font-mono text-xs">
                            {f.loading >= 0 ? '+' : ''}{f.loading.toFixed(3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
