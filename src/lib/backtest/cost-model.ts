export interface CostModelConfig {
  commission: {
    type: 'fixed' | 'percent' | 'both'
    fixedPerTrade: number
    percentOfValue: number
  }
  slippage: {
    model: 'fixed' | 'percent' | 'volume_based'
    value: number
  }
  stampDuty?: {
    enabled: boolean
    rate: number
  }
  dividendReinvestment?: {
    enabled: boolean
    reinvestRatio: number
  }
}

export const DEFAULT_COST_MODEL: CostModelConfig = {
  commission: { type: 'fixed', fixedPerTrade: 0, percentOfValue: 0 },
  slippage: { model: 'fixed', value: 0 },
  stampDuty: { enabled: false, rate: 0 },
  dividendReinvestment: { enabled: false, reinvestRatio: 0 },
}

export interface TradeCost {
  commission: number
  slippage: number
  stampDuty: number
  total: number
}

export interface DividendReinvestment {
  symbol: string
  dividendAmount: number
  reinvestAmount: number
  sharesPurchased: number
  remainingCash: number
  date: Date
}

export class CostModel {
  private config: CostModelConfig
  private totalCommissionPaid: number = 0
  private totalSlippagePaid: number = 0
  private totalStampDutyPaid: number = 0
  private dividendHistory: DividendReinvestment[] = []

  constructor(config: CostModelConfig) {
    this.config = config
  }

  calculateBuyCost(price: number, quantity: number): TradeCost {
    const value = price * quantity
    const commission = this.calculateCommission(value)
    const slippage = this.calculateSlippage(value)
    const stampDuty = this.calculateStampDuty(value, 'buy')

    return {
      commission,
      slippage,
      stampDuty,
      total: commission + slippage + stampDuty,
    }
  }

  calculateSellCost(price: number, quantity: number): TradeCost {
    const value = price * quantity
    const commission = this.calculateCommission(value)
    const slippage = this.calculateSlippage(value)
    const stampDuty = this.calculateStampDuty(value, 'sell')

    return {
      commission,
      slippage,
      stampDuty,
      total: commission + slippage + stampDuty,
    }
  }

  applySlippageToPrice(price: number, side: 'buy' | 'sell'): number {
    const { model, value: slippageValue } = this.config.slippage

    if (model === 'fixed') {
      return side === 'buy' ? price + slippageValue : price - slippageValue
    }

    const adjustment = price * slippageValue
    return side === 'buy' ? price + adjustment : price - adjustment
  }

  calculateDividendReinvestment(
    symbol: string,
    dividendPerShare: number,
    sharesOwned: number,
    currentPrice: number,
    date: Date
  ): DividendReinvestment {
    const totalDividend = dividendPerShare * sharesOwned
    const { enabled = false, reinvestRatio = 0 } = this.config.dividendReinvestment ?? {}

    if (!enabled || reinvestRatio <= 0) {
      return {
        symbol,
        dividendAmount: totalDividend,
        reinvestAmount: 0,
        sharesPurchased: 0,
        remainingCash: totalDividend,
        date,
      }
    }

    const reinvestAmount = totalDividend * reinvestRatio
    const remainingCash = totalDividend - reinvestAmount

    const buyCost = this.calculateBuyCost(currentPrice, 1)
    const costPerShare = currentPrice + buyCost.total

    const sharesPurchased = reinvestAmount / costPerShare

    return {
      symbol,
      dividendAmount: totalDividend,
      reinvestAmount,
      sharesPurchased,
      remainingCash,
      date,
    }
  }

  recordDividendReinvestment(record: DividendReinvestment): void {
    this.dividendHistory.push(record)
  }

  getDividendHistory(): DividendReinvestment[] {
    return [...this.dividendHistory]
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

  private calculateSlippage(value: number): number {
    const { model, value: slippageValue } = this.config.slippage

    switch (model) {
      case 'fixed':
        return slippageValue
      case 'percent':
      case 'volume_based':
        return value * slippageValue
      default:
        return 0
    }
  }

  private calculateStampDuty(value: number, side: 'buy' | 'sell'): number {
    const { enabled = false, rate = 0 } = this.config.stampDuty ?? {}

    if (!enabled || side === 'buy') {
      return 0
    }

    return value * rate
  }

  trackCost(cost: TradeCost): void {
    this.totalCommissionPaid += cost.commission
    this.totalSlippagePaid += cost.slippage
    this.totalStampDutyPaid += cost.stampDuty
  }

  calculateTotalCost(): number {
    return this.totalCommissionPaid + this.totalSlippagePaid + this.totalStampDutyPaid
  }

  getCommissionPaid(): number {
    return this.totalCommissionPaid
  }

  getSlippagePaid(): number {
    return this.totalSlippagePaid
  }

  getStampDutyPaid(): number {
    return this.totalStampDutyPaid
  }

  reset(): void {
    this.totalCommissionPaid = 0
    this.totalSlippagePaid = 0
    this.totalStampDutyPaid = 0
    this.dividendHistory = []
  }
}
