"use client"

interface WalkForwardResult {
  trainResults: { metrics: { sharpeRatio: number; totalReturn: number } }[]
  testResults: { metrics: { sharpeRatio: number; totalReturn: number } }[]
  degradation: number
}

export function WalkForwardChart({ result }: { result: WalkForwardResult }) {
  const trainSharpe = result.trainResults.map(r => r.metrics.sharpeRatio)
  const testSharpe = result.testResults.map(r => r.metrics.sharpeRatio)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <h4 className="text-sm font-medium mb-2">训练期平均夏普</h4>
          <p className="text-2xl font-bold">
            {(trainSharpe.reduce((a, b) => a + b, 0) / trainSharpe.length).toFixed(2)}
          </p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <h4 className="text-sm font-medium mb-2">测试期平均夏普</h4>
          <p className="text-2xl font-bold">
            {(testSharpe.reduce((a, b) => a + b, 0) / testSharpe.length).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-center gap-4 h-48">
        {trainSharpe.map((train, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="w-8 bg-blue-500 rounded-t"
              style={{ height: `${Math.abs(train) * 30}px` }}
            />
            <div
              className="w-8 bg-green-500 rounded-t"
              style={{ height: `${Math.abs(testSharpe[i]) * 30}px` }}
            />
            <span className="text-xs text-muted-foreground">{i + 1}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          训练期
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          测试期
        </span>
      </div>

      <div className={`text-center text-sm ${
        result.degradation > 20 ? 'text-red-500' : result.degradation > 0 ? 'text-yellow-500' : 'text-green-500'
      }`}>
        策略退化: {result.degradation.toFixed(1)}%
        {result.degradation > 20 && ' ⚠️ 警告: 策略可能过拟合'}
      </div>
    </div>
  )
}
