import { NextRequest, NextResponse } from 'next/server'
import { performPCA } from '@/lib/factors/factor-pca'
import { FactorLibrary } from '@/lib/factors/factor-library'
import { getHistoricalData } from '@/lib/yahoo-finance'

const factorLibrary = new FactorLibrary()

interface HistoricalDataPoint {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

function generateMockData(): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = []
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

async function fetchHistoricalDataWithFallback(symbol: string): Promise<HistoricalDataPoint[]> {
  try {
    return await getHistoricalData(symbol, '1y')
  } catch {
    return generateMockData()
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { factorIds, symbols } = body

    if (!factorIds || !Array.isArray(factorIds) || factorIds.length < 2) {
      return NextResponse.json(
        { error: '至少需要 2 个因子进行 PCA 分析' },
        { status: 400 }
      )
    }

    if (!symbols || !Array.isArray(symbols) || symbols.length < 3) {
      return NextResponse.json(
        { error: '至少需要 3 只股票进行 PCA 分析' },
        { status: 400 }
      )
    }

    const symbolDataMap = new Map<string, HistoricalDataPoint[]>()
    await Promise.all(
      symbols.map(async (symbol: string) => {
        const data = await fetchHistoricalDataWithFallback(symbol)
        symbolDataMap.set(symbol, data)
      })
    )

    const factorHistories = new Map<string, number[]>()

    for (const factorId of factorIds) {
      const factorValues: number[] = []
      for (const symbol of symbols) {
        const symbolData = symbolDataMap.get(symbol)
        if (!symbolData || symbolData.length === 0) continue
        const factorValue = factorLibrary.calculateFactor(factorId, symbolData)
        if (factorValue !== null) {
          factorValues.push(factorValue)
        }
      }
      if (factorValues.length >= 3) {
        factorHistories.set(factorId, factorValues)
      }
    }

    if (factorHistories.size < 2) {
      return NextResponse.json(
        { error: '无法进行 PCA 分析：数据不足' },
        { status: 400 }
      )
    }

    const result = performPCA({ factorHistories })

    const factorNameMap: Record<string, string> = {}
    for (const fid of result.factorNames) {
      const def = factorLibrary.getFactor(fid)
      factorNameMap[fid] = def?.name || def?.id || fid
    }

    const enrichedGroupings = result.factorGroupings.map(g => ({
      ...g,
      factors: g.factors.map(f => ({ ...f, name: factorNameMap[f.id] || f.id })),
    }))

    return NextResponse.json({
      components: result.components,
      explainedVariance: result.explainedVariance,
      cumulativeVariance: result.cumulativeVariance,
      loadings: result.loadings,
      factorNames: result.factorNames,
      factorNameMap,
      factorGroupings: enrichedGroupings,
      recommendations: result.recommendations,
      symbolCount: symbols.length,
      analyzedFactors: result.components,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PCA 分析失败' },
      { status: 500 }
    )
  }
}
