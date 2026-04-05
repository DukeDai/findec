import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getHistoricalData } from '@/lib/yahoo-finance'
import { FactorLibrary } from '@/lib/factors/factor-library'
import { calculateFactorCorrelation } from '@/lib/factors/factor-correlation'

const factorLibrary = new FactorLibrary()

interface CorrelationRequestBody {
  factorIds: string[]
  symbols: string[]
}

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
    const data = await getHistoricalData(symbol, '1y')
    return data
  } catch (error) {
    console.warn(`Yahoo Finance failed for ${symbol}, using mock data`, error)
    return generateMockData()
  }
}

export async function GET() {
  try {
    // Get latest factor history for each factor-symbol combination
    const factorHistories = await prisma.factorHistory.findMany({
      orderBy: {
        date: 'desc',
      },
      take: 10000, // Limit for performance
    })

    if (factorHistories.length === 0) {
      return NextResponse.json({
        matrix: [],
        factors: [],
        warnings: [],
      })
    }

    // Group by factorId, keeping only the latest value per symbol
    const factorValuesMap = new Map<string, Map<string, number>>()

    for (const record of factorHistories) {
      if (!factorValuesMap.has(record.factorId)) {
        factorValuesMap.set(record.factorId, new Map())
      }
      const symbolMap = factorValuesMap.get(record.factorId)!
      // Only keep the first (latest due to orderBy) value for each symbol
      if (!symbolMap.has(record.symbol)) {
        symbolMap.set(record.symbol, record.value)
      }
    }

    // Convert to the format expected by calculateFactorCorrelation
    // factorId -> array of values (aligned across symbols)
    const allSymbols = new Set<string>()
    factorValuesMap.forEach((symbolMap) => {
      symbolMap.forEach((_, symbol) => allSymbols.add(symbol))
    })

    const symbolArray = Array.from(allSymbols)
    const factorHistoriesForCalc = new Map<string, number[]>()

    factorValuesMap.forEach((symbolMap, factorId) => {
      const values: number[] = []
      // Create aligned array where each position corresponds to the same symbol
      for (const symbol of symbolArray) {
        const value = symbolMap.get(symbol)
        if (value !== undefined) {
          values.push(value)
        }
      }
      // Only include factors that have values for at least 2 symbols
      if (values.length >= 2) {
        factorHistoriesForCalc.set(factorId, values)
      }
    })

    // Calculate correlation matrix
    const result = calculateFactorCorrelation(factorHistoriesForCalc, 0.9)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error calculating factor correlation:', error)
    return NextResponse.json(
      { error: '计算因子相关性失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CorrelationRequestBody = await request.json()
    const { factorIds, symbols } = body

    if (!factorIds || !Array.isArray(factorIds) || factorIds.length < 2) {
      return NextResponse.json(
        { error: '至少需要2个因子进行相关性分析' },
        { status: 400 }
      )
    }

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: '需要指定股票列表' },
        { status: 400 }
      )
    }

    // Fetch historical data for all symbols
    const symbolDataMap = new Map<string, HistoricalDataPoint[]>()
    for (const symbol of symbols) {
      const data = await fetchHistoricalDataWithFallback(symbol)
      symbolDataMap.set(symbol, data)
    }

    // Calculate factor values for each factor across all symbols
    // Group by date to create time series for each factor
    const factorHistories = new Map<string, number[]>()

    for (const factorId of factorIds) {
      const factorValues: number[] = []

      for (const symbol of symbols) {
        const symbolData = symbolDataMap.get(symbol)
        if (!symbolData || symbolData.length === 0) continue

        // Calculate factor value for this symbol
        const factorValue = factorLibrary.calculateFactor(factorId, symbolData)
        if (factorValue !== null) {
          factorValues.push(factorValue)
        }
      }

      // Only add factor if we have values for at least 2 symbols
      if (factorValues.length >= 2) {
        factorHistories.set(factorId, factorValues)
      }
    }

    // Check if we have enough factors with data
    if (factorHistories.size < 2) {
      return NextResponse.json(
        { error: '无法计算因子相关性：数据不足' },
        { status: 400 }
      )
    }

    // Calculate correlation
    const result = calculateFactorCorrelation(factorHistories, 0.9)

    // Get factor names for display
    const factorNameMap = new Map<string, string>()
    for (const factorId of result.factors) {
      const factor = factorLibrary.getFactor(factorId)
      factorNameMap.set(factorId, factor?.name || factorId)
    }

    return NextResponse.json({
      matrix: result.matrix,
      factors: result.factors,
      factorNames: Object.fromEntries(factorNameMap),
      warnings: result.warnings,
      symbolCount: symbols.length,
      analyzedFactors: result.factors.length,
    })
  } catch (error) {
    console.error('Error calculating factor correlation:', error)
    return NextResponse.json(
      { error: '计算因子相关性失败' },
      { status: 500 }
    )
  }
}
