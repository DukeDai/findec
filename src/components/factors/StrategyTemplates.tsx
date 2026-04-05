'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, ChevronUp, Info, BookOpen, TrendingUp, Shield } from 'lucide-react'
import { StrategyTemplate, PRESET_TEMPLATES, conditionColors } from '@/lib/factors/strategy-templates'
import { ScreeningStrategy, ScreeningRule } from '@/lib/factors/screening-engine'

interface StrategyTemplatesProps {
  onApply: (strategy: ScreeningStrategy) => void
}

const FACTOR_NAMES: Record<string, string> = {
  pe_ratio: '市盈率(P/E)',
  peg_ratio: 'PEG比率',
  pb_ratio: '市净率(P/B)',
  dividend_yield: '股息率',
  eps_growth: 'EPS增长',
  beta: '贝塔系数',
  ma20_position: 'MA20位置',
  ma50_position: 'MA50位置',
  rsi_14: 'RSI(14)',
  macd_signal: 'MACD信号',
  bollinger_position: '布林带位置',
  momentum_10d: '10日动量',
  volatility_20d: '20日波动率',
  atr_ratio: 'ATR比率',
  price_volume_trend: '价量趋势',
  stoch_k: '随机K值',
}

const OPERATOR_NAMES: Record<string, string> = {
  '>': '大于',
  '<': '小于',
  '>=': '大于等于',
  '<=': '小于等于',
  '==': '等于',
  'between': '介于',
}

function getStrategyIcon(marketCondition: string) {
  switch (marketCondition) {
    case '牛市':
      return <TrendingUp className="w-5 h-5 text-green-600" />
    case '熊市':
      return <TrendingUp className="w-5 h-5 text-red-600 rotate-180" />
    case '震荡':
      return <Info className="w-5 h-5 text-amber-600" />
    case '长期持有':
      return <BookOpen className="w-5 h-5 text-blue-600" />
    case '风险厌恶':
      return <Shield className="w-5 h-5 text-gray-600" />
    default:
      return <Info className="w-5 h-5 text-muted-foreground" />
  }
}

function formatRule(rule: ScreeningRule): string {
  const factorName = FACTOR_NAMES[rule.factorId] || rule.factorId
  const operatorName = OPERATOR_NAMES[rule.operator] || rule.operator
  const valueStr = Array.isArray(rule.value) 
    ? `${rule.value[0]} 到 ${rule.value[1]}` 
    : String(rule.value)
  return `${factorName} ${operatorName} ${valueStr}`
}

export function StrategyTemplates({ onApply }: StrategyTemplatesProps) {
  const [expanded, setExpanded] = useState(true)
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null)
  const [detailTemplateId, setDetailTemplateId] = useState<string | null>(null)

  const handleApply = (template: StrategyTemplate) => {
    onApply(template.strategy)
    setAppliedTemplateId(template.id)
    
    setTimeout(() => {
      setAppliedTemplateId(null)
    }, 2000)
  }

  const toggleDetail = (templateId: string) => {
    setDetailTemplateId(detailTemplateId === templateId ? null : templateId)
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-1 py-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-base">📋</span>
          预设策略模板
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESET_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className={`transition-all duration-200 hover:shadow-md ${
                appliedTemplateId === template.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getStrategyIcon(template.marketCondition)}
                      <CardTitle className="text-base font-semibold leading-tight">
                        {template.nameZh}
                      </CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {template.name}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      conditionColors[template.marketCondition]
                    }`}
                  >
                    {template.marketCondition}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-sm text-muted-foreground mb-3">
                  {template.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="mt-2">
                  <button
                    onClick={() => toggleDetail(template.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {detailTemplateId === template.id ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        收起详情
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        查看详情 ({template.strategy.rules.length} 条规则)
                      </>
                    )}
                  </button>
                  
                  {detailTemplateId === template.id && (
                    <div className="mt-2 p-2 rounded bg-muted/50 text-xs space-y-1">
                      <p className="font-medium text-foreground mb-1">筛选规则：</p>
                      {template.strategy.rules.map((rule, index) => (
                        <div key={index} className="flex items-center gap-2 text-muted-foreground">
                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center">
                            {index + 1}
                          </span>
                          {formatRule(rule)}
                          <span className="text-muted-foreground/60">(权重 {rule.weight})</span>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-border">
                        <span className="text-muted-foreground/70">
                          评分方法: {template.strategy.scoringMethod === 'weighted_sum' ? '加权求和' : 
                                   template.strategy.scoringMethod === 'rank_sum' ? '排名求和' : '阈值计数'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  size="sm"
                  className="w-full"
                  variant={appliedTemplateId === template.id ? 'secondary' : 'default'}
                  onClick={() => handleApply(template)}
                >
                  {appliedTemplateId === template.id ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" />
                      已应用
                    </>
                  ) : (
                    '应用到当前'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
