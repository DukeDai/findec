'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { paperTradingEngine, SerializablePaperPortfolio, PaperTrade } from '@/lib/trading/paper-trading'
import { TrendingUp, TrendingDown, Wallet, DollarSign, Activity, Bell, Plus, Trash2, AlertTriangle, Percent } from 'lucide-react'
import { io, Socket } from 'socket.io-client'

interface PortfolioSummaryCardProps {
  portfolio: SerializablePaperPortfolio | null
  loading?: boolean
}

interface PositionListTableProps {
  positions: SerializablePaperPortfolio['positions']
  onSell?: (symbol: string, quantity: number) => void
  loading?: boolean
}

interface TradeFormProps {
  onTrade: (symbol: string, quantity: number, action: 'buy' | 'sell') => void
  loading?: boolean
}

interface PnLChartProps {
  equityHistory: Array<{ timestamp: Date; equity: number; cash: number }>
  height?: number
}

interface TradeHistoryTableProps {
  trades: PaperTrade[]
  loading?: boolean
}

interface PriceAlertPanelProps {
  symbols: string[]
}

interface PerformanceMetricsProps {
  trades: PaperTrade[]
  initialCash: number
  currentEquity: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PortfolioSummaryCard({ portfolio, loading }: PortfolioSummaryCardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!portfolio) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          暂无投资组合数据
        </CardContent>
      </Card>
    )
  }

  const { totalPnL } = portfolio.pnl
  const totalPnLPct = ((portfolio.equity - (portfolio.equity - totalPnL)) / (portfolio.equity - totalPnL)) * 100

  const stats = [
    {
      label: '总资产',
      value: formatCurrency(portfolio.equity),
      icon: Wallet,
      color: 'text-foreground',
    },
    {
      label: '可用现金',
      value: formatCurrency(portfolio.cash),
      icon: DollarSign,
      color: 'text-foreground',
    },
    {
      label: '总盈亏',
      value: `${formatCurrency(totalPnL)} (${formatPercent(totalPnLPct)})`,
      icon: totalPnL >= 0 ? TrendingUp : TrendingDown,
      color: totalPnL >= 0 ? 'text-green-500' : 'text-red-500',
    },
    {
      label: '持仓数量',
      value: `${portfolio.positions.length} 只`,
      icon: Activity,
      color: 'text-foreground',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">{stat.label}</div>
              <stat.icon className={cn('w-4 h-4', stat.color)} />
            </div>
            <div className={cn('text-xl font-bold mt-1', stat.color)}>{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function PositionListTable({ positions, onSell, loading }: PositionListTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>持仓列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>持仓列表</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          暂无持仓，点击&quot;买入&quot;添加股票
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>持仓列表</CardTitle>
        <CardDescription>当前持有的股票及盈亏情况</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>股票代码</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">成本价</TableHead>
              <TableHead className="text-right">现价</TableHead>
              <TableHead className="text-right">市值</TableHead>
              <TableHead className="text-right">盈亏</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => (
              <TableRow key={position.symbol}>
                <TableCell className="font-medium">{position.symbol}</TableCell>
                <TableCell className="text-right">{position.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(position.entryPrice)}</TableCell>
                <TableCell className="text-right">{formatCurrency(position.currentPrice)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(position.currentPrice * position.quantity)}
                </TableCell>
                <TableCell className={cn(
                  'text-right',
                  position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'
                )}>
                  {formatCurrency(position.unrealizedPnL)}
                  <span className="text-xs ml-1">
                    ({formatPercent(position.unrealizedPnLPct)})
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSell?.(position.symbol, position.quantity)}
                  >
                    卖出
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function TradeForm({ onTrade, loading }: TradeFormProps) {
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('')
  const [action, setAction] = useState<'buy' | 'sell'>('buy')
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null)
  const [fetchingPrice, setFetchingPrice] = useState(false)

  const fetchPrice = useCallback(async () => {
    if (!symbol) return
    setFetchingPrice(true)
    try {
      const res = await fetch(`/api/quotes?symbol=${symbol.toUpperCase()}`)
      const data = await res.json()
      if (data.price) {
        setEstimatedPrice(data.price)
      }
    } catch (error) {
      console.error('Failed to fetch price:', error)
    } finally {
      setFetchingPrice(false)
    }
  }, [symbol])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (symbol.length >= 1) {
        fetchPrice()
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [symbol, fetchPrice])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!symbol || !quantity) return
    onTrade(symbol.toUpperCase(), parseInt(quantity, 10), action)
    setSymbol('')
    setQuantity('')
    setEstimatedPrice(null)
  }

  const totalValue = estimatedPrice && quantity ? estimatedPrice * parseInt(quantity, 10) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>交易下单</CardTitle>
        <CardDescription>买入或卖出股票</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">交易类型</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={action === 'buy' ? 'default' : 'outline'}
                  onClick={() => setAction('buy')}
                  className="flex-1"
                >
                  买入
                </Button>
                <Button
                  type="button"
                  variant={action === 'sell' ? 'default' : 'outline'}
                  onClick={() => setAction('sell')}
                  className="flex-1"
                >
                  卖出
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">股票代码</label>
              <Input
                placeholder="AAPL"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">数量</label>
            <Input
              type="number"
              placeholder="100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              disabled={loading}
            />
          </div>
          {fetchingPrice && (
            <div className="text-sm text-muted-foreground">获取最新价格...</div>
          )}
          {estimatedPrice && (
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">预估价格:</span>
                <span className="font-medium">{formatCurrency(estimatedPrice)}</span>
              </div>
              {totalValue && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">预估总额:</span>
                  <span className="font-medium">{formatCurrency(totalValue)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={!symbol || !quantity || loading}
            className="w-full"
          >
            {loading ? '交易中...' : action === 'buy' ? '确认买入' : '确认卖出'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export function PnLChart({ equityHistory, height = 300 }: PnLChartProps) {
  if (equityHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>资金曲线</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          暂无交易数据，开始交易后将显示资金曲线
        </CardContent>
      </Card>
    )
  }

  const chartData = equityHistory.map((point) => ({
    timestamp: new Date(point.timestamp).toLocaleDateString('zh-CN'),
    equity: point.equity,
    cash: point.cash,
    positions: point.equity - point.cash,
  }))

  const isProfit = chartData[chartData.length - 1].equity >= chartData[0].equity

  return (
    <Card>
      <CardHeader>
        <CardTitle>资金曲线</CardTitle>
        <CardDescription>账户总资产变化趋势</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 11 }}
              tickMargin={10}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              width={60}
            />
            <Tooltip
              formatter={(value) => {
                const numValue = typeof value === 'number' ? value : 0
                return [formatCurrency(numValue), '']
              }}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="equity"
              name="总资产"
              stroke={isProfit ? '#22c55e' : '#ef4444'}
              strokeWidth={2}
              fill="url(#equityGradient)"
            />
            <Line
              type="monotone"
              dataKey="cash"
              name="现金"
              stroke="#6b7280"
              strokeWidth={1}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function TradeHistoryTable({ trades, loading }: TradeHistoryTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          暂无交易记录
        </CardContent>
      </Card>
    )
  }

  const sortedTrades = [...trades].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>交易记录</CardTitle>
        <CardDescription>最近 {trades.length} 笔交易</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>股票</TableHead>
              <TableHead>操作</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">价格</TableHead>
              <TableHead className="text-right">盈亏</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTrades.slice(0, 20).map((trade) => (
              <TableRow key={trade.id}>
                <TableCell className="text-muted-foreground">
                  {formatDate(trade.timestamp)}
                </TableCell>
                <TableCell className="font-medium">{trade.symbol}</TableCell>
                <TableCell>
                  <Badge variant={trade.action === 'buy' ? 'default' : 'secondary'}>
                    {trade.action === 'buy' ? '买入' : '卖出'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{trade.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(trade.price)}</TableCell>
                <TableCell className={cn(
                  'text-right',
                  trade.pnl === undefined ? '' : trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                )}>
                  {trade.pnl !== undefined ? formatCurrency(trade.pnl) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function PriceAlertPanel({ symbols }: PriceAlertPanelProps) {
  const [alerts, setAlerts] = useState<Array<{
    id: string
    symbol: string
    condition: 'above' | 'below'
    targetPrice: number
    isActive: boolean
  }>>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    symbol: '',
    condition: 'above' as 'above' | 'below',
    targetPrice: '',
  })
  const socketRef = useRef<Socket | null>(null)

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts')
      if (res.ok) {
        const data = await res.json()
        const portfolioAlerts = data.filter((alert: { symbol: string }) => 
          symbols.includes(alert.symbol)
        )
        setAlerts(portfolioAlerts)
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    }
  }, [symbols])

  useEffect(() => {
    let isActive = true
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/alerts')
        if (res.ok && isActive) {
          const data = await res.json()
          const portfolioAlerts = data.filter((alert: { symbol: string }) => 
            symbols.includes(alert.symbol)
          )
          setAlerts(portfolioAlerts)
        }
      } catch (error) {
        console.error('Failed to load alerts:', error)
      }
    }
    fetchAlerts()
    return () => { isActive = false }
  }, [symbols])

  useEffect(() => {
    const socket = io(`${window.location.protocol}//${window.location.host}:3001`)
    socket.on('connect', () => {
      socket.emit('subscribe', { channel: 'alerts' })
    })
    socket.on('alert-triggered', () => {
      loadAlerts()
    })
    socketRef.current = socket
    return () => {
      socket.disconnect()
    }
  }, [loadAlerts])

  const createAlert = async () => {
    if (!formData.symbol || !formData.targetPrice) return
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: formData.symbol.toUpperCase(),
          condition: formData.condition,
          targetValue: parseFloat(formData.targetPrice),
          message: `${formData.symbol} ${formData.condition === 'above' ? '高于' : '低于'} $${formData.targetPrice}`,
        }),
      })
      if (res.ok) {
        loadAlerts()
        setShowForm(false)
        setFormData({ symbol: '', condition: 'above', targetPrice: '' })
      }
    } catch (error) {
      console.error('Failed to create alert:', error)
    }
  }

  const deleteAlert = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
      loadAlerts()
    } catch (error) {
      console.error('Failed to delete alert:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-4 h-4" />
          价格预警
        </CardTitle>
        <CardDescription>持仓股票的价格预警设置</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加预警
        </Button>

        {showForm && (
          <div className="rounded-lg border p-3 space-y-3 bg-muted/50">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">股票</label>
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-1"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                >
                  <option value="">选择...</option>
                  {symbols.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">条件</label>
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm mt-1"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as 'above' | 'below' })}
                >
                  <option value="above">高于</option>
                  <option value="below">低于</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">目标价格</label>
              <Input
                type="number"
                step="0.01"
                placeholder="150.00"
                value={formData.targetPrice}
                onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={createAlert} disabled={!formData.symbol || !formData.targetPrice}>
                创建
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                取消
              </Button>
            </div>
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            暂无预警设置
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-2 text-sm',
                  !alert.isActive && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{alert.symbol}</span>
                  <Badge variant="outline" className="text-xs">
                    {alert.condition === 'above' ? '高于' : '低于'} {formatCurrency(alert.targetPrice)}
                  </Badge>
                </div>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => deleteAlert(alert.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PerformanceMetrics({ trades, initialCash, currentEquity }: PerformanceMetricsProps) {
  const completedTrades = trades.filter((t) => t.pnl !== undefined)
  
  if (completedTrades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>交易绩效</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          暂无完成交易，卖出持仓后将显示绩效指标
        </CardContent>
      </Card>
    )
  }

  const winningTrades = completedTrades.filter((t) => (t.pnl || 0) > 0)
  const losingTrades = completedTrades.filter((t) => (t.pnl || 0) <= 0)
  
  const winRate = (winningTrades.length / completedTrades.length) * 100
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length
    : 0
  const avgLoss = losingTrades.length > 0
    ? losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length
    : 0
  
  const totalPnL = currentEquity - initialCash
  const totalReturn = (totalPnL / initialCash) * 100
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0

  const metrics = [
    { label: '胜率', value: `${winRate.toFixed(1)}%`, icon: Percent, color: 'text-blue-500' },
    { label: '平均盈利', value: formatCurrency(avgWin), icon: TrendingUp, color: 'text-green-500' },
    { label: '平均亏损', value: formatCurrency(avgLoss), icon: TrendingDown, color: 'text-red-500' },
    { label: '盈亏比', value: profitFactor.toFixed(2), icon: Activity, color: 'text-purple-500' },
    { label: '总收益率', value: formatPercent(totalReturn), icon: Wallet, color: totalReturn >= 0 ? 'text-green-500' : 'text-red-500' },
    { label: '总盈亏', value: formatCurrency(totalPnL), icon: DollarSign, color: totalPnL >= 0 ? 'text-green-500' : 'text-red-500' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>交易绩效</CardTitle>
        <CardDescription>
          已完成交易: {completedTrades.length} 笔 | 盈利: {winningTrades.length} 笔 | 亏损: {losingTrades.length} 笔
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <metric.icon className={cn('w-4 h-4', metric.color)} />
                <span className="text-xs text-muted-foreground">{metric.label}</span>
              </div>
              <div className={cn('text-lg font-bold mt-1', metric.color)}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Main Dashboard Component
interface PaperTradingDashboardProps {
  portfolioId?: string
  portfolioName?: string
  initialCash?: number
}

export default function PaperTradingDashboard({
  portfolioId = 'default',
  portfolioName = '模拟交易组合',
  initialCash = 100000,
}: PaperTradingDashboardProps) {
  const [portfolio, setPortfolio] = useState<SerializablePaperPortfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [tradeLoading, setTradeLoading] = useState(false)
  const [equityHistory, setEquityHistory] = useState<Array<{ timestamp: Date; equity: number; cash: number }>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let existingPortfolio = paperTradingEngine.getPortfolio(portfolioId)
    if (!existingPortfolio) {
      existingPortfolio = paperTradingEngine.createPortfolio(portfolioId, portfolioName, initialCash)
    }
    
    setEquityHistory([{
      timestamp: new Date(),
      equity: existingPortfolio.equity,
      cash: existingPortfolio.cash,
    }])
  }, [portfolioId, portfolioName, initialCash])

  useEffect(() => {
    const unsubscribe = paperTradingEngine.subscribe((updatedPortfolio) => {
      if (updatedPortfolio.id === portfolioId) {
        const serializable = paperTradingEngine.getSerializablePortfolio(portfolioId)
        setPortfolio(serializable || null)
        setLoading(false)
        
        setEquityHistory((prev) => {
          const newPoint = {
            timestamp: new Date(),
            equity: updatedPortfolio.equity,
            cash: updatedPortfolio.cash,
          }
          const lastPoint = prev[prev.length - 1]
          if (!lastPoint || 
              lastPoint.equity !== newPoint.equity || 
              newPoint.timestamp.getTime() - lastPoint.timestamp.getTime() > 5 * 60 * 1000) {
            return [...prev.slice(-50), newPoint]
          }
          return prev
        })
      }
    })

    const serializable = paperTradingEngine.getSerializablePortfolio(portfolioId)
    if (serializable) {
      setPortfolio(serializable)
      setLoading(false)
    }

    return unsubscribe
  }, [portfolioId])

  useEffect(() => {
    if (!portfolio || portfolio.positions.length === 0) return

    const positionSymbols = portfolio.positions.map((p) => p.symbol)

    const updatePrices = async () => {
      try {
        const res = await fetch(`/api/quotes?symbols=${positionSymbols.join(',')}`)
        if (res.ok) {
          const data = await res.json()
          for (const quote of data) {
            await paperTradingEngine.updatePrice(quote.symbol, quote.price)
          }
        }
      } catch (error) {
        console.error('Failed to update prices:', error)
      }
    }

    updatePrices()
    const interval = setInterval(updatePrices, 30000)
    return () => clearInterval(interval)
  }, [portfolio])

  const handleTrade = async (symbol: string, quantity: number, action: 'buy' | 'sell') => {
    setTradeLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/quotes?symbol=${symbol}`)
      const data = await res.json()
      const price = data.price

      if (!price) {
        setError(`无法获取 ${symbol} 的价格`)
        return
      }

      let result: PaperTrade | null = null
      if (action === 'buy') {
        result = paperTradingEngine.buy(portfolioId, symbol, quantity, price)
      } else {
        result = paperTradingEngine.sell(portfolioId, symbol, quantity, price)
      }

      if (!result) {
        setError(action === 'buy' ? '买入失败：资金不足或无此持仓' : '卖出失败：持仓不足')
      }
    } catch (err) {
      setError('交易执行失败')
      console.error('Trade error:', err)
    } finally {
      setTradeLoading(false)
    }
  }

  const handleSellPosition = (symbol: string, quantity: number) => {
    handleTrade(symbol, quantity, 'sell')
  }

  const symbols = portfolio?.positions.map((p) => p.symbol) || []

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-sm hover:underline"
          >
            关闭
          </button>
        </div>
      )}

      <PortfolioSummaryCard portfolio={portfolio} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <TradeForm
            onTrade={handleTrade}
            loading={tradeLoading}
          />
          <PriceAlertPanel symbols={symbols} />
          <PerformanceMetrics
            trades={portfolio?.trades || []}
            initialCash={initialCash}
            currentEquity={portfolio?.equity || initialCash}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <PositionListTable
            positions={portfolio?.positions || []}
            onSell={handleSellPosition}
            loading={loading}
          />
          <PnLChart equityHistory={equityHistory} />
          <TradeHistoryTable trades={portfolio?.trades || []} loading={loading} />
        </div>
      </div>
    </div>
  )
}
