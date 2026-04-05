'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export interface StrategyRule {
  type: 'condition' | 'group'
  id: string
  indicator?: string
  operator?: string
  value?: number
  comparedTo?: { type: 'indicator' | 'constant'; value: string | number }
  logic?: 'AND' | 'OR'
  conditions?: StrategyRule[]
}

const INDICATORS = [
  { value: 'MA5', label: 'MA5 (5日均线)' },
  { value: 'MA10', label: 'MA10 (10日均线)' },
  { value: 'MA20', label: 'MA20 (20日均线)' },
  { value: 'MA50', label: 'MA50 (50日均线)' },
  { value: 'MA200', label: 'MA200 (200日均线)' },
  { value: 'EMA5', label: 'EMA5 (5日指数均线)' },
  { value: 'EMA10', label: 'EMA10 (10日指数均线)' },
  { value: 'RSI14', label: 'RSI(14)' },
  { value: 'MACD', label: 'MACD' },
  { value: 'Bollinger', label: '布林带' },
  { value: 'Close', label: '收盘价' },
  { value: 'Open', label: '开盘价' },
  { value: 'High', label: '最高价' },
  { value: 'Low', label: '最低价' },
  { value: 'Volume', label: '成交量' },
]

const OPERATORS = [
  { value: '>', label: '大于 (>)' },
  { value: '<', label: '小于 (<)' },
  { value: '>=', label: '大于等于 (>=)' },
  { value: '<=', label: '小于等于 (<=)' },
  { value: 'cross_above', label: '上穿' },
  { value: 'cross_below', label: '下穿' },
]

interface ConditionRowProps {
  rule: StrategyRule
  onChange: (rule: StrategyRule) => void
  onDelete: () => void
}

export function ConditionRow({ rule, onChange, onDelete }: ConditionRowProps) {
  const [isComparingToIndicator, setIsComparingToIndicator] = useState(
    rule.comparedTo?.type === 'indicator'
  )

  const handleIndicatorChange = (value: string) => {
    onChange({
      ...rule,
      indicator: value,
    })
  }

  const handleOperatorChange = (value: string) => {
    onChange({
      ...rule,
      operator: value,
    })
  }

  const handleValueChange = (value: string) => {
    const numValue = parseFloat(value)
    onChange({
      ...rule,
      value: isNaN(numValue) ? undefined : numValue,
    })
  }

  const handleComparedToChange = (value: string) => {
    if (isComparingToIndicator) {
      onChange({
        ...rule,
        comparedTo: { type: 'indicator', value },
      })
    } else {
      const numValue = parseFloat(value)
      onChange({
        ...rule,
        comparedTo: { type: 'constant', value: isNaN(numValue) ? 0 : numValue },
      })
    }
  }

  const toggleCompareType = () => {
    setIsComparingToIndicator(!isComparingToIndicator)
    onChange({
      ...rule,
      comparedTo: undefined,
    })
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-background rounded-lg border">
      <select
        value={rule.indicator || ''}
        onChange={(e) => handleIndicatorChange(e.target.value)}
        className="h-8 px-2 rounded-md border bg-background text-sm min-w-[140px]"
      >
        <option value="">选择指标</option>
        {INDICATORS.map((ind) => (
          <option key={ind.value} value={ind.value}>
            {ind.label}
          </option>
        ))}
      </select>

      <select
        value={rule.operator || ''}
        onChange={(e) => handleOperatorChange(e.target.value)}
        className="h-8 px-2 rounded-md border bg-background text-sm min-w-[100px]"
      >
        <option value="">选择操作符</option>
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCompareType}
          className="text-xs h-7 px-2"
        >
          {isComparingToIndicator ? '指标' : '数值'}
        </Button>
        {isComparingToIndicator ? (
          <select
            value={(rule.comparedTo?.value as string) || ''}
            onChange={(e) => handleComparedToChange(e.target.value)}
            className="h-8 px-2 rounded-md border bg-background text-sm min-w-[120px]"
          >
            <option value="">选择指标</option>
            {INDICATORS.map((ind) => (
              <option key={ind.value} value={ind.value}>
                {ind.label}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type="number"
            value={rule.value ?? ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="输入数值"
            className="h-8 w-24"
          />
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}
