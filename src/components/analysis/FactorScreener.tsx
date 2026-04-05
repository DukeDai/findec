'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Play, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Settings2 } from 'lucide-react'
import { ConceptTooltip } from '@/components/ui/concept-tooltip'
import { StrategyTemplates } from '@/components/factors/StrategyTemplates'
import { ScreeningStrategy, ScreeningRule } from '@/lib/factors/screening-engine'
import { FactorCorrelationHeatmap } from '@/components/factors/FactorCorrelationHeatmap'
import { FactorScoringPanel, ScoringMethod } from '@/components/factors/FactorScoringPanel'

import { FactorEffectivenessPanel } from '@/components/factors/FactorEffectiveness'

function FactorContributionChart({ contributions }: { contributions: { factorId: string; contribution: number; avgScore: number }[] }) {
  if (!contributions || contributions.length === 0) return null
  const maxContribution = Math.max(...contributions.map((c) => c.contribution))
  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        因子贡献度分析
      </h3>
      <div className="space-y-3">
        {contributions.slice(0, 8).map((item) => (
          <div key={item.factorId} className="flex items-center gap-3">
            <div className="w-24 text-xs text-muted-foreground truncate">{item.factorId}</div>
            <div className="flex-1 h-6 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/80 transition-all duration-300"
                style={{ width: `${(item.contribution / maxContribution) * 100}%` }}
              />
            </div>
            <div className="w-16 text-right text-xs font-medium">{item.contribution.toFixed(1)}%</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        贡献度基于因子方差计算，显示每个因子对总分差异的贡献比例
      </p>
    </div>
  )
}

function MethodComparisonPanel({ comparison }: { comparison: { weightedRankCorrelation: number; rankThresholdCorrelation: number } }) {
  const formatCorrelation = (corr: number) => {
    const absCorr = Math.abs(corr)
    if (absCorr > 0.8) return { text: '高度相关', color: 'text-green-500' }
    if (absCorr > 0.5) return { text: '中度相关', color: 'text-yellow-500' }
    if (absCorr > 0.3) return { text: '弱相关', color: 'text-orange-500' }
    return { text: '几乎无关', color: 'text-red-500' }
  }
  const weightedRank = formatCorrelation(comparison.weightedRankCorrelation)
  const rankThreshold = formatCorrelation(comparison.rankThresholdCorrelation)
  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <h3 className="text-sm font-medium mb-3">评分方法相关性分析</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">加权求和 vs 排名求和</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${weightedRank.color}`}>
              {comparison.weightedRankCorrelation.toFixed(3)}
            </span>
            <span className={`text-xs ${weightedRank.color}`}>({weightedRank.text})</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">排名求和 vs 阈值计数</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${rankThreshold.color}`}>
              {comparison.rankThresholdCorrelation.toFixed(3)}
            </span>
            <span className={`text-xs ${rankThreshold.color}`}>({rankThreshold.text})</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">相关性越高，不同评分方法的结果越一致</p>
    </div>
  )
}

const FACTOR_CONCEPTS: Record<string, { name: string; description: string; interpretation: string }> = {
  '市净率(PB)': {
    name: '市净率 (P/B Ratio)',
    description: '股票价格与每股净资产的比值。反映股票相对于其账面价值的溢价。',
    interpretation: 'PB < 1 表示股价低于净资产，可能被低估；金融股常用 PB 估值。'
  },
  '市盈率(PE)': {
    name: '市盈率 (P/E Ratio)',
    description: '股票价格与每股收益的比值。反映投资者为获得1元利润愿意支付的价格。',
    interpretation: 'PE 越低越便宜，但需结合行业和增速。周期性行业 PE 低时反而危险。'
  },
  'PEG': {
    name: 'PEG 比率',
    description: '市盈率与净利润增速的比值。综合考虑估值和成长性。',
    interpretation: 'PEG < 1 表示可能被低估；PEG > 2 表示成长被高估。'
  },
  '股息率': {
    name: '股息率 (Dividend Yield)',
    description: '年度股息总额与当前股价的比值。',
    interpretation: '股息率高说明公司愿意分红，但需确认分红可持续性。'
  },
  'ROE': {
    name: '净资产收益率 (ROE)',
    description: '净利润与净资产的比值。衡量公司使用股东资本的效率。',
    interpretation: 'ROE > 15% 表示优质公司；持续高 ROE 说明有护城河。'
  },
  '负债率': {
    name: '资产负债率',
    description: '负债总额与资产总额的比值。反映公司的财务风险程度。',
    interpretation: '一般建议 < 50%，金融地产等行业除外。'
  }
}

interface FactorStrategy {
  id: string
  name: string
  description: string
  rules: { field: string; operator: string; value: number; weight?: number }[]
}

interface ScreeningResult {
  symbol: string
  name: string
  price: number
  change: number
  matchScore: number
  factors: Record<string, number>
}

const PRESET_STRATEGIES: FactorStrategy[] = [
  {
    id: 'value_growth',
    name: '价值成长股',
    description: '筛选低估值且有成长性的股票',
    rules: [
      { field: 'rsi_14', operator: '>', value: 30, weight: 0.3 },
      { field: 'rsi_14', operator: '<', value: 70, weight: 0.3 },
      { field: 'ma20_position', operator: '>', value: 0, weight: 0.2 },
      { field: 'momentum_10d', operator: '>', value: 0, weight: 0.2 },
    ],
  },
  {
    id: 'value_investing',
    name: '价值投资',
    description: '筛选低估值高分红的优质股票',
    rules: [
      { field: 'pe_ratio', operator: '<', value: 25, weight: 0.25 },
      { field: 'pe_ratio', operator: '>', value: 0, weight: 0.15 },
      { field: 'peg_ratio', operator: '<', value: 1.5, weight: 0.2 },
      { field: 'pb_ratio', operator: '<', value: 5, weight: 0.15 },
      { field: 'dividend_yield', operator: '>', value: 1, weight: 0.15 },
      { field: 'beta', operator: '<', value: 1.5, weight: 0.1 },
    ],
  },
  {
    id: 'oversold_rebound',
    name: '超卖反弹',
    description: '筛选超卖后可能反弹的股票',
    rules: [
      { field: 'rsi_14', operator: '<', value: 30, weight: 0.5 },
      { field: 'bollinger_position', operator: '<', value: 20, weight: 0.5 },
    ],
  },
  {
    id: 'strong_trend',
    name: '强势趋势',
    description: '筛选处于强势上涨趋势的股票',
    rules: [
      { field: 'ma20_position', operator: '>', value: 5, weight: 0.3 },
      { field: 'ma50_position', operator: '>', value: 0, weight: 0.2 },
      { field: 'macd_signal', operator: '>', value: 0, weight: 0.3 },
      { field: 'momentum_10d', operator: '>', value: 3, weight: 0.2 },
    ],
  },
  {
    id: 'low_volatility',
    name: '低波动稳健',
    description: '筛选低波动率的稳健股票',
    rules: [
      { field: 'volatility_20d', operator: '<', value: 20, weight: 0.4 },
      { field: 'atr_ratio', operator: '<', value: 3, weight: 0.3 },
      { field: 'rsi_14', operator: '>', value: 40, weight: 0.3 },
    ],
  },
]

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM']

type TabType = 'screen' | 'analysis'

export function FactorScreener() {
  const [activeTab, setActiveTab] = useState<TabType>('screen')
  const [strategies, setStrategies] = useState<FactorStrategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<FactorStrategy | null>(null)
  const [results, setResults] = useState<ScreeningResult[]>([])
  const [loading, setLoading] = useState(false)
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS)
  const [customSymbols, setCustomSymbols] = useState('')
  const [showCorrelation, setShowCorrelation] = useState(false)
  const [scoringMethod, setScoringMethod] = useState<ScoringMethod>('weighted_sum')
  const [factorWeights, setFactorWeights] = useState<{ factorId: string; weight: number; label: string }[]>([])
  const [showScoringPanel, setShowScoringPanel] = useState(false)
  const [orthogonalize, setOrthogonalize] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<{
    factorContributions: { factorId: string; contribution: number; avgScore: number }[];
    methodComparison?: { weightedRankCorrelation: number; rankThresholdCorrelation: number };
  } | null>(null)

  const loadStrategies = async () => {
    try {
      const res = await fetch('/api/factors/strategies')
      const data = await res.json()
      if (data && data.length > 0) {
        setStrategies(data)
      }
    } catch (error) {
      console.error('Failed to load strategies:', error)
    }
  }

  const runScreen = async () => {
    if (!selectedStrategy) return
    setLoading(true)
    setResults([])
    setOptimizationResult(null)
    try {
      const res = await fetch('/api/factors/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: {
            id: selectedStrategy.id,
            name: selectedStrategy.name,
            rules: selectedStrategy.rules.map((r) => ({
              factorId: r.field,
              operator: r.operator,
              value: r.value,
              weight: r.weight,
            })),
            scoringMethod,
          },
          symbols,
          scoringMethod,
          orthogonalize,
        }),
      })
      const data = await res.json()
      setOptimizationResult({
        factorContributions: data.factorContributions || [],
        methodComparison: data.methodComparison,
      })
      setResults(data.topSymbols || [])
    } catch (error) {
      console.error('Failed to run screen:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomSymbols = () => {
    const parsed = customSymbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s)
    if (parsed.length > 0) {
      setSymbols(parsed)
    }
  }

  const handleApplyTemplate = (strategy: ScreeningStrategy) => {
    const convertedStrategy: FactorStrategy = {
      id: strategy.id || `template-${Date.now()}`,
      name: strategy.name,
      description: '从模板导入的策略',
      rules: strategy.rules.map((rule: ScreeningRule) => ({
        field: rule.factorId,
        operator: rule.operator,
        value: Array.isArray(rule.value) ? rule.value[0] : rule.value,
        weight: rule.weight,
      })),
    }
    setSelectedStrategy(convertedStrategy)

    const weights = strategy.rules.map(rule => ({
      factorId: rule.factorId,
      weight: rule.weight,
      label: rule.factorId,
    }))
    setFactorWeights(weights)
  }

  const handleStrategySelect = (strategy: FactorStrategy) => {
    setSelectedStrategy(strategy)

    const weights = strategy.rules.map(rule => ({
      factorId: rule.field,
      weight: rule.weight || 1,
      label: rule.field,
    }))
    setFactorWeights(weights)
  }

  const handleScoringChange = useCallback((config: { method: ScoringMethod; weights: { factorId: string; weight: number; label?: string }[] }) => {
    setScoringMethod(config.method)
    setFactorWeights(config.weights.map(w => ({ ...w, label: w.label || w.factorId })))
  }, [])

  const renderFactorLabel = (field: string) => {
    const concept = FACTOR_CONCEPTS[field]
    const label = field

    if (!concept) return <span>{label}</span>

    return (
      <ConceptTooltip
        concept={field}
        title={concept.name}
        description={concept.description}
        example={concept.interpretation}
      >
        <span className="cursor-help underline decoration-dotted hover:decoration-solid">{label}</span>
      </ConceptTooltip>
    )
  }

  return (
    <div className="space-y-6">
      {showCorrelation && (
        <FactorCorrelationHeatmap onClose={() => setShowCorrelation(false)} />
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setShowScoringPanel(!showScoringPanel)}
          className="gap-2"
        >
          <Settings2 className="w-4 h-4" />
          {showScoringPanel ? '隐藏评分设置' : '评分设置'}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowCorrelation(!showCorrelation)}
          className="gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          {showCorrelation ? '隐藏相关性分析' : '相关性分析'}
        </Button>
      </div>

      <StrategyTemplates onApply={handleApplyTemplate} />

      {showScoringPanel && (
        <FactorScoringPanel
          initialMethod={scoringMethod}
          initialWeights={factorWeights}
          onScoringChange={handleScoringChange}
          defaultExpanded={true}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRESET_STRATEGIES.map((strategy) => (
          <button
            key={strategy.id}
            onClick={() => handleStrategySelect(strategy)}
            className={`p-4 rounded-lg border text-left transition-colors ${
              selectedStrategy?.id === strategy.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {strategy.id === 'oversold_rebound' ? (
                <TrendingDown className="w-5 h-5 text-green-500" />
              ) : strategy.id === 'strong_trend' ? (
                <TrendingUp className="w-5 h-5 text-blue-500" />
              ) : strategy.id === 'value_investing' ? (
                <DollarSign className="w-5 h-5 text-emerald-500" />
              ) : (
                <Activity className="w-5 h-5 text-purple-500" />
              )}
              <span className="font-medium">{strategy.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">{strategy.description}</p>
          </button>
        ))}
      </div>

      {selectedStrategy && (
        <div className="p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">筛选条件</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {scoringMethod === 'weighted_sum' ? '加权求和' :
               scoringMethod === 'rank_sum' ? '分位排名' : '阈值计数'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedStrategy.rules.map((rule, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-background border">
                {renderFactorLabel(rule.field)} {rule.operator} {rule.value} (权重{rule.weight})
              </span>
            ))}
           </div>
         </div>
       )}

      {selectedStrategy && (
        <div className="p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="orthogonalize"
              checked={orthogonalize}
              onChange={(e) => setOrthogonalize(e.target.checked)}
              className="w-4 h-4 rounded border"
            />
            <label htmlFor="orthogonalize" className="text-sm cursor-pointer font-medium">
              正交化处理
            </label>
            <span className="text-xs text-muted-foreground">
              消除因子间的多重共线性
            </span>
          </div>
        </div>
      )}

       <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">股票范围</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customSymbols}
            onChange={(e) => setCustomSymbols(e.target.value)}
            placeholder="输入股票代码，用逗号分隔"
            className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
          />
          <Button variant="outline" onClick={handleCustomSymbols}>
            应用
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          当前: {symbols.join(', ')}
        </p>
      </div>

      <Button
        onClick={runScreen}
        disabled={!selectedStrategy || loading}
        className="w-full"
        size="lg"
      >
        <Play className="w-4 h-4 mr-2" />
        {loading ? '筛选中...' : `执行筛选 (${selectedStrategy?.name || '未选择'})`}
      </Button>

      {results.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">股票</th>
                <th className="px-4 py-3 text-right font-medium">价格</th>
                <th className="px-4 py-3 text-right font-medium">涨跌幅</th>
                <th className="px-4 py-3 text-right font-medium">匹配度</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results
                .sort((a, b) => b.matchScore - a.matchScore)
                .map((r) => (
                  <tr key={r.symbol} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{r.symbol}</td>
                    <td className="px-4 py-3 text-right">${r.price?.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right ${r.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {r.change >= 0 ? '+' : ''}{r.change?.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        r.matchScore >= 70 ? 'bg-green-100 text-green-700' :
                        r.matchScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {r.matchScore?.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {optimizationResult?.factorContributions && (
        <FactorContributionChart contributions={optimizationResult.factorContributions} />
      )}

      {optimizationResult?.methodComparison && (
        <MethodComparisonPanel comparison={optimizationResult.methodComparison} />
      )}

      {results.length === 0 && !loading && selectedStrategy && (
        <p className="text-center text-muted-foreground py-8">
          点击「执行筛选」查看结果
        </p>
      )}
    </div>
  )
}
