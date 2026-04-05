'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Brain,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  Target,
  BarChart3,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrainResponse } from '@/app/api/ml/train/route'

interface MLModelTrainerProps {
  onModelTrained?: (modelVersion: string) => void
  className?: string
}

const POPULAR_SYMBOLS = [
  'AAPL',
  'MSFT',
  'GOOGL',
  'AMZN',
  'TSLA',
  'META',
  'NVDA',
  'JPM',
  'JNJ',
  'V',
  'WMT',
  'PG',
  'UNH',
  'HD',
  'MA',
  'BAC',
  'ABBV',
  'PFE',
  'KO',
  'PEP',
]

export function MLModelTrainer({ onModelTrained, className }: MLModelTrainerProps) {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([])
  const [customSymbol, setCustomSymbol] = useState('')
  const [isTraining, setIsTraining] = useState(false)
  const [trainingResult, setTrainingResult] = useState<TrainResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    )
  }

  const addCustomSymbol = () => {
    const symbol = customSymbol.trim().toUpperCase()
    if (symbol && !selectedSymbols.includes(symbol) && selectedSymbols.length < 10) {
      setSelectedSymbols((prev) => [...prev, symbol])
      setCustomSymbol('')
    }
  }

  const removeSymbol = (symbol: string) => {
    setSelectedSymbols((prev) => prev.filter((s) => s !== symbol))
  }

  const startTraining = async () => {
    if (selectedSymbols.length === 0) return

    setIsTraining(true)
    setError(null)
    setTrainingResult(null)
    setProgress(10)

    try {
      const response = await fetch('/api/ml/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: selectedSymbols,
        }),
      })

      setProgress(50)

      const result: TrainResponse = await response.json()

      setProgress(100)

      if (result.success) {
        setTrainingResult(result)
        onModelTrained?.(result.modelVersion)
      } else {
        setError(result.error || '训练失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '训练请求失败')
    } finally {
      setIsTraining(false)
    }
  }

  const reset = () => {
    setSelectedSymbols([])
    setTrainingResult(null)
    setError(null)
    setProgress(0)
  }

  return (
    <Dialog>
      <DialogTrigger>
        <Button
          variant="outline"
          className={cn('gap-2', className)}
          disabled={isTraining}
        >
          {isTraining ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
          训练ML模型
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            训练LSTM价格预测模型
          </DialogTitle>
          <DialogDescription>
            选择训练数据，模型将学习历史价格模式以预测未来方向
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!trainingResult && !isTraining && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    选择训练股票 ({selectedSymbols.length}/10)
                  </label>
                  {selectedSymbols.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={reset}>
                      清除
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedSymbols.map((symbol) => (
                    <Badge
                      key={symbol}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeSymbol(symbol)}
                    >
                      {symbol} ×
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="输入股票代码 (如: AAPL)"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomSymbol()}
                    className="flex-1"
                  />
                  <Button
                    variant="secondary"
                    onClick={addCustomSymbol}
                    disabled={!customSymbol.trim() || selectedSymbols.length >= 10}
                  >
                    添加
                  </Button>
                </div>

                <div className="pt-2">
                  <label className="text-xs text-muted-foreground mb-2 block">
                    热门股票
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SYMBOLS.map((symbol) => (
                      <Badge
                        key={symbol}
                        variant={
                          selectedSymbols.includes(symbol) ? 'default' : 'outline'
                        }
                        className={cn(
                          'cursor-pointer',
                          selectedSymbols.includes(symbol)
                            ? 'bg-primary'
                            : 'hover:bg-muted'
                        )}
                        onClick={() => toggleSymbol(symbol)}
                      >
                        {symbol}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-3 rounded">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  训练使用过去2年的历史数据。建议选择3-10只不同行业的股票以获得更好的泛化能力。
                  训练过程约需10-30秒。
                </span>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button
                onClick={startTraining}
                disabled={selectedSymbols.length === 0}
                className="w-full gap-2"
              >
                <Play className="w-4 h-4" />
                开始训练
              </Button>
            </>
          )}

          {isTraining && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-muted flex items-center justify-center">
                    <Brain className="w-8 h-8 text-purple-500 animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-medium">正在训练模型...</p>
                  <p className="text-sm text-muted-foreground">
                    使用 {selectedSymbols.length} 只股票的历史数据
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Progress value={progress} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>数据准备</span>
                  <span>模型训练</span>
                  <span>完成</span>
                </div>
              </div>
            </div>
          )}

          {trainingResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="w-8 h-8" />
                <div>
                  <p className="font-semibold">训练成功！</p>
                  <p className="text-sm text-muted-foreground">
                    模型版本: {trainingResult.modelVersion.slice(0, 20)}...
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">准确率</span>
                    </div>
                    <div className="text-2xl font-semibold">
                      {(trainingResult.metrics.accuracy * 100).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">验证准确率</span>
                    </div>
                    <div className="text-2xl font-semibold">
                      {(trainingResult.metrics.valAccuracy * 100).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">样本数</span>
                    </div>
                    <div className="text-2xl font-semibold">
                      {trainingResult.sampleCount.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">训练股票</span>
                    </div>
                    <div className="text-sm font-medium">
                      {trainingResult.trainedOn.join(', ')}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                模型已保存并可用于选股分析。建议定期重新训练以保持预测准确性。
              </div>

              <Button onClick={reset} variant="outline" className="w-full">
                训练新模型
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
