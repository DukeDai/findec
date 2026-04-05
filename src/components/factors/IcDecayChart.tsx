'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface IcDecayData {
  lag: number
  ic: number
}

interface IcDecayChartProps {
  decayData: IcDecayData[]
}

export function IcDecayChart({ decayData }: IcDecayChartProps) {
  if (decayData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        暂无衰减数据
      </div>
    )
  }

  const maxIc = Math.max(...decayData.map(d => Math.abs(d.ic)), 0.1)
  const minIc = Math.min(...decayData.map(d => d.ic), 0)

  const findHalfLife = (): number | null => {
    const baseIc = decayData[0]?.ic || 0
    if (baseIc === 0) return null

    for (let i = 1; i < decayData.length; i++) {
      if (Math.abs(decayData[i].ic) <= Math.abs(baseIc) * 0.5) {
        return decayData[i].lag
      }
    }
    return null
  }

  const halfLife = findHalfLife()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {decayData.map((data) => (
          <div key={data.lag} className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">
              {data.lag}日滞后期IC
            </div>
            <div className={`text-lg font-semibold ${
              data.ic > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {data.ic.toFixed(3)}
            </div>
          </div>
        ))}
      </div>

      <div className="relative h-48 mt-4">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          <defs>
            <linearGradient id="decayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line
            x1="40"
            y1="170"
            x2="380"
            y2="170"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          <line
            x1="40"
            y1="170"
            x2="40"
            y2="20"
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          {decayData.map((data, index) => {
            const x = 40 + (index / (decayData.length - 1 || 1)) * 340
            const normalizedValue = maxIc > 0 ? data.ic / maxIc : 0
            const y = 170 - Math.abs(normalizedValue) * 150

            return (
              <g key={data.lag}>
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill={data.ic > 0 ? '#22c55e' : '#ef4444'}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={x}
                  y={190}
                  textAnchor="middle"
                  className="text-xs fill-muted-foreground"
                >
                  {data.lag}日
                </text>
              </g>
            )
          })}

          {decayData.length > 1 && (
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              points={decayData.map((data, index) => {
                const x = 40 + (index / (decayData.length - 1)) * 340
                const normalizedValue = maxIc > 0 ? data.ic / maxIc : 0
                const y = 170 - Math.abs(normalizedValue) * 150
                return `${x},${y}`
              }).join(' ')}
            />
          )}

          {halfLife && (
            <g>
              <line
                x1="40"
                y1="95"
                x2="380"
                y2="95"
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x="50"
                y="90"
                className="text-xs fill-amber-500"
              >
                半衰期
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>IC衰减测试：观察因子预测能力随时间推移的变化。</p>
        {halfLife ? (
          <p className="mt-1">
            半衰期约为 <span className="font-medium text-amber-600">{halfLife}天</span>
            （IC衰减至初始值50%所需时间）
          </p>
        ) : (
          <p className="mt-1">在测试期间内未达到半衰期</p>
        )}
      </div>
    </div>
  )
}
