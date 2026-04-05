import { NextRequest, NextResponse } from 'next/server'
import { MonteCarloSimulator, MonteCarloConfig } from '@/lib/backtest/monte-carlo'
import { PortfolioBacktestEngine, BacktestConfig } from '@/lib/backtest/engine'
import { CostModel } from '@/lib/backtest/cost-model'
import { DataSource } from '@/lib/backtest/engine'
import { prisma } from '@/lib/prisma'

interface MonteCarloRequest {
  simulations?: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: MonteCarloRequest = await request.json()
    const simulations = body.simulations ?? 1000

    const plan = await prisma.portfolioBacktestPlan.findUnique({ where: { id } })
    if (!plan) {
      return NextResponse.json(
        { error: '回测计划不存在' },
        { status: 404 }
      )
    }

    const symbols = JSON.parse(plan.symbols || '[]') as string[]
    const allocation = JSON.parse(plan.allocation || '{}') as Record<string, number>
    const strategies = JSON.parse(plan.strategies || '[]') as Array<{
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
    }>

    const costModel = new CostModel({
      commission: { type: 'percent', fixedPerTrade: 0, percentOfValue: 0.001 },
      slippage: { model: 'fixed', value: 0.001 },
    })
    const dataSource = new (class implements DataSource {
      async fetchData(symbol: string, startDate: Date, endDate: Date) {
        const response = await fetch(
          `${request.nextUrl.origin}/api/history?symbol=${symbol}&range=1y`
        )
        if (!response.ok) {
          throw new Error(`Failed to fetch data for ${symbol}`)
        }
        const data = await response.json()
        return data.data
      }
    })()
    const engine = new PortfolioBacktestEngine(dataSource, costModel)

    const config: BacktestConfig = {
      name: `montecarlo_${id}`,
      symbols,
      initialCapital: plan.initialCapital,
      allocation: new Map(Object.entries(allocation)),
      strategies,
      rebalance: plan.rebalance as 'daily' | 'weekly' | 'monthly' | 'none',
      rebalanceThreshold: plan.rebalanceThreshold ?? 0.05,
    }

    const result = await engine.run(config)

    const simulator = new MonteCarloSimulator()
    const mcConfig: MonteCarloConfig = {
      simulations,
      confidenceLevels: [0.05, 0.25, 0.5, 0.75, 0.95],
    }

    const trades = result.trades.map(t => ({ type: t.type, value: t.value }))
    const mcResult = simulator.simulate(result.equityCurve, trades, mcConfig)

    return NextResponse.json({
      planId: id,
      percentiles: mcResult.percentiles,
      probabilityOfProfit: mcResult.probabilityOfProfit,
      averageReturn: mcResult.averageReturn,
      medianReturn: mcResult.medianReturn,
      stdDeviation: mcResult.stdDeviation,
      var: mcResult.var,
      cvar: mcResult.cvar,
      averageMaxDrawdown: mcResult.averageMaxDrawdown,
      simulations,
    })
  } catch (error) {
    console.error('Monte Carlo simulation error:', error)
    return NextResponse.json(
      { error: '蒙特卡洛模拟失败' },
      { status: 500 }
    )
  }
}
