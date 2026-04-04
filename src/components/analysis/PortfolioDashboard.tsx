'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Position {
  id: string
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
}

interface Portfolio {
  id: string
  name: string
  description: string | null
  totalValue: number
}

interface PortfolioMetrics {
  totalValue: number
  totalCost: number
  totalReturn: number
  totalReturnPercent: number
  dailyChange: number
  dailyChangePercent: number
  positions: PositionMetrics[]
  allocation: AllocationItem[]
  topGainers: PositionMetrics[]
  topLosers: PositionMetrics[]
}

interface PositionMetrics {
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
  currentValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  dailyChange: number
  dailyChangePercent: number
  weight: number
}

interface AllocationItem {
  symbol: string
  value: number
  weight: number
}

export function PortfolioDashboard() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPortfolioForm, setShowPortfolioForm] = useState(false)
  const [showPositionForm, setShowPositionForm] = useState(false)
  
  const [portfolioForm, setPortfolioForm] = useState({
    name: '',
    description: '',
  })
  
  const [positionForm, setPositionForm] = useState({
    symbol: '',
    quantity: '',
    price: '',
    type: 'buy' as 'buy' | 'sell',
  })

  const loadPortfolios = async () => {
    try {
      const res = await fetch('/api/portfolios')
      const data = await res.json()
      setPortfolios(data)
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load portfolios:', error)
    }
  }

  const loadMetrics = async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/portfolios/${id}/metrics`)
      const data = await res.json()
      setMetrics(data)
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const createPortfolio = async () => {
    if (!portfolioForm.name) return

    try {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioForm),
      })
      const data = await res.json()
      setPortfolios((prev) => [data, ...prev])
      setSelectedId(data.id)
      setShowPortfolioForm(false)
      setPortfolioForm({ name: '', description: '' })
    } catch (error) {
      console.error('Failed to create portfolio:', error)
    }
  }

  const addPosition = async () => {
    if (!selectedId || !positionForm.symbol || !positionForm.quantity || !positionForm.price) return

    try {
      await fetch(`/api/portfolios/${selectedId}/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: positionForm.symbol.toUpperCase(),
          quantity: parseFloat(positionForm.quantity),
          price: parseFloat(positionForm.price),
          type: positionForm.type,
        }),
      })
      loadMetrics(selectedId)
      setShowPositionForm(false)
      setPositionForm({ symbol: '', quantity: '', price: '', type: 'buy' })
    } catch (error) {
      console.error('Failed to add position:', error)
    }
  }

  useEffect(() => {
    loadPortfolios()
  }, [])

  useEffect(() => {
    if (selectedId) {
      loadMetrics(selectedId)
    }
  }, [selectedId])

  const createDemoPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '示例投资组合',
          description: '包含主要科技股的示例组合',
        }),
      })
      const portfolio = await res.json()
      
      const demoPositions = [
        { symbol: 'AAPL', quantity: 100, avgCost: 175 },
        { symbol: 'MSFT', quantity: 50, avgCost: 380 },
        { symbol: 'GOOGL', quantity: 30, avgCost: 140 },
        { symbol: 'AMZN', quantity: 40, avgCost: 180 },
      ]
      
      for (const pos of demoPositions) {
        await fetch('/api/portfolios/' + portfolio.id + '/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pos),
        })
      }
      
      await loadPortfolios()
      setSelectedId(portfolio.id)
    } catch (error) {
      console.error('Failed to create demo portfolio:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowPortfolioForm(true)}>新建组合</Button>
        <Button variant="outline" onClick={() => setShowPositionForm(true)} disabled={!selectedId}>
          添加持仓
        </Button>
        <Button variant="outline" onClick={() => selectedId && loadMetrics(selectedId)} disabled={!selectedId || loading}>
          {loading ? '刷新中...' : '刷新'}
        </Button>
        <Button variant="secondary" onClick={createDemoPortfolio}>
          创建示例组合
        </Button>
      </div>

      {showPortfolioForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
          <h3 className="font-medium">新建投资组合</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">组合名称</label>
              <input
                type="text"
                placeholder="我的投资组合"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={portfolioForm.name}
                onChange={(e) => setPortfolioForm({ ...portfolioForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">描述 (可选)</label>
              <input
                type="text"
                placeholder="长期持有组合"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={portfolioForm.description}
                onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={createPortfolio} disabled={!portfolioForm.name}>创建</Button>
            <Button variant="outline" onClick={() => setShowPortfolioForm(false)}>取消</Button>
          </div>
        </div>
      )}

      {showPositionForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
          <h3 className="font-medium">添加持仓</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">股票代码</label>
              <input
                type="text"
                placeholder="AAPL"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={positionForm.symbol}
                onChange={(e) => setPositionForm({ ...positionForm, symbol: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">交易类型</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={positionForm.type}
                onChange={(e) => setPositionForm({ ...positionForm, type: e.target.value as 'buy' | 'sell' })}
              >
                <option value="buy">买入</option>
                <option value="sell">卖出</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">数量</label>
              <input
                type="number"
                placeholder="100"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={positionForm.quantity}
                onChange={(e) => setPositionForm({ ...positionForm, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">价格 ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="150.00"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={positionForm.price}
                onChange={(e) => setPositionForm({ ...positionForm, price: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addPosition} disabled={!positionForm.symbol || !positionForm.quantity || !positionForm.price}>
              添加
            </Button>
            <Button variant="outline" onClick={() => setShowPositionForm(false)}>取消</Button>
          </div>
        </div>
      )}

      {portfolios.length > 0 && (
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">选择组合...</option>
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {metrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">总市值</div>
              <div className="text-xl font-bold">${metrics.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">总收益</div>
              <div className={`text-xl font-bold ${metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${metrics.totalReturn.toFixed(2)} ({metrics.totalReturnPercent.toFixed(2)}%)
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">今日涨跌</div>
              <div className={`text-xl font-bold ${metrics.dailyChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${metrics.dailyChange.toFixed(2)} ({metrics.dailyChangePercent.toFixed(2)}%)
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">持仓数量</div>
              <div className="text-xl font-bold">{metrics.positions.length}</div>
            </div>
          </div>

          {metrics.positions.length > 0 && (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">股票</th>
                    <th className="px-3 py-2 text-right">数量</th>
                    <th className="px-3 py-2 text-right">成本</th>
                    <th className="px-3 py-2 text-right">现价</th>
                    <th className="px-3 py-2 text-right">市值</th>
                    <th className="px-3 py-2 text-right">收益</th>
                    <th className="px-3 py-2 text-right">占比</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.positions.map((p) => (
                    <tr key={p.symbol} className="border-t">
                      <td className="px-3 py-2 font-medium">{p.symbol}</td>
                      <td className="px-3 py-2 text-right">{p.quantity}</td>
                      <td className="px-3 py-2 text-right">${p.avgCost.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">${p.currentPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">${p.currentValue.toFixed(2)}</td>
                      <td className={`px-3 py-2 text-right ${p.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${p.unrealizedPnL.toFixed(2)} ({p.unrealizedPnLPercent.toFixed(1)}%)
                      </td>
                      <td className="px-3 py-2 text-right">{p.weight.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {metrics.allocation.length > 0 && (
            <div className="rounded-lg border p-4">
              <h3 className="font-medium mb-3">持仓占比</h3>
              <div className="h-6 rounded-full overflow-hidden flex">
                {metrics.allocation.map((a, i) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500']
                  return (
                    <div
                      key={a.symbol}
                      className={`${colors[i % colors.length]} flex items-center justify-center text-xs text-white font-medium`}
                      style={{ width: `${a.weight}%` }}
                      title={`${a.symbol}: ${a.weight.toFixed(1)}%`}
                    >
                      {a.weight > 10 && a.symbol}
                    </div>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {metrics.allocation.map((a, i) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500']
                  return (
                    <div key={a.symbol} className="flex items-center gap-1 text-xs">
                      <div className={`w-3 h-3 rounded ${colors[i % colors.length]}`} />
                      <span>{a.symbol}: {a.weight.toFixed(1)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {(metrics.topGainers.length > 0 || metrics.topLosers.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {metrics.topGainers.length > 0 && (
                <div className="rounded-lg border p-3">
                  <h4 className="text-sm font-medium text-green-500 mb-2">最佳表现</h4>
                  {metrics.topGainers.map((p) => (
                    <div key={p.symbol} className="flex justify-between text-sm py-1">
                      <span>{p.symbol}</span>
                      <span className="text-green-500">+{p.unrealizedPnLPercent.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              )}
              {metrics.topLosers.length > 0 && (
                <div className="rounded-lg border p-3">
                  <h4 className="text-sm font-medium text-red-500 mb-2">最差表现</h4>
                  {metrics.topLosers.map((p) => (
                    <div key={p.symbol} className="flex justify-between text-sm py-1">
                      <span>{p.symbol}</span>
                      <span className="text-red-500">{p.unrealizedPnLPercent.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}