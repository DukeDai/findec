import type { TradeCost } from './cost-model'

export interface Position {
  symbol: string
  quantity: number
  entryPrice: number
  currentPrice: number
  weight: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
}

export interface PortfolioState {
  cash: number
  positions: Map<string, Position>
  totalValue: number
  timestamp: Date
}

export interface Trade {
  symbol: string
  date: Date
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  value: number
  reason: string
}

export class PositionManager {
  private cash: number
  private positions: Map<string, Position>
  private currentTimestamp: Date

  constructor(initialCapital: number) {
    this.cash = initialCapital
    this.positions = new Map()
    this.currentTimestamp = new Date()
  }

  getState(): PortfolioState {
    let totalValue = this.cash
    this.positions.forEach(position => {
      totalValue += position.quantity * position.currentPrice
    })

    return {
      cash: this.cash,
      positions: new Map(this.positions),
      totalValue,
      timestamp: this.currentTimestamp,
    }
  }

  getPosition(symbol: string): Position | null {
    return this.positions.get(symbol) ?? null
  }

  hasPosition(symbol: string): boolean {
    return this.positions.has(symbol)
  }

  calculateRebalanceTrades(
    currentPrices: Map<string, number>,
    targetWeights: Map<string, number>
  ): Trade[] {
    const trades: Trade[] = []
    const state = this.getState()
    const currentTotalValue = state.totalValue

    if (currentTotalValue <= 0) {
      return trades
    }

    targetWeights.forEach((targetWeight, symbol) => {
      const currentPrice = currentPrices.get(symbol)
      if (!currentPrice || currentPrice <= 0) {
        return
      }

      const currentPosition = this.positions.get(symbol)
      const currentQuantity = currentPosition?.quantity ?? 0
      const currentPositionValue = currentQuantity * currentPrice
      const currentWeight = currentPositionValue / currentTotalValue

      const targetValue = currentTotalValue * targetWeight
      const valueDifference = targetValue - currentPositionValue

      if (Math.abs(valueDifference) < 0.01) {
        return
      }

      const quantityToTrade = Math.floor(Math.abs(valueDifference) / currentPrice)
      if (quantityToTrade <= 0) {
        return
      }

      const tradeType: 'BUY' | 'SELL' = valueDifference > 0 ? 'BUY' : 'SELL'

      if (tradeType === 'BUY') {
        const maxAffordableQuantity = Math.floor(this.cash / currentPrice)
        const actualQuantity = Math.min(quantityToTrade, maxAffordableQuantity)
        if (actualQuantity <= 0) {
          return
        }

        trades.push({
          symbol,
          date: this.currentTimestamp,
          type: 'BUY',
          price: currentPrice,
          quantity: actualQuantity,
          value: actualQuantity * currentPrice,
          reason: `Rebalance: target weight ${(targetWeight * 100).toFixed(2)}%, current ${(currentWeight * 100).toFixed(2)}%`,
        })
      } else {
        const maxSellableQuantity = currentQuantity
        const actualQuantity = Math.min(quantityToTrade, maxSellableQuantity)
        if (actualQuantity <= 0) {
          return
        }

        trades.push({
          symbol,
          date: this.currentTimestamp,
          type: 'SELL',
          price: currentPrice,
          quantity: actualQuantity,
          value: actualQuantity * currentPrice,
          reason: `Rebalance: target weight ${(targetWeight * 100).toFixed(2)}%, current ${(currentWeight * 100).toFixed(2)}%`,
        })
      }
    })

    return trades
  }

  executeTrade(trade: Trade, cost: TradeCost): void {
    const totalCost = trade.value + cost.total

    if (trade.type === 'BUY') {
      if (this.cash < totalCost) {
        throw new Error(`Insufficient cash to execute buy trade: ${trade.symbol}`)
      }

      this.cash -= totalCost

      const existingPosition = this.positions.get(trade.symbol)
      if (existingPosition) {
        const totalQuantity = existingPosition.quantity + trade.quantity
        const totalCostBasis = (existingPosition.entryPrice * existingPosition.quantity) + (trade.price * trade.quantity)
        const newEntryPrice = totalCostBasis / totalQuantity

        this.positions.set(trade.symbol, {
          ...existingPosition,
          quantity: totalQuantity,
          entryPrice: newEntryPrice,
          currentPrice: trade.price,
          weight: 0,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
        })
      } else {
        this.positions.set(trade.symbol, {
          symbol: trade.symbol,
          quantity: trade.quantity,
          entryPrice: trade.price,
          currentPrice: trade.price,
          weight: 0,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
        })
      }
    } else if (trade.type === 'SELL') {
      const existingPosition = this.positions.get(trade.symbol)
      if (!existingPosition || existingPosition.quantity < trade.quantity) {
        throw new Error(`Insufficient position to execute sell trade: ${trade.symbol}`)
      }

      this.cash += (trade.value - cost.total)

      const remainingQuantity = existingPosition.quantity - trade.quantity
      if (remainingQuantity > 0) {
        this.positions.set(trade.symbol, {
          ...existingPosition,
          quantity: remainingQuantity,
          currentPrice: trade.price,
          weight: 0,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
        })
      } else {
        this.positions.delete(trade.symbol)
      }
    }

    this.recalculateWeights()
  }

  updatePrices(prices: Map<string, number>): void {
    prices.forEach((price, symbol) => {
      const position = this.positions.get(symbol)
      if (position && price > 0) {
        const unrealizedPnL = (price - position.entryPrice) * position.quantity
        const unrealizedPnLPercent = ((price - position.entryPrice) / position.entryPrice) * 100

        this.positions.set(symbol, {
          ...position,
          currentPrice: price,
          unrealizedPnL,
          unrealizedPnLPercent,
        })
      }
    })

    this.recalculateWeights()
  }

  updateTimestamp(timestamp: Date): void {
    this.currentTimestamp = timestamp
  }

  private recalculateWeights(): void {
    const state = this.getState()
    const totalValue = state.totalValue

    if (totalValue <= 0) {
      return
    }

    this.positions.forEach((position, symbol) => {
      const positionValue = position.quantity * position.currentPrice
      const weight = positionValue / totalValue

      this.positions.set(symbol, {
        ...position,
        weight,
      })
    })
  }

  getCash(): number {
    return this.cash
  }

  getPositions(): Map<string, Position> {
    return new Map(this.positions)
  }

  getTotalValue(): number {
    return this.getState().totalValue
  }
}
