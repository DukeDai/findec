import { Worker } from 'worker_threads'
import path from 'path'
import type { HistoricalPrice } from '@/lib/indicators'

export interface BatchBacktestConfig {
  symbols: string[]
  strategy: string
  parameters: Record<string, number>
  initialCapital: number
  startDate: string
  endDate: string
  concurrency?: number
}

export interface SymbolBacktestResult {
  symbol: string
  result: BacktestResult | null
  error: string | null
  dataFetchMs: number
  computeMs: number
}

export interface AggregatedSummary {
  totalReturn: number
  avgSharpe: number
  avgMaxDrawdown: number
  totalTrades: number
  avgWinRate: number
  symbolsCompleted: number
  symbolsFailed: number
}

export interface BatchBacktestResult {
  results: SymbolBacktestResult[]
  summary: AggregatedSummary
  failedSymbols: string[]
  totalMs: number
  parallel: boolean
}

interface BacktestResult {
  trades: unknown[]
  totalReturn: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  finalCapital: number
  equityCurve: Array<{ date: Date; value: number }>
}

interface WorkerResult {
  symbol: string
  result: BacktestResult | null
  error: string | null
}

interface WorkerData {
  symbol: string
  prices: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>
  config: {
    initialCapital: number
    strategy: string
    parameters: Record<string, number>
  }
}

const DEFAULT_CONCURRENCY = 4

async function fetchHistory(
  symbols: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, { prices: HistoricalPrice[]; fetchMs: number }>> {
  const results = await Promise.all(
    symbols.map(async symbol => {
      const start = Date.now()
      try {
        const res = await fetch(
          `http://localhost:3000/api/history?symbol=${encodeURIComponent(symbol)}&start=${startDate}&end=${endDate}`
        )
        const fetchMs = Date.now() - start
        if (!res.ok) return { symbol, prices: [], fetchMs }
        const json = await res.json()
        const prices: HistoricalPrice[] = (json.data ?? []).map((d: { date: string; open: number; high: number; low: number; close: number; volume: number }) => ({
          date: new Date(d.date),
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume,
        }))
        return { symbol, prices, fetchMs }
      } catch {
        return { symbol, prices: [], fetchMs: Date.now() - start }
      }
    })
  )

  const map = new Map<string, { prices: HistoricalPrice[]; fetchMs: number }>()
  for (const r of results) {
    if (r.prices.length > 0) {
      map.set(r.symbol, { prices: r.prices, fetchMs: r.fetchMs })
    }
  }
  return map
}

function runWorkersPool(
  data: Map<string, { prices: HistoricalPrice[]; fetchMs: number }>,
  config: BatchBacktestConfig,
  concurrency: number
): Promise<SymbolBacktestResult[]> {
  return new Promise((resolve) => {
    const entries = Array.from(data.entries())
    const results: SymbolBacktestResult[] = new Array(entries.length)
    let completed = 0
    let index = 0

    const launchWorker = () => {
      if (index >= entries.length) return

      const currentIndex = index++
      const [symbol, { prices, fetchMs }] = entries[currentIndex]

      let worker: Worker | null = null
      let settled = false

      const finish = (result: SymbolBacktestResult) => {
        if (settled) return
        settled = true
        results[currentIndex] = result
        completed++
        if (worker) {
          worker.terminate().catch(() => {})
        }
        if (completed < entries.length) {
          launchWorker()
        } else {
          resolve(results)
        }
      }

      try {
        const workerPath = path.join(process.cwd(), 'src/lib/backtest', 'batch-worker.ts')
        worker = new Worker(workerPath)

        worker.on('message', (msg: WorkerResult) => {
          const computeMs = Date.now()
          finish({
            symbol,
            result: msg.result,
            error: msg.error,
            dataFetchMs: fetchMs,
            computeMs: Date.now() - fetchMs,
          })
        })

        worker.on('error', () => {
          finish({
            symbol,
            result: null,
            error: 'Worker thread error',
            dataFetchMs: fetchMs,
            computeMs: 0,
          })
        })

        worker.on('exit', code => {
          if (code !== 0 && !settled) {
            finish({
              symbol,
              result: null,
              error: `Worker exited with code ${code}`,
              dataFetchMs: fetchMs,
              computeMs: 0,
            })
          }
        })

        const pricesForWorker = prices.map(p => ({
          date: p.date instanceof Date ? p.date.toISOString() : String(p.date),
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume,
        }))

        const workerData: WorkerData = {
          symbol,
          prices: pricesForWorker,
          config: {
            initialCapital: config.initialCapital / data.size,
            strategy: config.strategy,
            parameters: config.parameters,
          },
        }

        worker.postMessage(workerData)
      } catch {
        finish({
          symbol,
          result: null,
          error: 'Failed to spawn worker thread',
          dataFetchMs: fetchMs,
          computeMs: 0,
        })
      }
    }

    for (let i = 0; i < Math.min(concurrency, entries.length); i++) {
      launchWorker()
    }
  })
}

function aggregateSummary(results: SymbolBacktestResult[]): AggregatedSummary {
  const successful = results.filter(r => r.result !== null)
  const failed = results.filter(r => r.result === null)

  if (successful.length === 0) {
    return {
      totalReturn: 0,
      avgSharpe: 0,
      avgMaxDrawdown: 0,
      totalTrades: 0,
      avgWinRate: 0,
      symbolsCompleted: 0,
      symbolsFailed: failed.length,
    }
  }

  const totalReturn = successful.reduce((sum, r) => sum + (r.result?.totalReturn ?? 0), 0) / successful.length
  const avgSharpe = successful.reduce((sum, r) => sum + (r.result?.sharpeRatio ?? 0), 0) / successful.length
  const avgMaxDrawdown = successful.reduce((sum, r) => sum + (r.result?.maxDrawdown ?? 0), 0) / successful.length
  const totalTrades = successful.reduce((sum, r) => sum + (r.result?.totalTrades ?? 0), 0)
  const avgWinRate = successful.reduce((sum, r) => sum + (r.result?.winRate ?? 0), 0) / successful.length

  return {
    totalReturn,
    avgSharpe,
    avgMaxDrawdown,
    totalTrades,
    avgWinRate,
    symbolsCompleted: successful.length,
    symbolsFailed: failed.length,
  }
}

export async function batchBacktest(config: BatchBacktestConfig): Promise<BatchBacktestResult> {
  const startTime = Date.now()
  const concurrency = config.concurrency ?? DEFAULT_CONCURRENCY

  const dataMap = await fetchHistory(config.symbols, config.startDate, config.endDate)
  const successfulSymbols = Array.from(dataMap.keys())
  const failedSymbols = config.symbols.filter(s => !dataMap.has(s))

  if (successfulSymbols.length === 0) {
    const summary = aggregateSummary([])
    return {
      results: [],
      summary,
      failedSymbols: config.symbols,
      totalMs: Date.now() - startTime,
      parallel: false,
    }
  }

  let results: SymbolBacktestResult[]
  let parallel = true

  try {
    results = await runWorkersPool(dataMap, config, concurrency)
  } catch {
    parallel = false
    results = []
    for (const [symbol, { prices, fetchMs }] of dataMap) {
      results.push({
        symbol,
        result: null,
        error: 'Worker pool execution failed',
        dataFetchMs: fetchMs,
        computeMs: 0,
      })
    }
  }

  const allResults = [
    ...results,
    ...failedSymbols.map(symbol => ({
      symbol,
      result: null as BacktestResult | null,
      error: 'Failed to fetch historical data',
      dataFetchMs: 0,
      computeMs: 0,
    })),
  ]

  return {
    results: allResults,
    summary: aggregateSummary(allResults),
    failedSymbols,
    totalMs: Date.now() - startTime,
    parallel,
  }
}
