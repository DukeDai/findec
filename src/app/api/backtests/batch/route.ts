import { NextRequest, NextResponse } from 'next/server'
import { batchBacktest } from '@/lib/backtest/batch-runner'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      symbols,
      strategy = 'ma_crossover',
      parameters = {},
      initialCapital = 100000,
      startDate,
      endDate,
      concurrency,
    } = body

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: '股票代码列表不能为空' }, { status: 400 })
    }

    if (symbols.length > 100) {
      return NextResponse.json({ error: '单次批量回测最多支持 100 个股票' }, { status: 400 })
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '开始日期和结束日期不能为空' }, { status: 400 })
    }

    const result = await batchBacktest({
      symbols,
      strategy,
      parameters,
      initialCapital,
      startDate,
      endDate,
      concurrency,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '批量回测失败' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    description: '批量回测并行 API',
    method: 'POST',
    body: {
      symbols: 'string[] — 股票代码列表',
      strategy: "string — 策略类型 (ma_crossover / rsi / macd / bollinger / momentum / mean_reversion / trend_follow)",
      parameters: 'object — 策略参数',
      initialCapital: 'number — 初始资金（默认 100000）',
      startDate: 'string — 开始日期 YYYY-MM-DD',
      endDate: 'string — 结束日期 YYYY-MM-DD',
      concurrency: 'number — 并行 worker 数（默认 4）',
    },
    returns: {
      results: '各股票回测结果数组',
      summary: '聚合指标（平均收益/夏普/最大回撤/胜率）',
      failedSymbols: '失败的股票代码',
      totalMs: '总耗时（毫秒）',
      parallel: '是否使用了并行执行',
    },
  })
}
