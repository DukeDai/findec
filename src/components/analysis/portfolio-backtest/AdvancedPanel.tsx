'use client'

import { BacktestPlan, OptimizationResult, WalkForwardResult, MonteCarloResult, getParamRanges } from './types'
import { StrategyExplorer } from '../StrategyExplorer'
import { OptimizationResults } from '../OptimizationResults'
import { WalkForwardChart } from '../WalkForwardChart'
import { MonteCarloChart } from '../MonteCarloChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export type AdvancedTabType = 'optimization' | 'walkforward' | 'montecarlo' | null

interface AdvancedPanelProps {
  selectedPlan: BacktestPlan | null
  advancedTab: AdvancedTabType
  onTabChange: (tab: AdvancedTabType) => void

  optimizationResults: OptimizationResult[] | null
  optimizing: boolean
  optimizationError: string | null
  onRunOptimization: (searchParams: { paramName: string; start: number; end: number; step: number }[], metric: string) => void
  onApplyBestParams: () => void

  walkforwardResult: WalkForwardResult | null
  walkforwardLoading: boolean
  walkforwardError: string | null
  walkforwardConfig: { trainPeriod: number; testPeriod: number; stepDays: number }
  onWalkforwardConfigChange: (config: { trainPeriod: number; testPeriod: number; stepDays: number }) => void
  onRunWalkForward: () => void

  monteCarloResult: MonteCarloResult | null
  monteCarloLoading: boolean
  monteCarloError: string | null
  monteCarloConfig: { simulations: number }
  onMonteCarloConfigChange: (config: { simulations: number }) => void
  onRunMonteCarlo: () => void
}

export function AdvancedPanel({
  selectedPlan,
  advancedTab,
  onTabChange,
  optimizationResults,
  optimizing,
  optimizationError,
  onRunOptimization,
  onApplyBestParams,
  walkforwardResult,
  walkforwardLoading,
  walkforwardError,
  walkforwardConfig,
  onWalkforwardConfigChange,
  onRunWalkForward,
  monteCarloResult,
  monteCarloLoading,
  monteCarloError,
  monteCarloConfig,
  onMonteCarloConfigChange,
  onRunMonteCarlo,
}: AdvancedPanelProps) {
  if (!selectedPlan) {
    return null
  }

  const handleRunOptimization = () => {
    if (!selectedPlan.strategies[0]) return
    const ranges = getParamRanges(selectedPlan.strategies[0].type)
    const searchParams = Object.entries(ranges).map(([key, range]) => ({
      paramName: key,
      start: range.min,
      end: range.max,
      step: range.step,
    }))
    onRunOptimization(searchParams, 'sharpeRatio')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">高级分析</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={advancedTab === 'optimization' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTabChange(advancedTab === 'optimization' ? null : 'optimization')}
            >
              参数优化
            </Button>
            <Button
              variant={advancedTab === 'walkforward' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTabChange(advancedTab === 'walkforward' ? null : 'walkforward')}
            >
              向前验证
            </Button>
            <Button
              variant={advancedTab === 'montecarlo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTabChange(advancedTab === 'montecarlo' ? null : 'montecarlo')}
            >
              蒙特卡洛
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {advancedTab === 'optimization' && (
          <div className="space-y-4">
            {optimizationError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {optimizationError}
              </div>
            )}
            {selectedPlan.strategies[0] && (
              <StrategyExplorer
                strategyType={selectedPlan.strategies[0].type}
                defaultParams={selectedPlan.strategies[0].parameters || {}}
                paramRanges={getParamRanges(selectedPlan.strategies[0].type)}
                onParamsChange={() => {}}
                onRun={handleRunOptimization}
              />
            )}
            {optimizing && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">正在优化参数...</span>
              </div>
            )}
            {optimizationResults && !optimizing && (
              <OptimizationResults
                results={optimizationResults}
                onSelectBest={onApplyBestParams}
              />
            )}
          </div>
        )}

        {advancedTab === 'walkforward' && (
          <div className="space-y-4">
            {walkforwardError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {walkforwardError}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">训练期 (天)</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={walkforwardConfig.trainPeriod}
                  onChange={(e) => onWalkforwardConfigChange({ ...walkforwardConfig, trainPeriod: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">测试期 (天)</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={walkforwardConfig.testPeriod}
                  onChange={(e) => onWalkforwardConfigChange({ ...walkforwardConfig, testPeriod: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">步长 (天)</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={walkforwardConfig.stepDays}
                  onChange={(e) => onWalkforwardConfigChange({ ...walkforwardConfig, stepDays: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <Button onClick={onRunWalkForward} disabled={walkforwardLoading} className="w-full">
              {walkforwardLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  正在运行...
                </>
              ) : (
                '运行向前验证'
              )}
            </Button>
            {walkforwardResult && !walkforwardLoading && (
              <WalkForwardChart result={walkforwardResult} />
            )}
          </div>
        )}

        {advancedTab === 'montecarlo' && (
          <div className="space-y-4">
            {monteCarloError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {monteCarloError}
              </div>
            )}
            <div>
              <label className="text-sm text-muted-foreground">模拟次数</label>
              <input
                type="number"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={monteCarloConfig.simulations}
                onChange={(e) => onMonteCarloConfigChange({ ...monteCarloConfig, simulations: parseInt(e.target.value) })}
                min={100}
                max={10000}
              />
            </div>
            <Button onClick={onRunMonteCarlo} disabled={monteCarloLoading} className="w-full">
              {monteCarloLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  正在运行...
                </>
              ) : (
                '运行蒙特卡洛模拟'
              )}
            </Button>
            {monteCarloResult && !monteCarloLoading && (
              <MonteCarloChart result={monteCarloResult} />
            )}
          </div>
        )}

        {!advancedTab && (
          <div className="text-center py-8 text-muted-foreground">
            点击上方按钮选择高级分析功能
          </div>
        )}
      </CardContent>
    </Card>
  )
}
