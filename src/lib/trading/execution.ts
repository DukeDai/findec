export type OrderAction = 'stop_loss' | 'take_profit'
export type OrderType = 'market' | 'limit'
export type OrderStatus = 'pending' | 'triggered' | 'filled' | 'cancelled' | 'failed'

export interface ConditionalOrder {
  id: string
  symbol: string
  action: OrderAction
  orderType: OrderType
  triggerPrice: number
  limitPrice?: number
  quantity: number
  entryPrice: number
  portfolioId?: string
  createdAt: Date
  triggeredAt?: Date
  filledAt?: Date
  status: OrderStatus
  filledPrice?: number
}

export interface ExecutionResult {
  success: boolean
  orderId: string
  status: OrderStatus
  filledPrice?: number
  error?: string
}

export interface PlaceOrderParams {
  symbol: string
  action: OrderAction
  orderType: OrderType
  triggerPrice: number
  limitPrice?: number
  quantity: number
  entryPrice: number
  portfolioId?: string
}

class TradingExecutor {
  private orders = new Map<string, ConditionalOrder>()
  private dryRun = true

  setDryRun(dryRun: boolean): void {
    this.dryRun = dryRun
  }

  isDryRun(): boolean {
    return this.dryRun
  }

  async placeConditionalOrder(params: PlaceOrderParams): Promise<ConditionalOrder> {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const order: ConditionalOrder = {
      id: orderId,
      symbol: params.symbol,
      action: params.action,
      orderType: params.orderType,
      triggerPrice: params.triggerPrice,
      limitPrice: params.limitPrice,
      quantity: params.quantity,
      entryPrice: params.entryPrice,
      createdAt: new Date(),
      status: 'pending',
    }

    this.orders.set(orderId, order)

    return order
  }

  async checkAndTrigger(symbol: string, currentPrice: number): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = []

    for (const [orderId, order] of this.orders) {
      if (order.symbol !== symbol || order.status !== 'pending') continue

      const shouldTrigger = order.action === 'stop_loss'
        ? currentPrice <= order.triggerPrice
        : currentPrice >= order.triggerPrice

      if (shouldTrigger) {
        order.triggeredAt = new Date()
        order.status = 'triggered'

        const executionResult = await this.executeOrder(orderId, currentPrice)
        results.push(executionResult)
      }
    }

    return results
  }

  private async executeOrder(orderId: string, currentPrice: number): Promise<ExecutionResult> {
    const order = this.orders.get(orderId)
    if (!order) {
      return { success: false, orderId, status: 'failed', error: 'Order not found' }
    }

    if (this.dryRun) {
      order.status = 'filled'
      order.filledPrice = currentPrice
      order.filledAt = new Date()
      return { success: true, orderId, status: 'filled', filledPrice: currentPrice }
    }

    try {
      const filledPrice = order.orderType === 'limit' && order.limitPrice
        ? Math.min(currentPrice, order.limitPrice)
        : currentPrice

      order.status = 'filled'
      order.filledPrice = filledPrice
      order.filledAt = new Date()

      return { success: true, orderId, status: 'filled', filledPrice }
    } catch (error) {
      order.status = 'failed'
      return {
        success: false,
        orderId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Execution failed',
      }
    }
  }

  getOrder(orderId: string): ConditionalOrder | undefined {
    return this.orders.get(orderId)
  }

  getPendingOrders(symbol?: string): ConditionalOrder[] {
    const pending = Array.from(this.orders.values()).filter(o => o.status === 'pending')
    if (symbol) {
      return pending.filter(o => o.symbol === symbol)
    }
    return pending
  }

  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId)
    if (order && order.status === 'pending') {
      order.status = 'cancelled'
      return true
    }
    return false
  }

  getOrdersByPortfolio(portfolioId: string): ConditionalOrder[] {
    return Array.from(this.orders.values()).filter(o => o.portfolioId === portfolioId)
  }
}

export const tradingExecutor = new TradingExecutor()

export function calculateStopLossPrice(entryPrice: number, stopLossPercent: number): number {
  return entryPrice * (1 - stopLossPercent / 100)
}

export function calculateTakeProfitPrice(entryPrice: number, takeProfitPercent: number): number {
  return entryPrice * (1 + takeProfitPercent / 100)
}

export function calculateRiskRewardRatio(
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): number {
  const risk = Math.abs(entryPrice - stopLoss)
  const reward = Math.abs(takeProfit - entryPrice)
  return reward / risk
}