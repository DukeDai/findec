'use client'

import { useState } from 'react'
import { FactorScreener } from '@/components/analysis/FactorScreener'
import { BacktestRunner } from '@/components/analysis/BacktestRunner'
import { PortfolioBacktestRunner } from '@/components/analysis/PortfolioBacktestRunner'
import { AlertManager } from '@/components/analysis/AlertManager'
import { PortfolioDashboard } from '@/components/analysis/PortfolioDashboard'

type Tab = 'screener' | 'backtest' | 'portfolio-backtest' | 'alerts' | 'portfolio'

const TAB_TITLES: Record<Tab, { title: string; description: string }> = {
  screener: { title: '因子选股', description: '根据预设的因子条件和规则筛选符合条件的股票' },
  backtest: { title: '单股回测', description: '使用历史数据回测单个股票的策略，评估策略绩效' },
  'portfolio-backtest': { title: '组合回测', description: '回测多股票组合策略，支持资产配置和再平衡' },
  alerts: { title: '实时监控', description: '设置价格预警，实时监控股票价格变化' },
  portfolio: { title: '组合分析', description: '管理投资组合，跟踪持仓绩效和资产配置' },
}

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<Tab>('screener')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'screener', label: '因子选股' },
    { id: 'backtest', label: '单股回测' },
    { id: 'portfolio-backtest', label: '组合回测' },
    { id: 'alerts', label: '实时监控' },
    { id: 'portfolio', label: '组合分析' },
  ]

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">量化分析</h1>
          <p className="text-sm text-muted-foreground mt-1">
            因子选股 · 回测系统 · 实时监控 · 组合分析
          </p>
        </div>

        <div className="flex gap-1 border-b mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-2">{TAB_TITLES[activeTab].title}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {TAB_TITLES[activeTab].description}
          </p>

          {activeTab === 'screener' && <FactorScreener />}
          {activeTab === 'backtest' && <BacktestRunner />}
          {activeTab === 'portfolio-backtest' && <PortfolioBacktestRunner />}
          {activeTab === 'alerts' && <AlertManager />}
          {activeTab === 'portfolio' && <PortfolioDashboard />}
        </div>
      </main>
    </div>
  )
}