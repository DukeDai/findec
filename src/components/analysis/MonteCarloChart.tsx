"use client"

interface MonteCarloResult {
  finalValues: number[]
  percentiles: Record<number, number>
  probabilityOfProfit: number
  averageMaxDrawdown: number
  initialValue: number
  medianReturn: number
}

function createHistogram(values: number[], bins: number): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const binWidth = (max - min) / bins
  const histogram = new Array(bins).fill(0)

  for (const val of values) {
    const bin = Math.min(Math.floor((val - min) / binWidth), bins - 1)
    histogram[bin]++
  }

  return histogram
}

export function MonteCarloChart({ result }: { result: MonteCarloResult }) {
  const histogram = createHistogram(result.finalValues, 50)

  return (
    <div className="space-y-4">
      <div className="h-48 flex items-end gap-1">
        {histogram.map((count, i) => (
          <div
            key={i}
            className="flex-1 bg-primary/50 hover:bg-primary transition-colors"
            style={{ height: `${(count / Math.max(...histogram)) * 100}%` }}
            title={`范围: ${result.finalValues[i * Math.floor(result.finalValues.length / histogram.length)]}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">盈利概率</div>
          <div className={`text-xl font-bold ${
            result.probabilityOfProfit > 0.5 ? 'text-green-500' : 'text-red-500'
          }`}>
            {(result.probabilityOfProfit * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-card rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">中位数收益</div>
          <div className="text-xl font-bold">
            {((result.medianReturn / result.initialValue - 1) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-card rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">95% VaR</div>
          <div className="text-xl font-bold text-red-500">
            {((1 - result.percentiles[0.05] / result.initialValue) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-card rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">平均最大回撤</div>
          <div className="text-xl font-bold text-red-500">
            {(result.averageMaxDrawdown * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="text-sm">
        <h4 className="font-medium mb-2">收益分布百分位</h4>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(result.percentiles)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([pct, val]) => (
              <div key={pct} className="bg-muted rounded p-2 text-center">
                <div className="text-xs text-muted-foreground">{Number(pct) * 100}%</div>
                <div className="font-mono">{(val / result.initialValue * 100).toFixed(0)}%</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
