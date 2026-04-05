'use client'

import { useState, useEffect } from 'react'
import { PlanList } from './portfolio-backtest/PlanList'
import { CreateForm, FormData, StrategyParams } from './portfolio-backtest/CreateForm'
import { ReportPanel } from './portfolio-backtest/ReportPanel'
import { AdvancedPanel, AdvancedTabType } from './portfolio-backtest/AdvancedPanel'
import {
  BacktestPlan,
  BacktestReport,
  StrategyConfig,
  OptimizationResult,
  WalkForwardResult,
  MonteCarloResult,
  getParamRanges,
} from './portfolio-backtest/types'

export function PortfolioBacktestRunner() {
  const [plans, setPlans] = useState<BacktestPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<BacktestPlan | null>(null)
  const [report, setReport] = useState<BacktestReport | null>(null)
  const [, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [createFormInitialData, setCreateFormInitialData] = useState<{ name: string; symbols: string } | null>(null)
  const [benchmark, setBenchmark] = useState<'SPY' | 'QQQ' | undefined>(undefined)

  const [advancedTab, setAdvancedTab] = useState<AdvancedTabType>(null)
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[] | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [optimizationError, setOptimizationError] = useState<string | null>(null)
  const [walkforwardResult, setWalkforwardResult] = useState<WalkForwardResult | null>(null)
  const [walkforwardLoading, setWalkforwardLoading] = useState(false)
  const [walkforwardError, setWalkforwardError] = useState<string | null>(null)
  const [walkforwardConfig, setWalkforwardConfig] = useState({
    trainPeriod: 60,
    testPeriod: 20,
    stepDays: 10,
  })
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null)
  const [monteCarloLoading, setMonteCarloLoading] = useState(false)
  const [monteCarloError, setMonteCarloError] = useState<string | null>(null)
  const [monteCarloConfig, setMonteCarloConfig] = useState({
    simulations: 1000,
  })

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/backtests/portfolio')
      if (!res.ok) throw new Error('Failed to load plans')
      const data = await res.json()
      setPlans(data.plans || [])
    } catch (error) {
      console.error('Failed to load plans:', error)
    }
  }

  const createPlan = async (formData: FormData) => {
    if (!formData.name || !formData.symbols) return

    const symbols = formData.symbols.split(',').map((s) => s.trim())
    const strategies: StrategyConfig[] = [{
      id: 'strategy-1',
      type: formData.strategy,
      parameters: getStrategyParameters(formData.strategy, formData.strategyParams),
    }]

    try {
      const res = await fetch('/api/backtests/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          symbols,
          initialCapital: parseFloat(formData.initialCapital),
          strategies,
          rebalance: formData.rebalance as 'daily' | 'weekly' | 'monthly' | 'none',
          rebalanceThreshold: parseFloat(formData.rebalanceThreshold) / 100,
          startDate: formData.startDate,
          endDate: formData.endDate,
        }),
      })

      if (!res.ok) throw new Error('Failed to create plan')
      await loadPlans()
      setShowCreateForm(false)
      setCreateFormInitialData(null)
    } catch (error) {
      console.error('Failed to create plan:', error)
    }
  }

  const getStrategyParameters = (strategy: string, params: StrategyParams): Record<string, number> => {
    const base = { shortWindow: 10, longWindow: 30, positionSize: 1.0 }

    switch (strategy) {
      case 'rsi':
        return {
          ...base,
          rsiPeriod: params.rsiPeriod,
          rsiOverbought: params.rsiOverbought,
          rsiOversold: params.rsiOversold,
        }
      case 'macd':
        return {
          ...base,
          macdFast: params.macdFast,
          macdSlow: params.macdSlow,
          macdSignal: params.macdSignal,
        }
      case 'bollinger':
        return {
          ...base,
          bollingerPeriod: params.bollingerPeriod,
          bollingerStdDev: params.bollingerStdDev,
        }
      default:
        return base
    }
  }

  const executeBacktest = async (planId: string) => {
    setExecuting(true)
    try {
      const res = await fetch(`/api/backtests/portfolio/${planId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benchmark }),
      })

      if (!res.ok) throw new Error('Failed to execute backtest')
      const data = await res.json()
      setReport(data)
      await loadPlans()
    } catch (error) {
      console.error('Failed to execute backtest:', error)
    } finally {
      setExecuting(false)
    }
  }

  const runOptimization = async (searchParams: { paramName: string; start: number; end: number; step: number }[], metric: string = 'sharpeRatio') => {
    if (!selectedPlan) return
    setOptimizing(true)
    setOptimizationError(null)
    try {
      const res = await fetch(`/api/backtests/portfolio/${selectedPlan.id}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchParams, metric }),
      })
      if (!res.ok) throw new Error('优化失败')
      const data = await res.json()
      setOptimizationResults(data.results || [])
    } catch (error) {
      setOptimizationError(error instanceof Error ? error.message : '优化失败')
    } finally {
      setOptimizing(false)
    }
  }

  const runWalkForward = async () => {
    if (!selectedPlan) return
    setWalkforwardLoading(true)
    setWalkforwardError(null)
    try {
      const res = await fetch(`/api/backtests/portfolio/${selectedPlan.id}/walkforward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walkforwardConfig),
      })
      if (!res.ok) throw new Error('向前验证失败')
      const data = await res.json()
      setWalkforwardResult(data)
    } catch (error) {
      setWalkforwardError(error instanceof Error ? error.message : '向前验证失败')
    } finally {
      setWalkforwardLoading(false)
    }
  }

  const runMonteCarlo = async () => {
    if (!selectedPlan) return
    setMonteCarloLoading(true)
    setMonteCarloError(null)
    try {
      const res = await fetch(`/api/backtests/portfolio/${selectedPlan.id}/montecarlo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(monteCarloConfig),
      })
      if (!res.ok) throw new Error('蒙特卡洛模拟失败')
      const data = await res.json()
      setMonteCarloResult(data)
    } catch (error) {
      setMonteCarloError(error instanceof Error ? error.message : '蒙特卡洛模拟失败')
    } finally {
      setMonteCarloLoading(false)
    }
  }

  const applyBestParams = () => {
    if (optimizationResults && optimizationResults.length > 0) {
      const _best = optimizationResults[0]
      void _best
    }
  }

  const loadReport = async (planId: string) => {
    try {
      const res = await fetch(`/api/backtests/portfolio/${planId}/report`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      setReport(data)
    } catch (error) {
      console.error('Failed to load report:', error)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [])

  useEffect(() => {
    if (!selectedPlan && plans.length > 0) {
      const completed = plans.find((p) => p.status === 'completed')
      const pending = plans.find((p) => p.status === 'pending')
      setSelectedPlan(completed || pending || plans[0])
    }
  }, [plans, selectedPlan])

  useEffect(() => {
    if (selectedPlan?.status === 'completed') {
      loadReport(selectedPlan.id)
    } else {
      setReport(null)
    }
  }, [selectedPlan])

  const handleShowCreateForm = (initialData?: { name: string; symbols: string }) => {
    if (initialData) {
      setCreateFormInitialData(initialData)
    }
    setShowCreateForm(true)
  }

  const handleCreateFormSubmit = (data: FormData) => {
    createPlan(data)
  }

  const handleCloseCreateForm = () => {
    setShowCreateForm(false)
    setCreateFormInitialData(null)
  }

  return (
    <div className="space-y-6">
      <CreateForm
        visible={showCreateForm}
        onClose={handleCloseCreateForm}
        onSubmit={handleCreateFormSubmit}
        initialData={createFormInitialData}
      />

      <div className="flex items-center gap-4 p-3 rounded-lg border bg-card">
        <span className="text-sm text-muted-foreground">基准对比:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setBenchmark(undefined)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              benchmark === undefined
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            无
          </button>
          <button
            onClick={() => setBenchmark('SPY')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              benchmark === 'SPY'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            SPY (标普500)
          </button>
          <button
            onClick={() => setBenchmark('QQQ')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              benchmark === 'QQQ'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            QQQ (纳斯达克100)
          </button>
        </div>
      </div>

      <PlanList
        plans={plans}
        selectedPlan={selectedPlan}
        onSelectPlan={setSelectedPlan}
        onExecuteBacktest={executeBacktest}
        onLoadPlans={loadPlans}
        executing={executing}
        onShowCreateForm={handleShowCreateForm}
      />

      {selectedPlan && (
        <div className="space-y-4">
          <ReportPanel
            selectedPlan={selectedPlan}
            report={report}
            executing={executing}
            onExecuteBacktest={executeBacktest}
          />

          <AdvancedPanel
            selectedPlan={selectedPlan}
            advancedTab={advancedTab}
            onTabChange={setAdvancedTab}
            optimizationResults={optimizationResults}
            optimizing={optimizing}
            optimizationError={optimizationError}
            onRunOptimization={runOptimization}
            onApplyBestParams={applyBestParams}
            walkforwardResult={walkforwardResult}
            walkforwardLoading={walkforwardLoading}
            walkforwardError={walkforwardError}
            walkforwardConfig={walkforwardConfig}
            onWalkforwardConfigChange={setWalkforwardConfig}
            onRunWalkForward={runWalkForward}
            monteCarloResult={monteCarloResult}
            monteCarloLoading={monteCarloLoading}
            monteCarloError={monteCarloError}
            monteCarloConfig={monteCarloConfig}
            onMonteCarloConfigChange={setMonteCarloConfig}
            onRunMonteCarlo={runMonteCarlo}
          />
        </div>
      )}
    </div>
  )
}
