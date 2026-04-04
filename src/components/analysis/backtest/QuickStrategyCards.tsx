'use client'

import { TrendingUp, Activity, Zap, Play } from 'lucide-react'
import { ConceptTooltip } from '@/components/ui/concept-tooltip'

interface QuickStrategy {
  id: string
  name: string
  params: Record<string, number>
}

interface QuickStrategyCardsProps {
  strategies: QuickStrategy[]
  running: boolean
  defaultSymbol: string
  defaultPeriod: { start: string; end: string }
  onQuickBacktest: (strategyId: string, params: Record<string, number>) => void
}

const STRATEGY_ICONS: Record<string, React.ReactNode> = {
  ma_crossover: <TrendingUp className="w-4 h-4 text-blue-500" />,
  rsi: <Activity className="w-4 h-4 text-green-500" />,
  macd: <Zap className="w-4 h-4 text-purple-500" />,
  bollinger: <Play className="w-4 h-4 text-orange-500" />,
}

export function QuickStrategyCards({
  strategies,
  running,
  defaultSymbol,
  defaultPeriod,
  onQuickBacktest,
}: QuickStrategyCardsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">快速回测</p>
        <ConceptTooltip
          concept="快速回测"
          title="快速回测"
          description="使用预设参数快速体验不同策略的效果"
          example={`点击任意策略即可使用${defaultSymbol} ${defaultPeriod.start.slice(0, 4)}年数据进行回测`}
        >
          <span></span>
        </ConceptTooltip>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {strategies.map((strategy) => (
          <button
            key={strategy.id}
            onClick={() => onQuickBacktest(strategy.id, strategy.params)}
            disabled={running}
            className="p-3 rounded-lg border text-left hover:border-primary/50 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-2 mb-1">
              {STRATEGY_ICONS[strategy.id]}
              <span className="font-medium text-sm">{strategy.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {defaultSymbol} {defaultPeriod.start.slice(0, 4)}年
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
