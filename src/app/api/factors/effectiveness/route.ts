import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { FactorMetricsCalculator } from '@/lib/factors/factor-metrics'
import { FactorLibrary } from '@/lib/factors/factor-library'

const factorLibrary = new FactorLibrary()
const metricsCalculator = new FactorMetricsCalculator()

interface FactorEffectivenessData {
  factorId: string
  name: string
  ic: {
    current: number
    history: { date: string; ic: number }[]
    mean: number
    std: number
  }
  icIr: number
  groupReturns: { group: number; return: number }[]
  decayTest: { ic_1d: number; ic_5d: number; ic_20d: number }
}

function calculateGroupReturns(
  factorValues: number[],
  forwardReturns: number[],
  numGroups: number = 10
): { group: number; return: number }[] {
  if (factorValues.length !== forwardReturns.length || factorValues.length < numGroups) {
    return []
  }

  const combined = factorValues
    .map((value, i) => ({ value, return: forwardReturns[i] }))
    .filter(item => !isNaN(item.value) && !isNaN(item.return))

  combined.sort((a, b) => a.value - b.value)

  const groupSize = Math.floor(combined.length / numGroups)
  const groups: { group: number; return: number }[] = []

  for (let i = 0; i < numGroups; i++) {
    const start = i * groupSize
    const end = i === numGroups - 1 ? combined.length : (i + 1) * groupSize
    const groupItems = combined.slice(start, end)

    const avgReturn = groupItems.length > 0
      ? groupItems.reduce((sum, item) => sum + item.return, 0) / groupItems.length
      : 0

    groups.push({
      group: i + 1,
      return: avgReturn,
    })
  }

  return groups
}

function calculateICWithLag(
  factorValues: number[],
  forwardReturns: number[],
  lag: number
): number {
  if (factorValues.length < lag + 2) return 0

  const laggedReturns = forwardReturns.slice(lag)
  const laggedValues = factorValues.slice(0, factorValues.length - lag)

  if (laggedValues.length < 5) return 0

  return metricsCalculator.calculateIC(laggedValues, laggedReturns)
}

async function calculateFactorEffectiveness(
  factor: { id: string; name: string }
): Promise<FactorEffectivenessData | null> {
  const history = await prisma.factorHistory.findMany({
    where: { factorId: factor.id },
    orderBy: { date: 'asc' },
    take: 252,
  })

  if (history.length < 20) {
    return null
  }

  const values = history.map(h => h.value)
  const returns = history.map((h, i) => {
    if (i === 0) return 0
    const prevValue = history[i - 1].value
    return prevValue !== 0 ? (h.value - prevValue) / Math.abs(prevValue) * 100 : 0
  }).slice(1)
  const shiftedValues = values.slice(0, values.length - 1)

  const currentIC = metricsCalculator.calculateIC(shiftedValues, returns)

  const windowSize = 20
  const icHistory: { date: string; ic: number }[] = []

  for (let i = windowSize; i < history.length; i++) {
    const windowValues = values.slice(i - windowSize, i)
    const windowReturns = returns.slice(i - windowSize, i)
    const windowIC = metricsCalculator.calculateIC(windowValues, windowReturns)
    if (!isNaN(windowIC)) {
      icHistory.push({
        date: history[i].date.toISOString().split('T')[0],
        ic: windowIC,
      })
    }
  }

  const icValues = icHistory.map(h => h.ic)
  const icMean = icValues.length > 0
    ? icValues.reduce((a, b) => a + b, 0) / icValues.length
    : 0
  const icStd = icValues.length > 1
    ? Math.sqrt(icValues.reduce((sum, val) => sum + Math.pow(val - icMean, 2), 0) / (icValues.length - 1))
    : 0

  const icIr = icStd > 0 ? icMean / icStd : 0

  const groupReturns = calculateGroupReturns(shiftedValues, returns)

  const decay1d = calculateICWithLag(shiftedValues, returns, 1)
  const decay5d = calculateICWithLag(shiftedValues, returns, 5)
  const decay20d = calculateICWithLag(shiftedValues, returns, 20)

  return {
    factorId: factor.id,
    name: factor.name,
    ic: {
      current: currentIC,
      history: icHistory,
      mean: icMean,
      std: icStd,
    },
    icIr,
    groupReturns,
    decayTest: {
      ic_1d: decay1d,
      ic_5d: decay5d,
      ic_20d: decay20d,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const factorId = searchParams.get('factorId')

    const allFactors = factorLibrary.getAllFactors()
    const effectivenessData: FactorEffectivenessData[] = []

    for (const factor of allFactors) {
      if (factorId && factor.id !== factorId) {
        continue
      }

      const data = await calculateFactorEffectiveness(factor)
      if (data) {
        effectivenessData.push(data)
      }
    }

    if (factorId && effectivenessData.length === 0) {
      return NextResponse.json(
        { error: 'Factor not found or insufficient data' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      factors: effectivenessData,
    })
  } catch (error) {
    console.error('Error fetching factor effectiveness:', error)
    return NextResponse.json(
      { error: 'Failed to fetch factor effectiveness data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { factorIds } = body

    if (!factorIds || !Array.isArray(factorIds) || factorIds.length === 0) {
      return NextResponse.json(
        { error: 'factorIds array is required' },
        { status: 400 }
      )
    }

    const allFactors = factorLibrary.getAllFactors()
    const effectivenessData: FactorEffectivenessData[] = []

    for (const factorId of factorIds) {
      const factor = allFactors.find(f => f.id === factorId)
      if (!factor) {
        continue
      }

      const data = await calculateFactorEffectiveness(factor)
      if (data) {
        effectivenessData.push(data)
      }
    }

    return NextResponse.json({
      factors: effectivenessData,
    })
  } catch (error) {
    console.error('Error analyzing factor effectiveness:', error)
    return NextResponse.json(
      { error: 'Failed to analyze factor effectiveness' },
      { status: 500 }
    )
  }
}
