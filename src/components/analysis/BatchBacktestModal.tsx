'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface BatchResult {
  symbol: string
  result: {
    totalReturn: number
    sharpeRatio: number
    maxDrawdown: number
    winRate: number
    totalTrades: number
  } | null
  error: string | null
  dataFetchMs: number
  computeMs: number
}

interface BatchBacktestResponse {
  results: BatchResult[]
  summary: {
    totalReturn: number
    avgSharpe: number
    avgMaxDrawdown: number
    totalTrades: number
    avgWinRate: number
    symbolsCompleted: number
    symbolsFailed: number
  }
  failedSymbols: string[]
  totalMs: number
  parallel: boolean
}

const STRATEGIES = [
  { id: 'ma_crossover', name: 'MA均线交叉' },
  { id: 'rsi', name: 'RSI超买超卖' },
  { id: 'macd', name: 'MACD交叉' },
  { id: 'bollinger', name: '布林带' },
  { id: 'momentum', name: '动量策略' },
  { id: 'mean_reversion', name: '均值回归' },
  { id: 'trend_follow', name: '趋势跟踪' },
]

interface BatchBacktestModalProps {
  visible: boolean
  onClose: () => void
}

export function BatchBacktestModal({ visible, onClose }: BatchBacktestModalProps) {
  const [symbols, setSymbols] = useState('AAPL,MSFT,GOOGL,NVDA,TSLA')
  const [strategy, setStrategy] = useState('ma_crossover')
  const [startDate] = useState('2024-01-01')
  const [endDate] = useState('2024-12-31')
  const [initialCapital] = useState('100000')
  const [concurrency] = useState('4')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BatchBacktestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runBacktest = async () => {
    const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean)
    if (symbolList.length === 0) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/backtests/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: symbolList,
          strategy,
          parameters: {},
          initialCapital: parseFloat(initialCapital),
          startDate,
          endDate,
          concurrency: parseInt(concurrency),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '批量回测失败')
      }

      const data: BatchBacktestResponse = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量回测失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量回测</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">股票代码（逗号分隔）</label>
            <input
              type="text"
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              placeholder="AAPL,MSFT,GOOGL,NVDA,TSLA"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">策略</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              >
                {STRATEGIES.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">并行数</label>
              <select
                value={concurrency}
                onChange={(e) => {}}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              >
                <option value="2">2 并发</option>
                <option value="4">4 并发（推荐）</option>
                <option value="8">8 并发</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>起始: {startDate}</div>
            <div>结束: {endDate}</div>
            <div>初始资金: ${parseInt(initialCapital).toLocaleString()}</div>
          </div>

          <Button onClick={runBacktest} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />回测中...</> : '开始批量回测'}
          </Button>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          {result && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">聚合摘要</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">平均收益率</div>
                      <div className="text-lg font-semibold">{result.summary.totalReturn.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">平均夏普比率</div>
                      <div className="text-lg font-semibold">{result.summary.avgSharpe.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">平均最大回撤</div>
                      <div className="text-lg font-semibold">{result.summary.avgMaxDrawdown.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">完成/失败</div>
                      <div className="text-lg font-semibold">{result.summary.symbolsCompleted}/{result.summary.symbolsFailed}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">平均胜率</div>
                      <div className="text-lg font-semibold">{result.summary.avgWinRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">总耗时</div>
                      <div className="text-lg font-semibold">{result.totalMs}ms {result.parallel ? '✓ 并行' : '○ 串行'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">各标的回测结果</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4">股票</th>
                          <th className="text-right py-2 pr-4">收益率</th>
                          <th className="text-right py-2 pr-4">夏普</th>
                          <th className="text-right py-2 pr-4">最大回撤</th>
                          <th className="text-right py-2 pr-4">胜率</th>
                          <th className="text-right py-2">交易次数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.results
                          .filter(r => r.result !== null)
                          .sort((a, b) => (b.result?.totalReturn ?? 0) - (a.result?.totalReturn ?? 0))
                          .map(r => (
                          <tr key={r.symbol} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{r.symbol}</td>
                            <td className={`text-right py-2 pr-4 ${(r.result?.totalReturn ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {(r.result?.totalReturn ?? 0).toFixed(2)}%
                            </td>
                            <td className="text-right py-2 pr-4">{r.result?.sharpeRatio.toFixed(2)}</td>
                            <td className="text-right py-2 pr-4">{r.result?.maxDrawdown.toFixed(2)}%</td>
                            <td className="text-right py-2 pr-4">{r.result?.winRate.toFixed(1)}%</td>
                            <td className="text-right py-2">{r.result?.totalTrades}</td>
                          </tr>
                        ))}
                        {result.results.filter(r => r.error).map(r => (
                          <tr key={r.symbol} className="border-b text-destructive">
                            <td className="py-2 pr-4 font-medium">{r.symbol}</td>
                            <td colSpan={5} className="text-right py-2">失败: {r.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
