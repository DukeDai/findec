'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Trade {
  date: string
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  symbol: string
  reason?: string
  pnl?: number
}

interface TradeLogProps {
  trades: Trade[]
  pageSize?: number
}

type SortField = 'date' | 'symbol' | 'type' | 'price' | 'quantity' | 'value' | 'pnl'
type SortDirection = 'asc' | 'desc'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getSortIcon(field: SortField, currentField: SortField, direction: SortDirection) {
  if (currentField !== field) {
    return <span className="w-4 inline-block" />
  }
  return direction === 'asc'
    ? <ChevronUp className="h-4 w-4 inline" />
    : <ChevronDown className="h-4 w-4 inline" />
}

export function TradeLog({ trades, pageSize = 50 }: TradeLogProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [symbolFilter, setSymbolFilter] = useState('')

  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(trades.map(t => t.symbol))
    return Array.from(symbols).sort()
  }, [trades])

  const filteredTrades = useMemo(() => {
    if (!symbolFilter) return trades
    return trades.filter(t => t.symbol === symbolFilter)
  }, [trades, symbolFilter])

  const sortedTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        case 'price':
          comparison = a.price - b.price
          break
        case 'quantity':
          comparison = a.quantity - b.quantity
          break
        case 'value':
          comparison = (a.price * a.quantity) - (b.price * b.quantity)
          break
        case 'pnl':
          comparison = (a.pnl || 0) - (b.pnl || 0)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredTrades, sortField, sortDirection])

  const totalPages = Math.ceil(sortedTrades.length / pageSize)
  const paginatedTrades = sortedTrades.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">筛选股票:</span>
          <select
            value={symbolFilter}
            onChange={(e) => {
              setSymbolFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">全部股票</option>
            {uniqueSymbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
        </div>
        <span className="text-sm text-muted-foreground">
          共 {filteredTrades.length} 笔交易
        </span>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th
                  onClick={() => handleSort('date')}
                  className="px-3 py-2 text-left font-medium cursor-pointer hover:bg-accent"
                >
                  日期 {getSortIcon('date', sortField, sortDirection)}
                </th>
                <th
                  onClick={() => handleSort('symbol')}
                  className="px-3 py-2 text-left font-medium cursor-pointer hover:bg-accent"
                >
                  股票 {getSortIcon('symbol', sortField, sortDirection)}
                </th>
                <th
                  onClick={() => handleSort('type')}
                  className="px-3 py-2 text-left font-medium cursor-pointer hover:bg-accent"
                >
                  方向 {getSortIcon('type', sortField, sortDirection)}
                </th>
                <th
                  onClick={() => handleSort('price')}
                  className="px-3 py-2 text-right font-medium cursor-pointer hover:bg-accent"
                >
                  价格 {getSortIcon('price', sortField, sortDirection)}
                </th>
                <th
                  onClick={() => handleSort('quantity')}
                  className="px-3 py-2 text-right font-medium cursor-pointer hover:bg-accent"
                >
                  数量 {getSortIcon('quantity', sortField, sortDirection)}
                </th>
                <th
                  onClick={() => handleSort('value')}
                  className="px-3 py-2 text-right font-medium cursor-pointer hover:bg-accent"
                >
                  金额 {getSortIcon('value', sortField, sortDirection)}
                </th>
                <th
                  onClick={() => handleSort('pnl')}
                  className="px-3 py-2 text-right font-medium cursor-pointer hover:bg-accent"
                >
                  盈亏 {getSortIcon('pnl', sortField, sortDirection)}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  原因
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrades.map((trade, index) => (
                <tr key={`${trade.date}-${index}`} className="border-t hover:bg-accent/50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDate(trade.date)}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {trade.symbol}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        trade.type === 'BUY'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {trade.type === 'BUY' ? '买入' : '卖出'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(trade.price)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {trade.quantity.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(trade.price * trade.quantity)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {trade.pnl !== undefined ? (
                      <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">
                    {trade.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="text-sm text-muted-foreground">
            第 {currentPage} 页，共 {totalPages} 页
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
