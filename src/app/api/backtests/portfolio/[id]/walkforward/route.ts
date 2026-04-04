import { NextRequest, NextResponse } from 'next/server'
import { WalkForwardAnalyzer, WalkForwardConfig } from '@/lib/backtest/walk-forward'
import { PortfolioBacktestEngine, BacktestConfig } from '@/lib/backtest/engine'
import { CostModel } from '@/lib/backtest/cost-model'
import { DataSource } from '@/lib/backtest/engine'
import { prisma } from '@/lib/prisma'

interface WalkForwardRequest {
  trainPeriod: number
  testPeriod: number
  stepDays: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: WalkForwardRequest = await request.json()
    const { trainPeriod, testPeriod, stepDays } = body

    if (!trainPeriod || !testPeriod || !stepDays) {
      return NextResponse.json(
        { error: '请提供训练期、测试期和步长参数' },
        { status: 400 }
      )
    }

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
      slippage: { model: 'fixed', fixedPercent: 0.001 },
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
    const analyzer = new WalkForwardAnalyzer(engine)

    const baseConfig: BacktestConfig = {
      name: `walkforward_${id}`,
      symbols,
      initialCapital: plan.initialCapital,
      allocation: new Map(Object.entries(allocation)),
      strategies,
      rebalance: plan.rebalance as 'daily' | 'weekly' | 'monthly' | 'none',
      rebalanceThreshold: plan.rebalanceThreshold ?? 0.05,
    }

    const wfConfig: WalkForwardConfig = {
      trainPeriod,
      testPeriod,
      stepDays,
    }

    const result = await analyzer.analyze(baseConfig, wfConfig)

    return NextResponse.json({
      planId: id,
      trainMetrics: result.trainMetrics,
      testMetrics: result.testMetrics,
      degradation: result.degradation,
      windowsCount: result.trainResults.length,
    })
  } catch (error) {
    console.error('Walk-forward analysis error:', error)
    return NextResponse.json(
      { error: '向前验证分析失败' },
      { status: 500 }
    )
  }
}
