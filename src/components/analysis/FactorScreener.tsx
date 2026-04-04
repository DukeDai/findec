'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface FactorStrategy {
  id: string
  name: string
  description: string
  rules: { field: string; operator: string; value: number; weight?: number }[]
}

interface ScreeningResult {
  symbol: string
  name: string
  price: number
  change: number
  matchScore: number
  factors: Record<string, number>
}

const PRESET_STRATEGIES: FactorStrategy[] = [
  {
    id: 'value_growth',
    name: '价值成长股',
    description: '筛选低估值且有成长性的股票',
    rules: [
      { field: 'rsi_14', operator: '>', value: 30, weight: 0.3 },
      { field: 'rsi_14', operator: '<', value: 70, weight: 0.3 },
      { field: 'ma20_position', operator: '>', value: 0, weight: 0.2 },
      { field: 'momentum_10d', operator: '>', value: 0, weight: 0.2 },
    ],
  },
  {
    id: 'oversold_rebound',
    name: '超卖反弹',
    description: '筛选超卖后可能反弹的股票',
    rules: [
      { field: 'rsi_14', operator: '<', value: 30, weight: 0.5 },
      { field: 'bollinger_position', operator: '<', value: 20, weight: 0.5 },
    ],
  },
  {
    id: 'strong_trend',
    name: '强势趋势',
    description: '筛选处于强势上涨趋势的股票',
    rules: [
      { field: 'ma20_position', operator: '>', value: 5, weight: 0.3 },
      { field: 'ma50_position', operator: '>', value: 0, weight: 0.2 },
      { field: 'macd_signal', operator: '>', value: 0, weight: 0.3 },
      { field: 'momentum_10d', operator: '>', value: 3, weight: 0.2 },
    ],
  },
  {
    id: 'low_volatility',
    name: '低波动稳健',
    description: '筛选低波动率的稳健股票',
    rules: [
      { field: 'volatility_20d', operator: '<', value: 20, weight: 0.4 },
      { field: 'atr_ratio', operator: '<', value: 3, weight: 0.3 },
      { field: 'rsi_14', operator: '>', value: 40, weight: 0.3 },
    ],
  },
]

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM']

export function FactorScreener() {
  const [strategies, setStrategies] = useState<FactorStrategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<FactorStrategy | null>(null)
  const [results, setResults] = useState<ScreeningResult[]>([])
  const [loading, setLoading] = useState(false)
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS)
  const [customSymbols, setCustomSymbols] = useState('')

  const loadStrategies = async () => {
    try {
      const res = await fetch('/api/factors/strategies')
      const data = await res.json()
      if (data && data.length > 0) {
        setStrategies(data)
      }
    } catch (error) {
      console.error('Failed to load strategies:', error)
    }
  }

  const runScreen = async () => {
    if (!selectedStrategy) return
    setLoading(true)
    setResults([])
    try {
      const res = await fetch('/api/factors/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          strategyId: selectedStrategy.id,
          symbols: symbols 
        }),
      })
      const data = await res.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Failed to run screen:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomSymbols = () => {
    const parsed = customSymbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s)
    if (parsed.length > 0) {
      setSymbols(parsed)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRESET_STRATEGIES.map((strategy) => (
          <button
            key={strategy.id}
            onClick={() => setSelectedStrategy(strategy)}
            className={`p-4 rounded-lg border text-left transition-colors ${
              selectedStrategy?.id === strategy.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {strategy.id === 'oversold_rebound' ? (
                <TrendingDown className="w-5 h-5 text-green-500" />
              ) : strategy.id === 'strong_trend' ? (
                <TrendingUp className="w-5 h-5 text-blue-500" />
              ) : (
                <Activity className="w-5 h-5 text-purple-500" />
              )}
              <span className="font-medium">{strategy.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">{strategy.description}</p>
          </button>
        ))}
      </div>

      {selectedStrategy && (
        <div className="p-4 rounded-lg border bg-muted/50">
          <p className="text-sm font-medium mb-2">筛选条件</p>
          <div className="flex flex-wrap gap-2">
            {selectedStrategy.rules.map((rule, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-background border">
                {rule.field} {rule.operator} {rule.value} (权重{rule.weight})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">股票范围</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customSymbols}
            onChange={(e) => setCustomSymbols(e.target.value)}
            placeholder="输入股票代码，用逗号分隔"
            className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
          />
          <Button variant="outline" onClick={handleCustomSymbols}>
            应用
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          当前: {symbols.join(', ')}
        </p>
      </div>

      <Button 
        onClick={runScreen} 
        disabled={!selectedStrategy || loading}
        className="w-full"
        size="lg"
      >
        <Play className="w-4 h-4 mr-2" />
        {loading ? '筛选中...' : `执行筛选 (${selectedStrategy?.name || '未选择'})`}
      </Button>

      {results.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">股票</th>
                <th className="px-4 py-3 text-right font-medium">价格</th>
                <th className="px-4 py-3 text-right font-medium">涨跌幅</th>
                <th className="px-4 py-3 text-right font-medium">匹配度</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results
                .sort((a, b) => b.matchScore - a.matchScore)
                .map((r) => (
                  <tr key={r.symbol} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{r.symbol}</td>
                    <td className="px-4 py-3 text-right">${r.price?.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right ${r.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {r.change >= 0 ? '+' : ''}{r.change?.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        r.matchScore >= 70 ? 'bg-green-100 text-green-700' :
                        r.matchScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {r.matchScore?.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && !loading && selectedStrategy && (
        <p className="text-center text-muted-foreground py-8">
          点击「执行筛选」查看结果
        </p>
      )}
    </div>
  )
}
