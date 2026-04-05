'use client'

import { StrategyRule } from './ConditionRow'
import { StrategyAction } from './ActionConfig'
import { Lightbulb } from 'lucide-react'

interface StrategyPreviewProps {
  rootRule: StrategyRule
  action: StrategyAction
}

const INDICATOR_NAMES: Record<string, string> = {
  MA5: 'MA5',
  MA10: 'MA10',
  MA20: 'MA20',
  MA50: 'MA50',
  MA200: 'MA200',
  EMA5: 'EMA5',
  EMA10: 'EMA10',
  RSI14: 'RSI(14)',
  MACD: 'MACD',
  Bollinger: '布林带',
  Close: '收盘价',
  Open: '开盘价',
  High: '最高价',
  Low: '最低价',
  Volume: '成交量',
}

const OPERATOR_NAMES: Record<string, string> = {
  '>': '大于',
  '<': '小于',
  '>=': '大于等于',
  '<=': '小于等于',
  cross_above: '上穿',
  cross_below: '下穿',
}

export function StrategyPreview({ rootRule, action }: StrategyPreviewProps) {
  const formatCondition = (rule: StrategyRule): string => {
    if (rule.type === 'group' && rule.conditions) {
      const conditionsText = rule.conditions
        .map((c) => formatCondition(c))
        .filter((t) => t)
        .join(` ${rule.logic} `)
      return conditionsText ? `(${conditionsText})` : ''
    }

    if (rule.type === 'condition') {
      const indicator = INDICATOR_NAMES[rule.indicator || ''] || rule.indicator
      const operator = OPERATOR_NAMES[rule.operator || ''] || rule.operator

      if (!indicator || !operator) return ''

      if (rule.comparedTo?.type === 'indicator') {
        const comparedIndicator =
          INDICATOR_NAMES[rule.comparedTo.value as string] || rule.comparedTo.value
        return `${indicator} ${operator} ${comparedIndicator}`
      } else {
        const value = rule.comparedTo?.value ?? rule.value ?? 0
        return `${indicator} ${operator} ${value}`
      }
    }

    return ''
  }

  const formatAction = (): string => {
    const actionType = action.type === 'buy' ? '买入' : '卖出'
    const positionSize = action.positionSize
      ? action.positionSize === 1
        ? '全部仓位'
        : `${(action.positionSize * 100).toFixed(0)}%仓位`
      : '10%仓位'
    const stopLoss = action.stopLoss
      ? `止损 ${(action.stopLoss * 100).toFixed(0)}%`
      : ''
    const takeProfit = action.takeProfit
      ? `止盈 ${(action.takeProfit * 100).toFixed(0)}%`
      : ''

    return [actionType, positionSize, stopLoss, takeProfit]
      .filter((s) => s)
      .join('，')
  }

  const conditionsText = formatCondition(rootRule)
  const actionText = formatAction()

  if (!conditionsText) {
    return (
      <div className="p-4 rounded-lg border bg-muted/30 text-muted-foreground text-sm">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          <span>添加条件以预览策略</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium">策略预览</span>
      </div>
      <div className="text-sm space-y-2">
        <p>
          <span className="text-muted-foreground">当</span>{' '}
          <span className="font-medium">{conditionsText}</span>
        </p>
        <p className="pl-4">
          <span className="text-muted-foreground">→</span>{' '}
          <span className="font-medium text-primary">{actionText}</span>
        </p>
      </div>
    </div>
  )
}
