import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface StrategyConfig {
  id: string
  type: string
  parameters?: Record<string, number>
}

interface CreateBacktestRequest {
  name: string
  symbols: string[]
  initialCapital: number
  allocation?: Record<string, number>
  strategies: StrategyConfig[]
  rebalance?: 'daily' | 'weekly' | 'monthly' | 'none'
  rebalanceThreshold?: number
  startDate: string
  endDate: string
}

interface PortfolioBacktestPlanResponse {
  id: string
  name: string
  symbols: string
  allocation: string | null
  strategies: string
  rebalance: string
  rebalanceThreshold: number | null
  initialCapital: number
  startDate: Date
  endDate: Date
  status: string
  portfolioReturn: number | null
  portfolioSharpe: number | null
  portfolioSortino: number | null
  portfolioCalmar: number | null
  portfolioMaxDrawdown: number | null
  portfolioVolatility: number | null
  portfolioVaR95: number | null
  createdAt: Date
  updatedAt: Date
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateBacktestRequest = await request.json()
    const {
      name,
      symbols,
      initialCapital,
      allocation,
      strategies,
      rebalance = 'monthly',
      rebalanceThreshold = 0.05,
      startDate,
      endDate,
    } = body

    if (!name || !symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: '回测名称和股票代码列表不能为空', code: 'PARAMS_REQUIRED' },
        { status: 400 }
      )
    }

    if (!initialCapital || initialCapital <= 0) {
      return NextResponse.json(
        { error: '初始资金必须大于0', code: 'INVALID_INITIAL_CASH' },
        { status: 400 }
      )
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '开始日期和结束日期不能为空', code: 'DATES_REQUIRED' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      return NextResponse.json(
        { error: '结束日期必须晚于开始日期', code: 'INVALID_DATE_RANGE' },
        { status: 400 }
      )
    }

    if (!strategies || strategies.length === 0) {
      return NextResponse.json(
        { error: '策略配置不能为空', code: 'STRATEGY_REQUIRED' },
        { status: 400 }
      )
    }

    let allocationData: Record<string, number> = allocation || {}
    if (!allocation || Object.keys(allocation).length === 0) {
      const equalWeight = 1 / symbols.length
      allocationData = symbols.reduce((acc, symbol) => {
        acc[symbol] = equalWeight
        return acc
      }, {} as Record<string, number>)
    }

    const totalAllocation = Object.values(allocationData).reduce((sum, w) => sum + w, 0)
    if (Math.abs(totalAllocation - 1) > 0.01) {
      return NextResponse.json(
        { error: '资产配置权重之和必须等于1', code: 'INVALID_WEIGHTS' },
        { status: 400 }
      )
    }

    const backtest = await prisma.portfolioBacktestPlan.create({
      data: {
        name,
        symbols: JSON.stringify(symbols),
        allocation: JSON.stringify(allocationData),
        strategies: JSON.stringify(strategies),
        rebalance,
        rebalanceThreshold,
        initialCapital,
        startDate: start,
        endDate: end,
        status: 'pending',
      },
    })

    return NextResponse.json({
      planId: backtest.id,
      name: backtest.name,
      status: backtest.status,
      createdAt: backtest.createdAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating portfolio backtest:', error)
    return NextResponse.json(
      { error: '创建回测计划失败', code: 'CREATE_BACKTEST_FAILED' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const plans = await prisma.portfolioBacktestPlan.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    const response = plans.map((plan: PortfolioBacktestPlanResponse) => ({
      id: plan.id,
      name: plan.name,
      symbols: JSON.parse(plan.symbols),
      allocation: plan.allocation ? JSON.parse(plan.allocation) : null,
      strategies: JSON.parse(plan.strategies),
      rebalance: plan.rebalance,
      rebalanceThreshold: plan.rebalanceThreshold,
      initialCapital: plan.initialCapital,
      startDate: plan.startDate.toISOString().split('T')[0],
      endDate: plan.endDate.toISOString().split('T')[0],
      status: plan.status,
      metrics: {
        portfolioReturn: plan.portfolioReturn,
        portfolioSharpe: plan.portfolioSharpe,
        portfolioSortino: plan.portfolioSortino,
        portfolioCalmar: plan.portfolioCalmar,
        portfolioMaxDrawdown: plan.portfolioMaxDrawdown,
        portfolioVolatility: plan.portfolioVolatility,
        portfolioVaR95: plan.portfolioVaR95,
      },
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    }))

    return NextResponse.json({ plans: response })
  } catch (error) {
    console.error('Error fetching portfolio backtests:', error)
    return NextResponse.json(
      { error: '获取回测计划列表失败', code: 'FETCH_BACKTESTS_FAILED' },
      { status: 500 }
    )
  }
}
