import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { defaultDataSource } from '@/lib/data/data-source'
import { createHash } from 'crypto'
import { handleApiError, Errors } from '@/lib/errors'

const VALID_RANGES = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'] as const

type ValidRange = (typeof VALID_RANGES)[number]

interface LocalDataCacheItem {
  id: string
  symbol: string
  range: string
  fetchedAt: Date
  dataHash: string
}

interface DownloadRequest {
  symbols: string[]
  range: string
}

interface DownloadFailure {
  symbol: string
  reason: string
}

interface CacheInfo {
  symbol: string
  fetchedAt: string
  dataPoints: number
}

interface DownloadResponse {
  success: boolean
  downloaded: string[]
  failed: DownloadFailure[]
  cacheInfo: CacheInfo[]
}

function isValidRange(range: string): range is ValidRange {
  return VALID_RANGES.includes(range as ValidRange)
}

function normalizeSymbols(symbols: string[]): string[] {
  return symbols
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0)
}

function calculateDataHash(data: unknown[]): string {
  const dataString = JSON.stringify(data)
  return createHash('sha256').update(dataString).digest('hex').slice(0, 16)
}

export async function GET(): Promise<NextResponse> {
  try {
    const cache = await prisma.localDataCache.findMany({
      orderBy: {
        fetchedAt: 'desc',
      },
    })

    const grouped = cache.reduce<Record<string, LocalDataCacheItem[]>>((acc, item) => {
      const typedItem = item as LocalDataCacheItem
      if (!acc[typedItem.symbol]) {
        acc[typedItem.symbol] = []
      }
      acc[typedItem.symbol].push(typedItem)
      return acc
    }, {})

    const status = Object.entries(grouped).map(([symbol, items]) => ({
      symbol,
      ranges: items.map((item) => ({
        range: item.range,
        fetchedAt: item.fetchedAt.toISOString(),
      })),
    }))

    return NextResponse.json({ status })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: DownloadRequest = await request.json()
    const { symbols: rawSymbols, range } = body

    if (!isValidRange(range)) {
      throw Errors.badRequest(`无效的时间范围: ${range}. 有效范围: ${VALID_RANGES.join(', ')}`)
    }

    const symbols = normalizeSymbols(rawSymbols)
    if (symbols.length === 0) {
      throw Errors.badRequest('请提供至少一个股票代码')
    }

    const downloaded: string[] = []
    const failed: DownloadFailure[] = []
    const cacheInfo: CacheInfo[] = []

    for (const symbol of symbols) {
      try {
        const historicalData = await defaultDataSource.getHistoricalData(symbol, range)

        if (!historicalData || historicalData.length === 0) {
          failed.push({
            symbol,
            reason: '无法获取历史数据（可能代码无效或数据不可用）',
          })
          continue
        }

        const dataHash = calculateDataHash(historicalData)

        await prisma.localDataCache.upsert({
          where: {
            symbol_range: {
              symbol,
              range,
            },
          },
          update: {
            fetchedAt: new Date(),
            dataHash,
          },
          create: {
            symbol,
            range,
            dataHash,
          },
        })

        downloaded.push(symbol)
        cacheInfo.push({
          symbol,
          fetchedAt: new Date().toISOString(),
          dataPoints: historicalData.length,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        failed.push({
          symbol,
          reason: `下载失败: ${errorMessage}`,
        })
      }
    }

    const response: DownloadResponse = {
      success: failed.length === 0,
      downloaded,
      failed,
      cacheInfo,
    }

    return NextResponse.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
