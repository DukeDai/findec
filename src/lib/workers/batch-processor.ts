import { FactorMetricsCalculator } from '@/lib/factors/factor-metrics'
import { RiskMetricsCalculator } from '@/lib/backtest/risk-metrics'

export interface BatchTask {
  id: string
  type: 'factor_ic' | 'factor_performance' | 'risk_metrics'
  payload: unknown
}

export interface BatchResult {
  id: string
  result?: unknown
  error?: string
}

const factorCalculator = new FactorMetricsCalculator()
const riskCalculator = new RiskMetricsCalculator()

export async function processBatchTask(task: BatchTask): Promise<BatchResult> {
  try {
    let result: unknown

    switch (task.type) {
      case 'factor_ic': {
        const { values, returns } = task.payload as { values: number[]; returns: number[] }
        result = {
          pearson: factorCalculator.calculateIC(values, returns),
          spearman: factorCalculator.calculateRankIC(values, returns),
        }
        break
      }

      case 'factor_performance': {
        const { factorId, history } = task.payload as {
          factorId: string
          history: Array<{ date: string; value: number; forwardReturn: number }>
        }
        result = factorCalculator.calculatePerformance(
          factorId,
          history.map(h => ({ ...h, date: new Date(h.date) }))
        )
        break
      }

      case 'risk_metrics': {
        const { equityCurve } = task.payload as {
          equityCurve: Array<{ date: string; value: number }>
        }
        result = riskCalculator.calculate(
          equityCurve.map(p => ({ ...p, date: new Date(p.date) }))
        )
        break
      }

      default:
        throw new Error(`Unknown message type: ${task.type}`)
    }

    return { id: task.id, result }
  } catch (error) {
    return {
      id: task.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function processBatch<T extends BatchTask>(
  tasks: T[],
  concurrency: number = 4
): Promise<BatchResult[]> {
  const results: BatchResult[] = []
  const executing: Promise<void>[] = []

  for (const task of tasks) {
    const promise = processBatchTask(task).then(result => {
      results.push(result)
    })

    executing.push(promise)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
    }
  }

  await Promise.all(executing)
  return results.sort((a, b) => a.id.localeCompare(b.id))
}

export class BatchProcessor {
  private queue: BatchTask[] = []
  private processing: boolean = false
  private concurrency: number

  constructor(concurrency: number = 4) {
    this.concurrency = concurrency
  }

  addTask(task: BatchTask): void {
    this.queue.push(task)
    if (!this.processing) {
      this.process()
    }
  }

  async process(): Promise<void> {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency)
      await Promise.all(batch.map(task => processBatchTask(task)))
    }

    this.processing = false
  }
}
