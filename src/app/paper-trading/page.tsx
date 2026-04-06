'use client'

import PaperTradingDashboard from '@/components/trading/PaperTradingDashboard'

export default function PaperTradingPage() {
  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-medium">
          学习模式
        </span>
        <h1 className="text-2xl font-bold">模拟交易</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        模拟交易让您可以在真实市场环境中练习交易策略，无需承担真实风险。使用模拟账户测试您的投资决策。
      </p>
      <PaperTradingDashboard />
    </div>
  )
}
