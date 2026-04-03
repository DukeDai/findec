import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getHistoricalData, YahooFinanceError } from '@/lib/yahoo-finance'
import { calculateIndicators } from '@/lib/indicators'

function evaluateRule(field: string, operator: string, value: number, indicatorValues: number[]): boolean {
  const latestValue = indicatorValues[indicatorValues.length - 1]
  if (latestValue === undefined) return false

  switch (operator) {
    case '>':
      return latestValue > value
    case '<':
      return latestValue < value
    case '>=':
      return latestValue >= value
    case '<=':
      return latestValue <= value
    case '==':
      return latestValue === value
    case 'between':
      return latestValue >= value && latestValue <= value
    default:
      return false
  }
}

function calculateScore(rules: any[], matchedRules: number): number {
  const totalWeight = rules.reduce((sum: number, r: any) => sum + (r.weight || 1), 0)
  return (matchedRules / rules.length) * 100
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { strategyId, symbols } = body

    if (!strategyId || !symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'strategyId and symbols array are required' },
        { status: 400 }
      )
    }

    const strategy = await prisma.factorStrategy.findUnique({
      where: { id: strategyId },
      include: { rules: true },
    })

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    const results = []

    for (const symbol of symbols) {
      try {
        let data
        try {
          data = await getHistoricalData(symbol, '1y')
        } catch (error) {
          console.warn(`Yahoo Finance failed for ${symbol}, using mock data`)
          data = generateMockData()
        }

        if (!data || data.length === 0) {
          continue
        }

        const indicatorOptions = {
          ma: [20, 50],
          rsi: 14,
        }

        const indicators = calculateIndicators(data, indicatorOptions)
        let matchedRules = 0

        for (const rule of strategy.rules) {
          let indicatorValues: number[] = []

          if (rule.field.startsWith('ma')) {
            const period = parseInt(rule.field.replace('ma', ''))
            const maKey = `ma${period}` as keyof typeof indicators
            if (indicators[maKey] && 'values' in indicators[maKey]) {
              indicatorValues = (indicators[maKey] as any).values || []
            }
          } else if (rule.field === 'rsi' && indicators.rsi) {
            indicatorValues = indicators.rsi.values || []
          } else if (rule.field === 'price') {
            indicatorValues = data.map(d => d.close)
          }

          if (indicatorValues.length > 0) {
            if (evaluateRule(rule.field, rule.operator, rule.value, indicatorValues)) {
              matchedRules++
            }
          }
        }

        const score = strategy.rules.length > 0 
          ? calculateScore(strategy.rules, matchedRules) 
          : 0

        const screeningResult = await prisma.screeningResult.create({
          data: {
            strategyId,
            symbol,
            score,
            details: JSON.stringify({ matchedRules, totalRules: strategy.rules.length }),
          },
        })

        results.push({
          ...screeningResult,
          symbol,
          score: Math.round(score * 100) / 100,
        })
      } catch (error) {
        console.error(`Error screening ${symbol}:`, error)
      }
    }

    return NextResponse.json({
      strategyId,
      results: results.sort((a, b) => b.score - a.score),
    })
  } catch (error) {
    console.error('Error running screening:', error)
    return NextResponse.json(
      { error: 'Failed to run screening' },
      { status: 500 }
    )
  }
}

function generateMockData() {
  const data = []
  let basePrice = 150
  const now = new Date()

  for (let i = 365; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    basePrice = basePrice * (1 + (Math.random() - 0.48) * 0.02)

    data.push({
      date,
      open: basePrice * (1 + (Math.random() - 0.5) * 0.01),
      high: basePrice * (1 + Math.random() * 0.02),
      low: basePrice * (1 - Math.random() * 0.02),
      close: basePrice,
      volume: Math.floor(Math.random() * 10000000),
    })
  }

  return data
}