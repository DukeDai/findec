'use client'

import { Button } from '@/components/ui/button'

export interface StrategyAction {
  type: 'buy' | 'sell'
  positionSize?: number
  stopLoss?: number
  takeProfit?: number
}

interface ActionConfigProps {
  action: StrategyAction
  onChange: (action: StrategyAction) => void
}

const POSITION_SIZES = [
  { value: 0.05, label: '5%' },
  { value: 0.1, label: '10%' },
  { value: 0.2, label: '20%' },
  { value: 0.5, label: '50%' },
  { value: 1, label: '全部' },
]

const STOP_LOSS_OPTIONS = [
  { value: 0, label: '无' },
  { value: 0.02, label: '2%' },
  { value: 0.05, label: '5%' },
  { value: 0.1, label: '10%' },
]

const TAKE_PROFIT_OPTIONS = [
  { value: 0, label: '无' },
  { value: 0.05, label: '5%' },
  { value: 0.1, label: '10%' },
  { value: 0.2, label: '20%' },
]

export function ActionConfig({ action, onChange }: ActionConfigProps) {
  const handleTypeChange = (type: 'buy' | 'sell') => {
    onChange({ ...action, type })
  }

  const handlePositionSizeChange = (size: number) => {
    onChange({ ...action, positionSize: size })
  }

  const handleStopLossChange = (value: number) => {
    onChange({ ...action, stopLoss: value })
  }

  const handleTakeProfitChange = (value: number) => {
    onChange({ ...action, takeProfit: value })
  }

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
      <div className="space-y-2">
        <label className="text-sm font-medium">操作类型</label>
        <div className="flex gap-2">
          <Button
            variant={action.type === 'buy' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('buy')}
          >
            买入
          </Button>
          <Button
            variant={action.type === 'sell' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('sell')}
          >
            卖出
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">仓位大小</label>
        <div className="flex flex-wrap gap-2">
          {POSITION_SIZES.map((size) => (
            <Button
              key={size.value}
              variant={action.positionSize === size.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePositionSizeChange(size.value)}
            >
              {size.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">止损设置</label>
        <div className="flex flex-wrap gap-2">
          {STOP_LOSS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={action.stopLoss === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStopLossChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">止盈设置</label>
        <div className="flex flex-wrap gap-2">
          {TAKE_PROFIT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={action.takeProfit === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTakeProfitChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
