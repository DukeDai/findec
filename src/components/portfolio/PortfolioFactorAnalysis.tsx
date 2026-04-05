'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine,
} from 'recharts'

interface Position {
  symbol: string
  weight: number
}

interface FactorExposure {
  factorId: string
  factorName: string
  category: string
  exposure: number
  contribution: number
}

interface BarraResult {
  positions: Position[]
  factorExposures: FactorExposure[]
  totalExposure: number
  activeExposure: number
  factorContributions: Array<{ factor: string; contribution: number; pct: number }>
  riskDecomposition: Array<{ source: string; varianceContribution: number; pct: number }>
  recommendations: string[]
  availableFactors: Array<{ id: string; name: string; category: string; description: string }>
}

const PRESET_PORTFOLIOS: Array<{ name: string; positions: Position[] }> = [
  {
    name: '科技组合',
    positions: [
      { symbol: 'AAPL', weight: 0.3 },
      { symbol: 'MSFT', weight: 0.25 },
      { symbol: 'GOOGL', weight: 0.2 },
      { symbol: 'NVDA', weight: 0.15 },
      { symbol: 'META', weight: 0.1 },
    ],
  },
  {
    name: '防御组合',
    positions: [
      { symbol: 'JNJ', weight: 0.3 },
      { symbol: 'PG', weight: 0.25 },
      { symbol: 'XOM', weight: 0.2 },
      { symbol: 'JPM', weight: 0.15 },
      { symbol: 'HD', weight: 0.1 },
    ],
  },
  {
    name: '高成长组合',
    positions: [
      { symbol: 'NVDA', weight: 0.3 },
      { symbol: 'TSLA', weight: 0.25 },
      { symbol: 'AMZN', weight: 0.2 },
      { symbol: 'META', weight: 0.15 },
      { symbol: 'AMD', weight: 0.1 },
    ],
  },
]

const COLORS: Record<string, string> = {
  市场: '#3b82f6',
  风格: '#8b5cf6',
  收益: '#22c55e',
}

export function PortfolioFactorAnalysis() {
  const [positions, setPositions] = useState<Position[]>(PRESET_PORTFOLIOS[0].positions)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BarraResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/portfolio/factor-exposure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '分析失败')
      }

      const data: BarraResult = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败')
    } finally {
      setLoading(false)
    }
  }

  const loadPreset = (preset: typeof PRESET_PORTFOLIOS[0]) => {
    setPositions(preset.positions)
    setResult(null)
  }

  const updateWeight = (symbol: string, weight: number) => {
    setPositions(prev => prev.map(p => p.symbol === symbol ? { ...p, weight } : p))
  }

  const addPosition = (symbol: string) => {
    if (positions.find(p => p.symbol === symbol)) return
    setPositions(prev => [...prev, { symbol, weight: 0 }])
  }

  const removePosition = (symbol: string) => {
    setPositions(prev => prev.filter(p => p.symbol !== symbol))
  }

  const chartData = result
    ? result.factorExposures.map(e => ({
        factor: e.factorName,
        exposure: e.exposure,
        contribution: e.contribution,
        category: e.category,
      }))
    : []

  const radarData = result
    ? result.factorExposures.map(e => ({
        factor: e.factorName,
        value: Math.abs(e.exposure),
      }))
    : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base"> Barra 风格因子暴露度分析</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {PRESET_PORTFOLIOS.map(p => (
              <Button key={p.name} variant="outline" size="sm" onClick={() => loadPreset(p)}>
                {p.name}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground font-medium border-b pb-1">
              <span className="col-span-3">股票</span>
              <span className="col-span-6">权重</span>
              <span className="col-span-2 text-right">数值</span>
              <span className="col-span-1"></span>
            </div>
            {positions.map(p => (
              <div key={p.symbol} className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-3 font-mono text-sm">{p.symbol}</span>
                <div className="col-span-6">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(p.weight * 100)}
                    onChange={e => updateWeight(p.symbol, parseInt(e.target.value) / 100)}
                    className="w-full"
                  />
                </div>
                <span className="col-span-2 text-right text-sm font-mono">
                  {(p.weight * 100).toFixed(1)}%
                </span>
                <button
                  className="col-span-1 text-destructive text-xs hover:underline text-center"
                  onClick={() => removePosition(p.symbol)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={runAnalysis} disabled={loading} className="flex-1">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />分析中...</> : '运行分析'}
            </Button>
          </div>

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
            {[
              { label: '总暴露度', value: result.totalExposure.toFixed(2), sub: '因子暴露绝对值之和' },
              { label: '主动暴露', value: result.activeExposure.toFixed(2), sub: '风格因子暴露' },
              { label: '持仓数量', value: String(result.positions.length), sub: '股票数量' },
            ].map(m => (
              <Card key={m.label}>
                <CardContent className="pt-4">
                  <div className="text-muted-foreground text-xs">{m.sub}</div>
                  <div className="text-2xl font-bold">{m.value}</div>
                  <div className="text-sm text-muted-foreground">{m.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">因子暴露度</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" fontSize={11} tickFormatter={v => v.toFixed(1)} />
                    <YAxis type="category" dataKey="factor" fontSize={11} width={60} />
                    <Tooltip formatter={(v) => `${Number(v).toFixed(3)}`} />
                    <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
                    <Bar dataKey="exposure" name="暴露度" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={COLORS[entry.category] ?? '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">因子雷达图</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="factor" fontSize={10} />
                    <PolarRadiusAxis fontSize={9} />
                    <Radar name="因子暴露" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">因子贡献度</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.factorContributions.map(fc => (
                  <div key={fc.factor} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{fc.factor}</span>
                      <span className="font-mono">{fc.pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, fc.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">风险分解</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.riskDecomposition.map(r => (
                  <div key={r.source} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{r.source}</span>
                      <span className="font-mono">{r.pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${r.pct}%`, backgroundColor: '#3b82f6' }}
                      />
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
