'use client'

import { useState } from 'react'
import { FactorScreener } from '@/components/analysis/FactorScreener'
import { BacktestRunner } from '@/components/analysis/BacktestRunner'
import { PortfolioBacktestRunner } from '@/components/analysis/PortfolioBacktestRunner'
import { AlertManager } from '@/components/analysis/AlertManager'
import { PortfolioDashboard } from '@/components/analysis/PortfolioDashboard'
import { ConceptTooltip } from '@/components/ui/concept-tooltip'

type Tab = 'screener' | 'backtest' | 'portfolio-backtest' | 'alerts' | 'portfolio'

const TAB_TITLES: Record<Tab, { title: string; description: string }> = {
  screener: { title: '因子选股', description: '通过量化因子筛选符合条件股票的方法' },
  backtest: { title: '单股回测', description: '在历史数据上模拟策略表现' },
  'portfolio-backtest': { title: '组合回测', description: '多股票组合的策略回测与资产配置' },
  alerts: { title: '实时监控', description: '设置价格预警，实时追踪' },
  portfolio: { title: '组合分析', description: '管理投资组合，跟踪持仓' },
}

const TAB_DETAILS: Record<Tab, { description: string; example: string }> = {
  screener: {
    description: '因子选股是通过预设的量化因子（如市盈率、市净率、ROE等）筛选符合条件的股票的方法。',
    example: '选择低PE、高ROE、小市值的股票构建投资组合，长期持有获取超额收益。'
  },
  backtest: {
    description: '单股回测是在历史数据上模拟交易策略的表现，评估策略的有效性和风险特征。',
    example: '在AAPL 2020-2023年数据上测试MA均线策略，观察总收益、最大回撤等指标。'
  },
  'portfolio-backtest': {
    description: '组合回测是对多股票组合进行策略回测，支持资产配置优化和定期再平衡。',
    example: '同时回测AAPL、MSFT、GOOGL三只股票，每月再平衡，目标等权重配置。'
  },
  alerts: {
    description: '实时监控允许设置价格预警条件，当条件触发时通过WebSocket实时通知。',
    example: '设置AAPL价格高于$150或日涨幅超过5%时发送预警通知。'
  },
  portfolio: {
    description: '组合分析帮助管理投资组合，跟踪持仓表现、计算收益风险指标。',
    example: '创建"科技股组合"，添加AAPL、MSFT等持仓，实时监控组合总市值和盈亏。'
  }
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
            <ConceptTooltip
              key={tab.id}
              concept={tab.id}
              title={TAB_TITLES[tab.id].title}
              description={TAB_DETAILS[tab.id].description}
              example={TAB_DETAILS[tab.id].example}
            >
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            </ConceptTooltip>
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