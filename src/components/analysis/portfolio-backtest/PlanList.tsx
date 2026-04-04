'use client'

import { BacktestPlan, PRESET_PORTFOLIOS } from './types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PlanListProps {
  plans: BacktestPlan[]
  selectedPlan: BacktestPlan | null
  onSelectPlan: (plan: BacktestPlan) => void
  onExecuteBacktest: (planId: string) => void
  onLoadPlans: () => void
  executing: boolean
  onShowCreateForm: (initialData?: { name: string; symbols: string }) => void
}

export function PlanList({
  plans,
  selectedPlan,
  onSelectPlan,
  onExecuteBacktest,
  onLoadPlans,
  executing,
  onShowCreateForm,
}: PlanListProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="outline" onClick={onLoadPlans}>
          刷新列表
        </Button>
        <Button onClick={() => onShowCreateForm()}>
          新建组合回测
        </Button>
      </div>

      {plans.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">回测计划</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPlan?.id === plan.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => onSelectPlan(plan)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {plan.symbols.join(', ')} · {plan.startDate} 至 {plan.endDate}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        plan.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : plan.status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {plan.status === 'completed' ? '已完成' : plan.status === 'running' ? '运行中' : '待执行'}
                      </span>
                      {plan.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onExecuteBacktest(plan.id)
                          }}
                          disabled={executing}
                        >
                          {executing ? '执行中...' : '执行'}
                        </Button>
                      )}
                    </div>
                  </div>
                  {plan.status === 'completed' && plan.metrics.portfolioReturn !== null && (
                    <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t">
                      <div>
                        <div className="text-xs text-muted-foreground">总收益</div>
                        <div className={`font-medium ${plan.metrics.portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {plan.metrics.portfolioReturn >= 0 ? '+' : ''}{plan.metrics.portfolioReturn.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">夏普比率</div>
                        <div className="font-medium">{plan.metrics.portfolioSharpe?.toFixed(2) || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">最大回撤</div>
                        <div className="font-medium text-red-600">{plan.metrics.portfolioMaxDrawdown?.toFixed(2) || '-'}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">波动率</div>
                        <div className="font-medium">{plan.metrics.portfolioVolatility?.toFixed(2) || '-'}%</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="mb-4">还没有回测计划</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {PRESET_PORTFOLIOS.slice(0, 2).map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    onClick={() => onShowCreateForm({ name: p.name, symbols: p.symbols.join(',') })}
                  >
                    创建「{p.name}」演示
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
