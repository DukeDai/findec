"use client"

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Settings, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

interface StrategyExplorerProps {
  strategyType: string
  defaultParams: Record<string, number>
  paramRanges: Record<string, { min: number; max: number; step: number }>
  onParamsChange: (params: Record<string, number>) => void
  onRun: (params: Record<string, number>) => void
}

interface SimilarStrategy {
  strategy: {
    id?: string
    name: string
    type: string
    symbols: string[]
    parameters: Record<string, number>
  }
  similarity: number
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
  const [similarStrategies, setSimilarStrategies] = useState<SimilarStrategy[]>(
    []
  )
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleChange = useCallback(
    (key: string, value: number) => {
      const newParams = { ...params, [key]: value }
      setParams(newParams)
      onParamsChange(newParams)
    },
    [params, onParamsChange]
  )

  const findSimilarStrategies = async () => {
    setIsSearching(true)
    setSearchError(null)
    try {
      const targetStrategy = {
        name: strategyType,
        type: strategyType,
        symbols: [],
        parameters: params,
      }

      const response = await fetch('/api/strategies/similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetStrategy }),
      })

      if (!response.ok) {
        throw new Error('查找失败')
      }

      const data = await response.json()
      setSimilarStrategies(data.results || [])
    } catch {
      setSearchError('查找相似策略失败，请稍后重试')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">策略参数探索</h3>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger>
              <Button
                variant="ghost"
                size="sm"
                onClick={findSimilarStrategies}
              >
                <Search className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>相似策略</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  当前策略: <span className="font-medium">{strategyType}</span>
                </div>

                {isSearching && (
                  <div className="text-sm text-muted-foreground">
                    正在查找相似策略...
                  </div>
                )}

                {searchError && (
                  <div className="text-sm text-red-500">{searchError}</div>
                )}

                {!isSearching && !searchError && similarStrategies.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    暂无相似策略
                  </div>
                )}

                {!isSearching && similarStrategies.length > 0 && (
                  <div className="space-y-3">
                    {similarStrategies.map((item, index) => (
                      <div
                        key={index}
                        className="p-3 border rounded-md space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {item.strategy.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(item.similarity * 100)}%
                          </span>
                        </div>
                        <Progress value={item.similarity * 100} className="h-2" />
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>类型: {item.strategy.type}</span>
                          <span>标的数: {item.strategy.symbols.length}</span>
                          <span>
                            参数数: {Object.keys(item.strategy.parameters).length}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
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
