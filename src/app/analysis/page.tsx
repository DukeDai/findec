'use client'

import { useState } from 'react'
import { FactorScreener } from '@/components/analysis/FactorScreener'
import { BacktestRunner } from '@/components/analysis/BacktestRunner'
import { AlertManager } from '@/components/analysis/AlertManager'
import { PortfolioDashboard } from '@/components/analysis/PortfolioDashboard'

type Tab = 'screener' | 'backtest' | 'alerts' | 'portfolio'

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<Tab>('screener')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'screener', label: '因子选股' },
    { id: 'backtest', label: '回测系统' },
    { id: 'alerts', label: '实时监控' },
    { id: 'portfolio', label: '组合分析' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">量化分析平台</h1>
          <p className="text-muted-foreground">因子选股 · 回测系统 · 实时监控 · 组合分析</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
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
          {activeTab === 'screener' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">因子选股</h2>
              <p className="text-sm text-muted-foreground mb-4">
                根据预设的因子条件和规则筛选符合条件的股票
              </p>
              <FactorScreener />
            </div>
          )}

          {activeTab === 'backtest' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">回测系统</h2>
              <p className="text-sm text-muted-foreground mb-4">
                使用历史数据回测交易策略，评估策略绩效
              </p>
              <BacktestRunner />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">实时监控</h2>
              <p className="text-sm text-muted-foreground mb-4">
                设置价格预警，实时监控股票价格变化
              </p>
              <AlertManager />
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">组合分析</h2>
              <p className="text-sm text-muted-foreground mb-4">
                管理投资组合，跟踪持仓绩效和资产配置
              </p>
              <PortfolioDashboard />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}