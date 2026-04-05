# FinDec Phase 6 + 维护完善路线图

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement plan task-by-task.
>
> **排除范围:** 不包含社区功能、移动端适配、用户认证系统。

**Goal:** 完成 Phase 6 学习体验深化 + 全面维护完善（测试/文档/代码质量），使项目达到生产级可维护状态。

**Architecture:** Phase 6 分 3 个模块并行推进（学习增强、高级分析、工具优化），维护工作贯穿所有阶段。

**排除功能:**
- ❌ 社区/分享功能
- ❌ 移动端适配
- ❌ 用户认证/权限系统

---

## 阶段 A: 学习体验深化

### A1: 交互式学习路径引导

**目标:** 新用户首次访问时，展示量化学习路径图，逐步引导探索功能。

**Files:**
- Create: `src/app/onboarding/page.tsx`
- Create: `src/components/learning/OnboardingFlow.tsx`
- Create: `src/components/learning/LearningPath.tsx`
- Modify: `src/app/layout.tsx` — 首次访问检测 + 重定向

**Step 1: 创建学习路径数据**

```typescript
// src/lib/learning/path.ts
export interface LearningStep {
  id: string
  title: string
  description: string
  icon: string
  targetPage: string
  estimatedMinutes: number
  prerequisites: string[]
}

export const LEARNING_PATH: LearningStep[] = [
  {
    id: 'kline-basics',
    title: 'K线图基础',
    description: '理解K线图的基本构成：开盘价、收盘价、最高价、最低价',
    icon: '📊',
    targetPage: '/',
    estimatedMinutes: 5,
    prerequisites: [],
  },
  {
    id: 'technical-indicators',
    title: '技术指标',
    description: '学习均线(MA)、RSI、MACD等常见技术指标的含义和应用',
    icon: '📈',
    targetPage: '/',
    estimatedMinutes: 10,
    prerequisites: ['kline-basics'],
  },
  {
    id: 'backtest-intro',
    title: '回测入门',
    description: '理解什么是回测，为何重要，以及常见回测陷阱',
    icon: '🧪',
    targetPage: '/education/backtest-pitfalls',
    estimatedMinutes: 15,
    prerequisites: ['technical-indicators'],
  },
  {
    id: 'factor-screening',
    title: '因子选股',
    description: '学习使用多因子筛选股票，理解因子有效性和相关性',
    icon: '🔍',
    targetPage: '/analysis',
    estimatedMinutes: 20,
    prerequisites: ['backtest-intro'],
  },
  {
    id: 'portfolio-management',
    title: '组合管理',
    description: '学习构建和管理投资组合，理解风险分散',
    icon: '💼',
    targetPage: '/analysis',
    estimatedMinutes: 15,
    prerequisites: ['factor-screening'],
  },
]
```

**Step 2: 创建引导流程组件**

```typescript
// src/components/learning/OnboardingFlow.tsx
"use client"

import { useState } from 'react'
import { LEARNING_PATH, type LearningStep } from '@/lib/learning/path'

interface OnboardingFlowProps {
  onComplete: () => void
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const step = LEARNING_PATH[currentStep]

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card border rounded-xl p-8 max-w-lg w-full shadow-xl">
        <div className="text-4xl mb-4">{step.icon}</div>
        <h2 className="text-xl font-bold mb-2">{step.title}</h2>
        <p className="text-muted-foreground mb-6">{step.description}</p>
        <div className="text-sm text-muted-foreground mb-4">
          预计阅读时间: {step.estimatedMinutes} 分钟
        </div>
        <div className="flex justify-between">
          {currentStep > 0 && (
            <Button variant="outline" onClick={() => setCurrentStep(s => s - 1)}>
              上一步
            </Button>
          )}
          <Button
            onClick={() => {
              if (currentStep < LEARNING_PATH.length - 1) {
                setCurrentStep(s => s + 1)
              } else {
                onComplete()
              }
            }}
          >
            {currentStep < LEARNING_PATH.length - 1 ? '下一步' : '开始探索'}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: 创建学习路径页面**

```typescript
// src/app/onboarding/page.tsx
"use client"

import { OnboardingFlow } from '@/components/learning/OnboardingFlow'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const hasSeen = localStorage.getItem('onboarding_completed')
    if (hasSeen) {
      router.push('/')
    }
  }, [router])

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true')
    router.push('/')
  }

  return <OnboardingFlow onComplete={handleComplete} />
}
```

**Step 4: 在 layout 中添加首次访问检测**

在 `src/app/layout.tsx` 中添加: 首次访问检测，未完成引导则显示引导页面。

**Step 5: 提交**

```bash
git add src/app/onboarding/ src/components/learning/ src/lib/learning/path.ts
git commit -m "feat(learning): 交互式学习路径引导系统"
```

---

### A2: 回测可靠性评估工具

**目标:** 对用户回测结果进行可靠性评分，给出风险提示（如样本量不足、过拟合风险等）。

**Files:**
- Create: `src/lib/backtest/reliability-scorer.ts`
- Create: `src/app/api/backtests/reliability/route.ts`
- Create: `src/components/analysis/BacktestReliabilityPanel.tsx`
- Modify: `src/components/analysis/BacktestRunner.tsx` — 集成可靠性评分

**Step 1: 创建可靠性评分器**

```typescript
// src/lib/backtest/reliability-scorer.ts
export interface ReliabilityScore {
  total: number                    // 0-100
  sampleSize: number              // 样本量评分
  overfittingRisk: number         // 过拟合风险评分
  dataQuality: number             // 数据质量评分
  stability: number               // 稳定性评分
  issues: ReliabilityIssue[]
  suggestions: string[]
}

export interface ReliabilityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical'
  code: string
  message: string
}

export function calculateReliability(
  trades: BacktestTrade[],
  equityCurve: EquityPoint[],
  config: BacktestConfig
): ReliabilityScore {
  const issues: ReliabilityIssue[] = []
  const suggestions: string[] = []

  // 1. 样本量评估
  const sampleSize = trades.length
  let sampleSizeScore = 100
  if (sampleSize < 10) {
    sampleSizeScore = 10
    issues.push({ severity: 'critical', code: 'LOW_TRADE_COUNT', message: `仅 ${sampleSize} 笔交易，样本量严重不足` })
    suggestions.push('增加回测时间范围或选择交易更频繁的策略')
  } else if (sampleSize < 30) {
    sampleSizeScore = 40
    issues.push({ severity: 'high', code: 'FEW_TRADES', message: `仅 ${sampleSize} 笔交易，统计显著性不足` })
  } else if (sampleSize < 100) {
    sampleSizeScore = 70
    issues.push({ severity: 'medium', code: 'MODERATE_TRADES', message: `${sampleSize} 笔交易，样本量偏少` })
  }

  // 2. 过拟合风险评估
  let overfittingScore = 100
  const paramCount = Object.keys(config.parameters || {}).length
  const years = getYears(equityCurve)
  if (paramCount > 5) {
    overfittingScore -= 30
    issues.push({ severity: 'high', code: 'MANY_PARAMS', message: `${paramCount} 个优化参数，过拟合风险较高` })
    suggestions.push('使用 Walk-Forward 分析验证参数稳健性')
  }
  // 策略复杂度 vs 样本量
  const complexityRatio = paramCount / Math.max(sampleSize, 1)
  if (complexityRatio > 0.05) {
    overfittingScore -= 20
    issues.push({ severity: 'medium', code: 'HIGH_COMPLEXITY', message: '参数数量相对于交易次数偏多' })
  }

  // 3. 数据质量评估
  let dataQualityScore = 100
  const dateRange = equityCurve.length
  if (dateRange < 252) {
    dataQualityScore -= 30
    issues.push({ severity: 'medium', code: 'SHORT_HISTORY', message: `仅 ${dateRange} 个交易日，少于1年` })
  }
  const missingData = detectMissingData(equityCurve)
  if (missingData > 0.05) {
    dataQualityScore -= 20
    issues.push({ severity: 'high', code: 'DATA_GAPS', message: '检测到数据缺口，可能影响结果准确性' })
  }

  // 4. 稳定性评估
  let stabilityScore = 100
  const returns = calculateReturns(equityCurve)
  const consecutiveLosses = countConsecutiveNegative(returns)
  if (consecutiveLosses > 10) {
    stabilityScore -= 20
    issues.push({ severity: 'medium', code: 'LONG_LOSS_STREAK', message: `最长连续亏损 ${consecutiveLosses} 天` })
  }
  // 收益分布
  const skewness = calculateSkewness(returns)
  if (Math.abs(skewness) > 2) {
    stabilityScore -= 15
    issues.push({ severity: 'low', code: 'EXTREME_SKEWNESS', message: '收益分布极度不对称' })
  }

  const total = Math.round(
    (sampleSizeScore * 0.3) +
    (overfittingScore * 0.3) +
    (dataQualityScore * 0.2) +
    (stabilityScore * 0.2)
  )

  return { total, sampleSize: sampleSizeScore, overfittingRisk: overfittingScore, dataQuality: dataQualityScore, stability: stabilityScore, issues, suggestions }
}
```

**Step 2: 创建 API 路由**

```typescript
// src/app/api/backtests/reliability/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { calculateReliability } from '@/lib/backtest/reliability-scorer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trades, equityCurve, config } = body
    const score = calculateReliability(trades, equityCurve, config)
    return NextResponse.json(score)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate reliability' }, { status: 500 })
  }
}
```

**Step 3: 创建可靠性评分面板 UI**

在 `src/components/analysis/BacktestReliabilityPanel.tsx` 中创建：圆环进度显示总分、4 个维度柱状图、问题列表（按严重程度颜色编码）、改善建议。

**Step 4: 集成到回测报告**

在 `BacktestRunner.tsx` 的结果展示区域，添加"可靠性评估"Tab。

**Step 5: 提交**

```bash
git add src/lib/backtest/reliability-scorer.ts src/app/api/backtests/reliability/
git add src/components/analysis/BacktestReliabilityPanel.tsx
git commit -m "feat(learning): 回测可靠性评估工具"
```

---

### A3: 参数敏感性分析可视化

**目标:** 展示参数变化对关键指标（收益/夏普/回撤）的影响，帮助用户理解参数稳健性。

**Files:**
- Create: `src/lib/backtest/sensitivity-analysis.ts`
- Create: `src/app/api/backtests/sensitivity/route.ts`
- Create: `src/components/analysis/SensitivityChart.tsx`
- Modify: `src/components/analysis/BacktestRunner.tsx` — 集成敏感性 Tab

**Step 1: 创建敏感性分析**

```typescript
// src/lib/backtest/sensitivity-analysis.ts
export interface SensitivityResult {
  parameter: string
  values: number[]
  metricValues: {
    metric: string
    values: number[]
  }[]
}

export async function runSensitivityAnalysis(
  config: BacktestConfig,
  targetParam: string,
  paramRange: number[],
  targetMetric: 'totalReturn' | 'sharpeRatio' | 'maxDrawdown'
): Promise<SensitivityResult> {
  const results: SensitivityResult = {
    parameter: targetParam,
    values: paramRange,
    metricValues: [{ metric: targetMetric, values: [] }],
  }

  for (const value of paramRange) {
    const testConfig = { ...config, parameters: { ...config.parameters, [targetParam]: value } }
    const backtestResult = await runBacktest(testConfig)
    const metricValue = backtestResult[targetMetric]
    results.metricValues[0].values.push(metricValue)
  }

  return results
}
```

**Step 2: 创建敏感性图表**

使用 Recharts 创建 3D 曲面图或热力图，展示两个参数同时变化时结果的变化。

**Step 3: 提交**

```bash
git add src/lib/backtest/sensitivity-analysis.ts src/app/api/backtests/sensitivity/
git add src/components/analysis/SensitivityChart.tsx
git commit -m "feat(analysis): 参数敏感性分析可视化"
```

---

## 阶段 B: 高级分析功能

### B1: 智能预警建议

**目标:** 根据股票历史波动率，自动推荐合理的预警参数（避免预警噪音）。

**Files:**
- Create: `src/lib/realtime/smart-alert-recommender.ts`
- Create: `src/app/api/alerts/recommend/route.ts`
- Modify: `src/components/analysis/AlertManager.tsx` — 添加"智能推荐"按钮

**Step 1: 创建智能推荐器**

```typescript
// src/lib/realtime/smart-alert-recommender.ts
export interface AlertRecommendation {
  priceChangeThreshold: number      // 建议价格变化幅度 %
  volumeSpikeThreshold: number      // 建议成交量放大倍数
  rsiOverbought: number
  rsiOversold: number
  atrMultiplier: number
  reasoning: string
}

export async function getAlertRecommendations(symbol: string): Promise<AlertRecommendation> {
  const history = await getHistoricalData(symbol, '3mo')
  const returns = calculateReturns(history)
  const volatility = calculateVolatility(returns)
  const avgVolume = calculateAvgVolume(history)

  // 价格变化: 1.5x 波动率
  const priceChangeThreshold = Math.max(volatility * 1.5, 2)

  // 成交量: 2x 平均
  const volumeSpikeThreshold = 2

  // RSI: 标准超买超卖
  const rsiOverbought = 70
  const rsiOversold = 30

  // ATR 乘数
  const atrMultiplier = 1.5

  return {
    priceChangeThreshold: Math.round(priceChangeThreshold * 10) / 10,
    volumeSpikeThreshold,
    rsiOverbought,
    rsiOversold,
    atrMultiplier,
    reasoning: `基于 ${symbol} 近3个月 ${(volatility * 100).toFixed(1)}% 的历史波动率自动计算`,
  }
}
```

**Step 2: 创建 API + 集成到 AlertManager**

**Step 3: 提交**

```bash
git add src/lib/realtime/smart-alert-recommender.ts src/app/api/alerts/recommend/
git commit -m "feat(alerts): 智能预警参数推荐"
```

---

### B2: 策略相似度搜索

**目标:** 基于用户当前持仓或偏好，从历史策略库中推荐相似策略。

**Files:**
- Create: `src/lib/strategies/similarity-search.ts`
- Create: `src/app/api/strategies/similar/route.ts`
- Modify: `src/components/strategy-editor/StrategyExplorer.tsx` — 添加相似策略 Tab

**Step 1: 创建相似度算法**

```typescript
// src/lib/strategies/similarity-search.ts
export function calculateStrategySimilarity(a: Strategy, b: Strategy): number {
  // 基于策略类型、参数范围、标的数量计算相似度
  let score = 0
  if (a.type === b.type) score += 0.3
  if (a.symbols.length === b.symbols.length) score += 0.2
  // 参数 Jaccard 相似度
  const paramsA = Object.keys(a.parameters)
  const paramsB = Object.keys(b.parameters)
  const intersection = paramsA.filter(p => paramsB.includes(p))
  const union = new Set([...paramsA, ...paramsB])
  const jaccard = intersection.length / union.size
  score += jaccard * 0.3
  // 时间范围重叠度
  const overlap = calculateDateOverlap(a.dateRange, b.dateRange)
  score += overlap * 0.2
  return score // 0-1
}
```

**Step 2: 创建 API + 集成 UI**

**Step 3: 提交**

```bash
git add src/lib/strategies/similarity-search.ts src/app/api/strategies/similar/
git commit -m "feat(strategies): 策略相似度搜索推荐"
```

---

## 阶段 C: 工具优化

### C1: API 文档生成

**目标:** 为所有 API 端点生成结构化文档，包含请求/响应示例。

**Files:**
- Create: `docs/api/API.md`
- Modify: `docs/plans/` — 更新文档索引

**Step 1: 编写 API 文档**

按模块编写：数据查询 API、因子 API、回测 API、组合 API、预警 API。

格式: 端点描述 + 请求参数表格 + 响应示例 JSON + 错误码说明。

**Step 2: 提交**

```bash
git add docs/api/API.md
git commit -m "docs: 添加 API 文档"
```

---

### C2: 开发者指南

**目标:** 编写开发者文档，包含本地开发、调试、测试运行指南。

**Files:**
- Create: `docs/DEVELOPER.md`
- Modify: `README.md` — 添加贡献指南链接

**Step 1: 编写开发者文档**

包含: 环境配置、数据源配置、本地开发调试、WebSocket 调试、测试运行、代码规范。

**Step 2: 提交**

```bash
git add docs/DEVELOPER.md
git commit -m "docs: 添加开发者指南"
```

---

### C3: 测试覆盖扩展

**目标:** 将关键模块的测试覆盖提升到 80%+，新增 E2E 测试。

**Files:**
- Create: `tests/e2e/` — Playwright E2E 测试
- Create: `src/lib/__tests__/screening-engine.test.ts`
- Create: `src/lib/__tests__/health-score.test.ts`
- Create: `src/lib/__tests__/cost-model.test.ts`
- Create: `src/lib/__tests__/factor-metrics.test.ts`
- Create: `src/lib/__tests__/position-manager.test.ts`
- Create: `src/lib/__tests__/reliability-scorer.test.ts`

**Step 1: 补充单元测试**

针对以下模块补充测试用例:
- `screening-engine.ts` — 筛选算法正确性
- `health-score.ts` — 健康评分边界情况
- `cost-model.ts` — 佣金/滑点计算
- `factor-metrics.ts` — IC/IR 计算
- `position-manager.ts` — 仓位管理逻辑

**Step 2: 添加 E2E 测试**

```typescript
// tests/e2e/p0-features.spec.ts
import { test, expect } from '@playwright/test'

test.describe('核心功能 E2E', () => {
  test('K线图加载', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="stock-chart"]', { timeout: 10000 })
  })

  test('回测执行完整流程', async ({ page }) => {
    await page.goto('/analysis')
    await page.click('text=回测运行器')
    await page.fill('[name="symbol"]', 'AAPL')
    await page.click('text=开始回测')
    await page.waitForSelector('[data-testid="backtest-result"]', { timeout: 30000 })
  })

  test('预警创建', async ({ page }) => {
    await page.goto('/analysis')
    await page.click('text=实时监控')
    await page.click('text=添加预警')
    await page.fill('[name="symbol"]', 'AAPL')
    await page.fill('[name="threshold"]', '200')
    await page.click('text=保存')
  })
})
```

**Step 3: 提交**

```bash
git add tests/e2e/ src/lib/__tests__/
git commit -m "test: 扩展测试覆盖，新增 E2E 测试"
```

---

### C4: 错误处理与边界情况完善

**目标:** 完善 API 路由和核心模块的错误处理，确保所有边界情况有明确反馈。

**Files:**
- Modify: `src/app/api/**/route.ts` — 统一错误响应格式
- Modify: `src/lib/backtest/engine.ts` — 边界情况处理

**Step 1: 统一错误响应格式**

创建错误工具函数:
```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
  }
  console.error('Unhandled API error:', error)
  return NextResponse.json({ error: '内部服务器错误' }, { status: 500 })
}
```

**Step 2: 检查并完善所有 API 路由的错误处理**

遍历 `src/app/api/` 所有 `route.ts`，确保:
- 所有 try-catch 使用 `handleApiError`
- 验证错误返回中文用户友好消息
- 无裸露的 `console.error`（改用结构化日志 `logger.error`）

**Step 3: 提交**

```bash
git add src/lib/errors.ts
# 修改所有受影响的 route.ts
git commit -m "refactor: 统一错误处理和响应格式"
```

---

### C5: 依赖更新与安全审计

**目标:** 更新 npm 依赖到最新兼容版本，运行安全审计。

**Files:**
- Modify: `package.json` — 更新依赖

**Step 1: 安全审计**

```bash
npm audit
```

**Step 2: 更新依赖**

```bash
# 检查可更新依赖
npm outdated
# 更新补丁版本
npm update
# 检查 Next.js 更新
npx npm-check-updates -u
```

**Step 3: 验证构建**

```bash
npm run build
```

**Step 4: 提交**

```bash
git add package.json package-lock.json
git commit -m "chore: 更新依赖并修复安全漏洞"
```

---

### C6: 性能优化

**目标:** 优化关键路径性能，减少首屏加载时间和 API 响应时间。

**Files:**
- Modify: `src/app/page.tsx` — 添加 Suspense + loading skeleton
- Modify: `src/components/chart/ChartContainer.tsx` — 懒加载图表
- Modify: `src/lib/data/cache-manager.ts` — 优化缓存查询

**Step 1: 添加 Suspense 边界**

在 `page.tsx` 和各 Tab 页面添加 `Suspense` + `loading.tsx` skeleton。

**Step 2: 图表懒加载**

将 ChartContainer 的初始化逻辑改为 `dynamic import`，减少首屏 JS bundle。

**Step 3: 缓存查询优化**

在 `cache-manager.ts` 中添加索引优化查询性能。

**Step 4: 验证 Lighthouse 分数**

运行 `npx lighthouse http://localhost:3000 --output=json` 确认性能分数提升。

**Step 5: 提交**

```bash
git add src/app/page.tsx src/components/chart/ChartContainer.tsx src/lib/data/cache-manager.ts
git commit -m "perf: 添加 Suspense 边界和图表懒加载优化"
```

---

### C7: README 和文档全面更新

**目标:** 更新 README.md 和 feature-summary.md，反映 Phase 6 完成的功能。

**Files:**
- Modify: `README.md` — 添加 Phase 6 功能 + 贡献指南
- Modify: `docs/feature-summary.md` — 添加 Phase 6 模块
- Modify: `docs/plans/2026-04-05-roadmap.md` — 添加 Phase 6 章节

**Step 1: 更新 README.md**

在功能特性部分添加 Phase 6 功能（学习路径引导、回测可靠性评估、参数敏感性分析等）。

**Step 2: 更新 feature-summary.md**

在已实现功能列表中添加 Phase 6 三大模块。

**Step 3: 更新 roadmap.md**

添加 Phase 6 章节，标注完成状态。

**Step 4: 提交**

```bash
git add README.md docs/feature-summary.md docs/plans/2026-04-05-roadmap.md
git commit -m "docs: 更新 README 和文档反映 Phase 6"
```

---

## 执行顺序

```
阶段 A (学习深化) ←→ 阶段 B (高级分析) ←→ 阶段 C (工具优化)
    ↓                       ↓                      ↓
  A1 → A2 → A3          B1 → B2               C1 → C2 → C3 → C4 → C5 → C6 → C7
    ↓                       ↓                      ↓
  全部完成 ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
    ↓
  最终提交: Phase 6 完成
```

**并行建议:**
- A1、A2、B1 可以并行开发（独立模块）
- C3（测试）和 C4（错误处理）可以并行
- C1（API文档）和 C2（开发者指南）可以并行
- C5、C6、C7 建议串行（依赖构建验证）

---

## 成功标准

### Phase 6 完成标准
- [ ] 学习路径引导首次访问自动弹出
- [ ] 回测结果展示可靠性评分（0-100）
- [ ] 参数敏感性分析图表可交互
- [ ] 智能预警推荐按钮可用
- [ ] 策略相似度搜索返回 Top 5 相似策略

### 维护完成标准
- [ ] 关键模块测试覆盖率达到 80%+
- [ ] Playwright E2E 测试覆盖核心流程
- [ ] API.md 和 DEVELOPER.md 完整
- [ ] 所有 API 路由使用统一错误处理
- [ ] npm audit 无高危漏洞
- [ ] Lighthouse 性能分数 ≥ 85
- [ ] README 和文档全面更新

---

*创建时间: 2026-04-05*
