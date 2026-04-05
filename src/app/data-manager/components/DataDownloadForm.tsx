'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Download, Import, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface Portfolio {
  id: string
  name: string
  positions: { symbol: string }[]
}

interface DownloadResult {
  symbol: string
  dataPoints: number
  fetchedAt: string
}

interface DownloadFailure {
  symbol: string
  reason: string
}

interface DownloadResponse {
  success: boolean
  downloaded: string[]
  failed: DownloadFailure[]
  cacheInfo: DownloadResult[]
  error?: string
}

interface CacheStatus {
  symbol: string
  ranges: { range: string; fetchedAt: string }[]
}

const RANGE_OPTIONS = [
  { value: '1y', label: '1年' },
  { value: '3mo', label: '3个月' },
  { value: '5y', label: '5年' },
  { value: 'max', label: '最大' },
]

export function DataDownloadForm() {
  const [symbols, setSymbols] = useState('')
  const [selectedRange, setSelectedRange] = useState('1y')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [result, setResult] = useState<DownloadResponse | null>(null)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [cacheStatus, setCacheStatus] = useState<CacheStatus[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPortfolios()
    loadCacheStatus()
  }, [])

  const loadPortfolios = async () => {
    try {
      const res = await fetch('/api/portfolios')
      if (res.ok) {
        const data = await res.json()
        setPortfolios(data)
      }
    } catch {
      setPortfolios([])
    }
  }

  const loadCacheStatus = async () => {
    try {
      const res = await fetch('/api/data-manager')
      if (res.ok) {
        const data = await res.json()
        setCacheStatus(data.status || [])
      }
    } catch {
      setCacheStatus([])
    }
  }

  const importFromPortfolio = () => {
    if (portfolios.length === 0) return
    const symbolsSet = new Set<string>()
    portfolios.forEach((p) => {
      p.positions?.forEach((pos) => {
        if (pos.symbol) symbolsSet.add(pos.symbol)
      })
    })
    const symbolsArray = Array.from(symbolsSet)
    if (symbolsArray.length > 0) {
      setSymbols(symbolsArray.join(', '))
    }
  }

  const handleSubmit = async () => {
    const symbolList = symbols
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0)

    if (symbolList.length === 0) {
      setError('请输入至少一个股票代码')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setProgress({ current: 0, total: symbolList.length })

    try {
      const res = await fetch('/api/data-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: symbolList,
          range: selectedRange,
        }),
      })

      const data: DownloadResponse = await res.json()

      if (!res.ok) {
        setError(data.error || '下载失败')
      } else {
        setResult(data)
        loadCacheStatus()
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  const getCachedSymbols = (): string[] => {
    return cacheStatus
      .filter((c) => c.ranges.some((r) => r.range === selectedRange))
      .map((c) => c.symbol)
  }

  const parsedSymbols = symbols
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>数据下载</CardTitle>
          <CardDescription>
            下载历史数据到本地缓存，减少实时API依赖
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">股票代码</label>
              {portfolios.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={importFromPortfolio}
                  disabled={loading}
                >
                  <Import className="w-4 h-4 mr-1" />
                  从现有持仓导入
                </Button>
              )}
            </div>
            <textarea
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
              placeholder="输入股票代码，用逗号分隔，例如：AAPL, MSFT, GOOGL"
              className="w-full min-h-[80px] px-3 py-2 rounded-md border bg-background text-sm resize-none"
              disabled={loading}
            />
            {parsedSymbols.length > 0 && (
              <p className="text-xs text-muted-foreground">
                已输入 {parsedSymbols.length} 个代码
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">时间范围</label>
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedRange(option.value)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    selectedRange === option.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>下载进度</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${
                      progress.total > 0
                        ? (progress.current / progress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading || parsedSymbols.length === 0}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                下载中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                开始下载
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>下载结果</CardTitle>
            <CardDescription>
              成功: {result.downloaded.length} | 失败: {result.failed.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.cacheInfo.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">股票</th>
                      <th className="px-4 py-3 text-right font-medium">数据点</th>
                      <th className="px-4 py-3 text-left font-medium">获取时间</th>
                      <th className="px-4 py-3 text-center font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.cacheInfo.map((item) => (
                      <tr key={item.symbol} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{item.symbol}</td>
                        <td className="px-4 py-3 text-right">
                          {item.dataPoints}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(item.fetchedAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        </td>
                      </tr>
                    ))}
                    {result.failed.map((item) => (
                      <tr key={item.symbol} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{item.symbol}</td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          -
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <XCircle className="w-5 h-5 text-red-500" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.failed.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-destructive">失败详情</p>
                <div className="space-y-1">
                  {result.failed.map((item) => (
                    <div
                      key={item.symbol}
                      className="p-2 rounded bg-destructive/5 text-sm"
                    >
                      <span className="font-medium">{item.symbol}</span>:{' '}
                      {item.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {cacheStatus.length > 0 && !result && (
        <Card>
          <CardHeader>
            <CardTitle>缓存状态</CardTitle>
            <CardDescription>
              当前范围 ({RANGE_OPTIONS.find((r) => r.value === selectedRange)?.label}) 已缓存:{' '}
              {getCachedSymbols().length} 个股票
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {getCachedSymbols().map((symbol) => (
                <span
                  key={symbol}
                  className="px-2 py-1 rounded-md bg-muted text-sm"
                >
                  {symbol}
                </span>
              ))}
              {getCachedSymbols().length === 0 && (
                <p className="text-sm text-muted-foreground">
                  该时间范围暂无缓存数据
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
