'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, TrendingUp, Clock, BarChart3 } from 'lucide-react'
import { IcChart } from './IcChart'
import { IcDecayChart } from './IcDecayChart'
import { GroupReturnChart } from './GroupReturnChart'

interface FactorEffectiveness {
  factorId: string
  name: string
  ic: {
    current: number
    history: { date: string; ic: number }[]
    mean: number
    std: number
  }
  icIr: number
  groupReturns: { group: number; return: number }[]
  decayTest: { ic_1d: number; ic_5d: number; ic_20d: number }
}

interface FactorEffectivenessPanelProps {
  factors: FactorEffectiveness[]
  loading?: boolean
}

function getIcIrColor(icIr: number): string {
  if (icIr > 0.5) return 'bg-green-500'
  if (icIr >= 0.2) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getIcIrTextColor(icIr: number): string {
  if (icIr > 0.5) return 'text-green-600'
  if (icIr >= 0.2) return 'text-yellow-600'
  return 'text-red-600'
}

function getIcIrLabel(icIr: number): string {
  if (icIr > 0.5) return '强'
  if (icIr >= 0.2) return '中'
  return '弱'
}

export function FactorEffectivenessPanel({
  factors,
  loading,
}: FactorEffectivenessPanelProps) {
  const [selectedFactor, setSelectedFactor] = useState<FactorEffectiveness | null>(
    factors.length > 0 ? factors[0] : null
  )
  const [activeTab, setActiveTab] = useState('ic')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">加载因子有效性分析...</span>
      </div>
    )
  }

  if (factors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无因子有效性数据
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">因子列表</h3>
          {factors.map((factor) => (
            <Card
              key={factor.factorId}
              className={`cursor-pointer transition-all ${
                selectedFactor?.factorId === factor.factorId
                  ? 'ring-2 ring-primary'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedFactor(factor)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{factor.name}</span>
                  <Badge
                    variant="outline"
                    className={getIcIrTextColor(factor.icIr)}
                  >
                    IR {factor.icIr.toFixed(2)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getIcIrColor(factor.icIr)}`}
                        style={{ width: `${Math.min(factor.icIr * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8">
                      {getIcIrLabel(factor.icIr)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">IC:</span>
                      <span className={factor.ic.current > 0 ? 'text-green-600' : 'text-red-600'}>
                        {factor.ic.current.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">均值:</span>
                      <span>{factor.ic.mean.toFixed(3)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">标准差:</span>
                      <span>{factor.ic.std.toFixed(3)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">样本:</span>
                      <span>{factor.ic.history.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedFactor ? (
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{selectedFactor.name}</CardTitle>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="h-8">
                      <TabsTrigger value="ic" className="text-xs px-2">
                        IC走势
                      </TabsTrigger>
                      <TabsTrigger value="decay" className="text-xs px-2">
                        IC衰减
                      </TabsTrigger>
                      <TabsTrigger value="group" className="text-xs px-2">
                        分组收益
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {activeTab === 'ic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">当前IC</div>
                        <div className={`text-lg font-semibold ${
                          selectedFactor.ic.current > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {selectedFactor.ic.current.toFixed(3)}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">IC均值</div>
                        <div className="text-lg font-semibold">
                          {selectedFactor.ic.mean.toFixed(3)}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">IC标准差</div>
                        <div className="text-lg font-semibold">
                          {selectedFactor.ic.std.toFixed(3)}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">IC/IR</div>
                        <div className={`text-lg font-semibold ${getIcIrTextColor(selectedFactor.icIr)}`}>
                          {selectedFactor.icIr.toFixed(3)}
                        </div>
                      </div>
                    </div>
                    <IcChart data={selectedFactor.ic.history} />
                  </div>
                )}

                {activeTab === 'decay' && (
                  <IcDecayChart
                    decayData={[
                      { lag: 1, ic: selectedFactor.decayTest.ic_1d },
                      { lag: 5, ic: selectedFactor.decayTest.ic_5d },
                      { lag: 20, ic: selectedFactor.decayTest.ic_20d },
                    ]}
                  />
                )}

                {activeTab === 'group' && (
                  <GroupReturnChart groupReturns={selectedFactor.groupReturns} />
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              选择一个因子查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
