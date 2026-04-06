import { tradingExecutor } from './execution'

export interface PaperPosition {
  symbol: string
  quantity: number
  entryPrice: number
  entryDate: Date
}

export interface PaperTrade {
  id: string
  symbol: string
  action: 'buy' | 'sell'
  quantity: number
  price: number
  timestamp: Date
  pnl?: number
}

export interface PaperPortfolio {
  id: string
  name: string
  cash: number
  positions: PaperPosition[]
  positionsMap: Map<string, PaperPosition>
  trades: PaperTrade[]
  equity: number
}

export interface SerializablePaperPortfolio {
  id: string
  name: string
  cash: number
  equity: number
  positions: Array<{
    symbol: string
    quantity: number
    entryPrice: number
    currentPrice: number
    unrealizedPnL: number
    unrealizedPnLPct: number
  }>
  trades: PaperTrade[]
  pnl: {
    totalPnL: number
    unrealizedPnL: number
    realizedPnL: number
  }
}

class PaperTradingEngine {
  private portfolios = new Map<string, PaperPortfolio>()
  private priceCache = new Map<string, number>()
  private listeners: ((portfolio: PaperPortfolio) => void)[] = []

  createPortfolio(id: string, name: string, initialCash: number = 100000): PaperPortfolio {
    const portfolio: PaperPortfolio = {
      id,
      name,
      cash: initialCash,
      positions: [],
      positionsMap: new Map(),
      trades: [],
      equity: initialCash,
    }
    this.portfolios.set(id, portfolio)
    return portfolio
  }

  getPortfolio(id: string): PaperPortfolio | undefined {
    return this.portfolios.get(id)
  }

  getPortfolios(): PaperPortfolio[] {
    return Array.from(this.portfolios.values())
  }

  listPortfolioIds(): string[] {
    return Array.from(this.portfolios.keys())
  }

  getTrades(portfolioId: string): PaperTrade[] {
    const portfolio = this.portfolios.get(portfolioId)
    return portfolio ? portfolio.trades.slice(-50) : []
  }

  getPositions(portfolioId: string): Array<{
    symbol: string
    quantity: number
    entryPrice: number
    currentPrice: number
    unrealizedPnL: number
    unrealizedPnLPct: number
  }> {
    return this.getPositionsWithCurrentPrices(portfolioId)
  }

  deletePortfolio(id: string): boolean {
    return this.portfolios.delete(id)
  }

  getSerializablePortfolio(portfolioId: string): SerializablePaperPortfolio | undefined {
    const portfolio = this.portfolios.get(portfolioId)
    if (!portfolio) return undefined

    const positionsWithPrices = this.getPositionsWithCurrentPrices(portfolioId)

    return {
      id: portfolio.id,
      name: portfolio.name,
      cash: portfolio.cash,
      equity: portfolio.equity,
      positions: positionsWithPrices,
      trades: portfolio.trades.slice(-50),
      pnl: this.calculatePnL(portfolioId),
    }
  }

  async updatePrice(symbol: string, price: number): Promise<void> {
    this.priceCache.set(symbol, price)
    const executions = await tradingExecutor.checkAndTrigger(symbol, price)
    for (const result of executions) {
      if (result.success) {
        const order = tradingExecutor.getOrder(result.orderId)
        if (order) {
          this.executeTradeFromOrder(order)
        }
      }
    }
  }

  private executeTradeFromOrder(order: import('./execution').ConditionalOrder): void {
    for (const portfolio of this.portfolios.values()) {
      const position = portfolio.positionsMap.get(order.symbol)
      if (!position) continue

      if (order.action === 'stop_loss' || order.action === 'take_profit') {
        const trade: PaperTrade = {
          id: order.id,
          symbol: order.symbol,
          action: order.action === 'stop_loss' ? 'sell' : 'sell',
          quantity: order.quantity,
          price: order.filledPrice || 0,
          timestamp: new Date(),
        }
        portfolio.trades.push(trade)
        portfolio.cash += trade.price * trade.quantity
        portfolio.positionsMap.delete(order.symbol)
        portfolio.positions = portfolio.positions.filter(p => p.symbol !== order.symbol)
        this.notifyListeners(portfolio)
      }
    }
  }

  buy(portfolioId: string, symbol: string, quantity: number, price: number): PaperTrade | null {
    const portfolio = this.portfolios.get(portfolioId)
    if (!portfolio) return null

    const cost = quantity * price
    if (portfolio.cash < cost) return null

    const trade: PaperTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      symbol,
      action: 'buy',
      quantity,
      price,
      timestamp: new Date(),
    }

    portfolio.trades.push(trade)
    portfolio.cash -= cost

    const existingPosition = portfolio.positionsMap.get(symbol)
    if (existingPosition) {
      const totalQty = existingPosition.quantity + quantity
      const avgPrice = (existingPosition.entryPrice * existingPosition.quantity + price * quantity) / totalQty
      existingPosition.quantity = totalQty
      existingPosition.entryPrice = avgPrice
    } else {
      const newPosition: PaperPosition = {
        symbol,
        quantity,
        entryPrice: price,
        entryDate: new Date(),
      }
      portfolio.positionsMap.set(symbol, newPosition)
      portfolio.positions.push(newPosition)
    }

    this.recalculateEquity(portfolio)
    this.notifyListeners(portfolio)
    return trade
  }

  sell(portfolioId: string, symbol: string, quantity: number, price: number): PaperTrade | null {
    const portfolio = this.portfolios.get(portfolioId)
    if (!portfolio) return null

    const position = portfolio.positionsMap.get(symbol)
    if (!position || position.quantity < quantity) return null

    const trade: PaperTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      symbol,
      action: 'sell',
      quantity,
      price,
      timestamp: new Date(),
      pnl: (price - position.entryPrice) * quantity,
    }

    portfolio.trades.push(trade)
    portfolio.cash += price * quantity

    if (position.quantity === quantity) {
      portfolio.positionsMap.delete(symbol)
      portfolio.positions = portfolio.positions.filter(p => p.symbol !== symbol)
    } else {
      position.quantity -= quantity
    }

    this.recalculateEquity(portfolio)
    this.notifyListeners(portfolio)
    return trade
  }

  private recalculateEquity(portfolio: PaperPortfolio): void {
    let positionValue = 0
    for (const position of portfolio.positions) {
      const currentPrice = this.priceCache.get(position.symbol) || position.entryPrice
      positionValue += position.quantity * currentPrice
    }
    portfolio.equity = portfolio.cash + positionValue
  }

  calculatePnL(portfolioId: string): { totalPnL: number; unrealizedPnL: number; realizedPnL: number } {
    const portfolio = this.portfolios.get(portfolioId)
    if (!portfolio) return { totalPnL: 0, unrealizedPnL: 0, realizedPnL: 0 }

    let realizedPnL = 0
    for (const trade of portfolio.trades) {
      if (trade.pnl !== undefined) {
        realizedPnL += trade.pnl
      }
    }

    let unrealizedPnL = 0
    for (const position of portfolio.positions) {
      const currentPrice = this.priceCache.get(position.symbol) || position.entryPrice
      unrealizedPnL += (currentPrice - position.entryPrice) * position.quantity
    }

    return {
      totalPnL: realizedPnL + unrealizedPnL,
      unrealizedPnL,
      realizedPnL,
    }
  }

  calculateMetrics(portfolioId: string): {
    pnl: { totalPnL: number; unrealizedPnL: number; realizedPnL: number }
    winRate: number
    avgWin: number
    avgLoss: number
    totalTrades: number
    winningTrades: number
    losingTrades: number
    initialCash: number
    currentEquity: number
  } {
    const portfolio = this.portfolios.get(portfolioId)
    if (!portfolio) {
      return {
        pnl: { totalPnL: 0, unrealizedPnL: 0, realizedPnL: 0 },
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        initialCash: 0,
        currentEquity: 0,
      }
    }

    const pnl = this.calculatePnL(portfolioId)
    const closedTrades = portfolio.trades.filter(t => t.action === 'sell' && t.pnl !== undefined)
    const winningTrades = closedTrades.filter(t => (t.pnl ?? 0) > 0)
    const losingTrades = closedTrades.filter(t => (t.pnl ?? 0) < 0)
    const totalClosed = closedTrades.length
    const winRate = totalClosed > 0 ? winningTrades.length / totalClosed : 0
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / winningTrades.length
      : 0
    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / losingTrades.length
      : 0

    return {
      pnl,
      winRate,
      avgWin,
      avgLoss,
      totalTrades: portfolio.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      initialCash: portfolio.cash + portfolio.trades.reduce((sum, t) => {
        return sum + (t.action === 'buy' ? t.price * t.quantity : -(t.price * t.quantity))
      }, 0),
      currentEquity: portfolio.equity,
    }
  }

  subscribe(callback: (portfolio: PaperPortfolio) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  private notifyListeners(portfolio: PaperPortfolio): void {
    for (const listener of this.listeners) {
      listener(portfolio)
    }
  }

  getPositionsWithCurrentPrices(portfolioId: string): Array<{
    symbol: string
    quantity: number
    entryPrice: number
    currentPrice: number
    unrealizedPnL: number
    unrealizedPnLPct: number
  }> {
    const portfolio = this.portfolios.get(portfolioId)
    if (!portfolio) return []

    const result = []
    for (const position of portfolio.positions) {
      const currentPrice = this.priceCache.get(position.symbol) || position.entryPrice
      const pnl = (currentPrice - position.entryPrice) * position.quantity
      const pnlPct = ((currentPrice - position.entryPrice) / position.entryPrice) * 100
      result.push({
        symbol: position.symbol,
        quantity: position.quantity,
        entryPrice: position.entryPrice,
        currentPrice,
        unrealizedPnL: pnl,
        unrealizedPnLPct: pnlPct,
      })
    }
    return result
  }
}

export const paperTradingEngine = new PaperTradingEngine()
