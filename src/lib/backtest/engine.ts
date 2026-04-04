import { SMA, EMA, RSI, MACD, BollingerBands } from 'technicalindicators'
import type { HistoricalPrice } from '@/lib/indicators'
import { CostModel, TradeCost } from './cost-model'
import { PositionManager, PortfolioState, Trade } from './position-manager'
import { RiskMetricsCalculator, EquityPoint, RiskMetrics } from './risk-metrics'

export interface StrategyConfig {
  symbol: string
  type: 'ma_crossover' | 'rsi' | 'macd' | 'bollinger' | 'momentum'
  parameters: {
    shortWindow?: number
    longWindow?: number
    rsiPeriod?: number
    rsiOverbought?: number
    rsiOversold?: number
    macdFast?: number
    macdSlow?: number
    macdSignal?: number
    bollingerPeriod?: number
    bollingerStdDev?: number
    momentumPeriod?: number
    momentumThreshold?: number
  }
}

export interface Signal {
  type: 'BUY' | 'SELL' | null
  reason: string
  timestamp: Date
}

export interface DataSource {
  fetchData(symbol: string, startDate: Date, endDate: Date): Promise<HistoricalPrice[]>
}

export interface BacktestConfig {
  name: string
  symbols: string[]
  initialCapital: number
  allocation: Map<string, number>
  strategies: StrategyConfig[]
  rebalance: 'none' | 'daily' | 'weekly' | 'monthly'
  rebalanceThreshold: number
}

export interface BacktestResult {
  planId: string
  status: string
  metrics: RiskMetrics
  equityCurve: EquityPoint[]
  trades: Trade[]
  finalState: PortfolioState
}

export class PortfolioBacktestEngine {
  private dataSource: DataSource
  private costModel: CostModel
  private riskCalculator: RiskMetricsCalculator

  constructor(dataSource: DataSource, costModel: CostModel) {
    this.dataSource = dataSource
    this.costModel = costModel
    this.riskCalculator = new RiskMetricsCalculator()
  }

  async run(config: BacktestConfig): Promise<BacktestResult> {
    const planId = `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const positionManager = new PositionManager(config.initialCapital)
    const allTrades: Trade[] = []
    const equityCurve: EquityPoint[] = []

    const symbolData: Map<string, HistoricalPrice[]> = new Map()
    const startDate = new Date('2020-01-01')
    const endDate = new Date()

    for (const symbol of config.symbols) {
      const data = await this.dataSource.fetchData(symbol, startDate, endDate)
      if (data.length > 0) {
        symbolData.set(symbol, data)
      }
    }

    if (symbolData.size === 0) {
      return this.createEmptyResult(planId, positionManager)
    }

    const firstSymbol = config.symbols[0]
    const firstData = symbolData.get(firstSymbol) ?? []

    equityCurve.push({
      date: firstData[0]?.date ?? new Date(),
      value: config.initialCapital,
    })

    let lastRebalanceDate = firstData[0]?.date ?? new Date()

    for (let i = 1; i < firstData.length; i++) {
      const currentDate = firstData[i].date
      const currentPrices: Map<string, number> = new Map()

      for (const [symbol, data] of symbolData) {
        if (i < data.length) {
          currentPrices.set(symbol, data[i].close)
        }
      }

      positionManager.updateTimestamp(currentDate)
      positionManager.updatePrices(currentPrices)

      const state = positionManager.getState()

      const signals: Signal[] = []
      for (const strategy of config.strategies) {
        const data = symbolData.get(strategy.symbol)
        if (data && i < data.length) {
          const signal = this.generateSignal(data.slice(0, i + 1), strategy)
          if (signal.type) {
            signals.push(signal)
          }
        }
      }

      if (this.shouldRebalance(currentDate, lastRebalanceDate, config.rebalance)) {
        const rebalanceTrades = positionManager.calculateRebalanceTrades(currentPrices, config.allocation)
        for (const trade of rebalanceTrades) {
          try {
            const cost = trade.type === 'BUY'
              ? this.costModel.calculateBuyCost(trade.price, trade.quantity)
              : this.costModel.calculateSellCost(trade.price, trade.quantity)

            positionManager.executeTrade(trade, cost)
            this.costModel.trackCost(cost)
            allTrades.push(trade)
          } catch {
            continue
          }
        }
        lastRebalanceDate = currentDate
      }

      for (const signal of signals) {
        const symbol = signal.reason.split(':')[0] ?? config.symbols[0]
        const price = currentPrices.get(symbol)

        if (!price) continue

        const existingPosition = positionManager.getPosition(symbol)

        if (signal.type === 'BUY' && !existingPosition) {
          const cash = positionManager.getCash()
          const targetWeight = config.allocation.get(symbol) ?? 1 / config.symbols.length
          const targetValue = state.totalValue * targetWeight
          const quantity = Math.floor(targetValue / price)

          if (quantity > 0 && cash >= targetValue) {
            const cost = this.costModel.calculateBuyCost(price, quantity)
            const trade: Trade = {
              symbol,
              date: currentDate,
              type: 'BUY',
              price,
              quantity,
              value: quantity * price,
              reason: signal.reason,
            }

            try {
              positionManager.executeTrade(trade, cost)
              this.costModel.trackCost(cost)
              allTrades.push(trade)
            } catch {
              continue
            }
          }
        } else if (signal.type === 'SELL' && existingPosition) {
          const quantity = existingPosition.quantity
          const cost = this.costModel.calculateSellCost(price, quantity)
          const trade: Trade = {
            symbol,
            date: currentDate,
            type: 'SELL',
            price,
            quantity,
            value: quantity * price,
            reason: signal.reason,
          }

          try {
            positionManager.executeTrade(trade, cost)
            this.costModel.trackCost(cost)
            allTrades.push(trade)
          } catch {
            continue
          }
        }
      }

      equityCurve.push({
        date: currentDate,
        value: state.totalValue,
      })
    }

    const tradeForStats = allTrades.map(t => ({ type: t.type, value: t.value }))
    const metrics = this.riskCalculator.calculate(equityCurve, tradeForStats)

    return {
      planId,
      status: 'completed',
      metrics,
      equityCurve,
      trades: allTrades,
      finalState: positionManager.getState(),
    }
  }

  private generateSignal(data: HistoricalPrice[], config: StrategyConfig): Signal {
    const closes = data.map(d => d.close)
    const lastIndex = closes.length - 1
    const currentPrice = closes[lastIndex]
    const currentDate = data[lastIndex].date

    let signal: 'BUY' | 'SELL' | null = null
    let reason = ''

    switch (config.type) {
      case 'ma_crossover': {
        const shortWindow = config.parameters.shortWindow ?? 10
        const longWindow = config.parameters.longWindow ?? 30

        if (closes.length < longWindow + 1) {
          break
        }

        const maShort = SMA.calculate({ period: shortWindow, values: closes })
        const maLong = SMA.calculate({ period: longWindow, values: closes })

        const currentShort = maShort[maShort.length - 1]
        const currentLong = maLong[maLong.length - 1]
        const prevShort = maShort[maShort.length - 2]
        const prevLong = maLong[maLong.length - 2]

        if (prevShort <= prevLong && currentShort > currentLong) {
          signal = 'BUY'
          reason = `${config.symbol}: MA Cross - ${shortWindow}-MA crosses above ${longWindow}-MA`
        } else if (prevShort >= prevLong && currentShort < currentLong) {
          signal = 'SELL'
          reason = `${config.symbol}: MA Cross - ${shortWindow}-MA crosses below ${longWindow}-MA`
        }
        break
      }

      case 'rsi': {
        const period = config.parameters.rsiPeriod ?? 14
        const oversold = config.parameters.rsiOversold ?? 30
        const overbought = config.parameters.rsiOverbought ?? 70

        if (closes.length < period + 1) {
          break
        }

        const rsiValues = RSI.calculate({ period, values: closes })
        const currentRSI = rsiValues[rsiValues.length - 1]

        if (currentRSI < oversold) {
          signal = 'BUY'
          reason = `${config.symbol}: RSI ${currentRSI.toFixed(2)} oversold (below ${oversold})`
        } else if (currentRSI > overbought) {
          signal = 'SELL'
          reason = `${config.symbol}: RSI ${currentRSI.toFixed(2)} overbought (above ${overbought})`
        }
        break
      }

      case 'macd': {
        const fast = config.parameters.macdFast ?? 12
        const slow = config.parameters.macdSlow ?? 26
        const signalPeriod = config.parameters.macdSignal ?? 9

        if (closes.length < slow + signalPeriod + 1) {
          break
        }

        const macdResult = MACD.calculate({
          values: closes,
          fastPeriod: fast,
          slowPeriod: slow,
          signalPeriod,
          SimpleMAOscillator: false,
          SimpleMASignal: false,
        })

        const current = macdResult[macdResult.length - 1]
        const prev = macdResult[macdResult.length - 2]

        if (prev && current) {
          if ((prev.MACD ?? 0) <= (prev.signal ?? 0) && (current.MACD ?? 0) > (current.signal ?? 0)) {
            signal = 'BUY'
            reason = `${config.symbol}: MACD crosses above signal`
          } else if ((prev.MACD ?? 0) >= (prev.signal ?? 0) && (current.MACD ?? 0) < (current.signal ?? 0)) {
            signal = 'SELL'
            reason = `${config.symbol}: MACD crosses below signal`
          }
        }
        break
      }

      case 'bollinger': {
        const period = config.parameters.bollingerPeriod ?? 20
        const stdDev = config.parameters.bollingerStdDev ?? 2

        if (closes.length < period + 1) {
          break
        }

        const bbResult = BollingerBands.calculate({ values: closes, period, stdDev })
        const currentBB = bbResult[bbResult.length - 1]

        if (currentBB) {
          if (currentPrice <= currentBB.lower) {
            signal = 'BUY'
            reason = `${config.symbol}: Price touched lower Bollinger Band`
          } else if (currentPrice >= currentBB.upper) {
            signal = 'SELL'
            reason = `${config.symbol}: Price touched upper Bollinger Band`
          }
        }
        break
      }

      case 'momentum': {
        const momentumPeriod = config.parameters.momentumPeriod ?? 10
        const threshold = config.parameters.momentumThreshold ?? 5

        if (closes.length < momentumPeriod + 1) {
          break
        }

        const momentum = ((currentPrice - closes[closes.length - 1 - momentumPeriod]) / closes[closes.length - 1 - momentumPeriod]) * 100

        if (momentum > threshold) {
          signal = 'BUY'
          reason = `${config.symbol}: Momentum ${momentum.toFixed(2)}% above ${threshold}%`
        } else if (momentum < -threshold) {
          signal = 'SELL'
          reason = `${config.symbol}: Momentum ${momentum.toFixed(2)}% below -${threshold}%`
        }
        break
      }
    }

    return {
      type: signal,
      reason,
      timestamp: currentDate,
    }
  }

  private shouldRebalance(currentDate: Date, lastRebalanceDate: Date, frequency: string): boolean {
    const msPerDay = 1000 * 60 * 60 * 24
    const daysDiff = Math.floor((currentDate.getTime() - lastRebalanceDate.getTime()) / msPerDay)

    switch (frequency) {
      case 'daily':
        return daysDiff >= 1
      case 'weekly':
        return daysDiff >= 7
      case 'monthly':
        return daysDiff >= 30
      case 'none':
      default:
        return false
    }
  }

  private createEmptyResult(planId: string, positionManager: PositionManager): BacktestResult {
    return {
      planId,
      status: 'completed',
      metrics: {
        totalReturn: 0,
        annualizedReturn: 0,
        volatility: 0,
        annualizedVolatility: 0,
        maxDrawdown: 0,
        maxDrawdownDuration: 0,
        currentDrawdown: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        var95: 0,
        var99: 0,
        expectedShortfall: 0,
        totalTrades: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxConsecutiveLosses: 0,
      },
      equityCurve: [],
      trades: [],
      finalState: positionManager.getState(),
    }
  }
}
