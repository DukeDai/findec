"use client"

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Settings } from 'lucide-react'

interface StrategyExplorerProps {
  strategyType: string
  defaultParams: Record<string, number>
  paramRanges: Record<string, { min: number; max: number; step: number }>
  onParamsChange: (params: Record<string, number>) => void
  onRun: (params: Record<string, number>) => void
}

export function StrategyExplorer({
  strategyType,
  defaultParams,
  paramRanges,
  onParamsChange,
  onRun,
}: StrategyExplorerProps) {
  const [params, setParams] = useState(defaultParams)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleChange = useCallback((key: string, value: number) => {
    const newParams = { ...params, [key]: value }
    setParams(newParams)
    onParamsChange(newParams)
  }, [params, onParamsChange])

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">策略参数探索</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {showAdvanced && (
        <div className="space-y-4">
          {Object.entries(paramRanges).map(([key, range]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <label>{key}</label>
                <span className="text-muted-foreground">{params[key]}</span>
              </div>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={params[key]}
                onChange={(e) => handleChange(key, Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{range.min}</span>
                <span>{range.max}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button onClick={() => onRun(params)} className="w-full">
        <Play className="w-4 h-4 mr-2" />
        使用当前参数回测
      </Button>
    </div>
  )
}
