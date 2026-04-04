export interface CostModelConfig {
  commission: {
    type: 'fixed' | 'percent' | 'both'
    fixedPerTrade: number
    percentOfValue: number
  }
  slippage: {
    model: 'fixed'
    fixedPercent: number
  }
}

export interface TradeCost {
  commission: number
  slippage: number
  total: number
}

export class CostModel {
  private config: CostModelConfig
  private totalCommissionPaid: number = 0
  private totalSlippagePaid: number = 0

  constructor(config: CostModelConfig) {
    this.config = config
  }

  calculateBuyCost(price: number, quantity: number): TradeCost {
    const value = price * quantity
    const commission = this.calculateCommission(value)
    const slippage = this.calculateSlippage(value, 'buy')

    return {
      commission,
      slippage,
      total: commission + slippage,
    }
  }

  calculateSellCost(price: number, quantity: number): TradeCost {
    const value = price * quantity
    const commission = this.calculateCommission(value)
    const slippage = this.calculateSlippage(value, 'sell')

    return {
      commission,
      slippage,
      total: commission + slippage,
    }
  }

  private calculateCommission(value: number): number {
    const { type, fixedPerTrade, percentOfValue } = this.config.commission

    switch (type) {
      case 'fixed':
        return fixedPerTrade
      case 'percent':
        return value * percentOfValue
      case 'both':
        return fixedPerTrade + value * percentOfValue
      default:
        return 0
    }
  }

  private calculateSlippage(value: number, _side: 'buy' | 'sell'): number {
    return value * this.config.slippage.fixedPercent
  }

  trackCost(cost: TradeCost): void {
    this.totalCommissionPaid += cost.commission
    this.totalSlippagePaid += cost.slippage
  }

  calculateTotalCost(): number {
    return this.totalCommissionPaid + this.totalSlippagePaid
  }

  getCommissionPaid(): number {
    return this.totalCommissionPaid
  }

  getSlippagePaid(): number {
    return this.totalSlippagePaid
  }

  reset(): void {
    this.totalCommissionPaid = 0
    this.totalSlippagePaid = 0
  }
}
