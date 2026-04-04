# Stage 0: 清障 - 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 消除技术债务，为后续功能开发建立稳固基础。

**Architecture:** 阶段0分5个独立任务块，可部分并行执行。测试框架建立后立即开始核心模块测试；组件拆分与测试并行进行；去重任务依赖组件拆分完成后确认。

---

## 任务 1: 添加 Vitest 测试框架

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/__tests__/`

**Step 1: 添加 Vitest 依赖**

Run: `npm i -D vitest @testing-library/react @testing-library/dom @testing-library/user-event jsdom @vitejs/plugin-react`

**Step 2: 创建 vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/lib/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Step 3: 创建测试 setup 文件**

```typescript
// src/lib/__tests__/setup.ts
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/dom'

afterEach(() => {
  cleanup()
})

// Mock fetch globally
global.fetch = vi.fn()
```

**Step 4: 更新 package.json scripts**

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui"
  }
}
```

**Step 5: 验证测试框架**

Run: `npm run test:run`
Expected: PASS (0 tests, 0 suites initially)

---

## 任务 2: 核心模块单元测试

**Files:**
- Create: `src/lib/__tests__/risk-metrics.test.ts`
- Create: `src/lib/__tests__/cost-model.test.ts`
- Create: `src/lib/__tests__/factor-library.test.ts`
- Create: `src/lib/__tests__/indicator-calculator.test.ts`

---

### Task 2a: 风险指标测试

**Files:**
- Create: `src/lib/__tests__/risk-metrics.test.ts`

**Step 1: 写失败测试**

```typescript
// src/lib/__tests__/risk-metrics.test.ts
import { describe, it, expect } from 'vitest'
import { RiskMetricsCalculator } from '@/lib/backtest/risk-metrics'

describe('RiskMetricsCalculator', () => {
  // Mock equity curve: starts at 100, goes up, then drops
  const equityCurve = [
    { date: new Date('2024-01-01'), value: 100 },
    { date: new Date('2024-01-15'), value: 105 },
    { date: new Date('2024-02-01'), value: 110 },
    { date: new Date('2024-02-15'), value: 95 },   // drawdown from peak
    { date: new Date('2024-03-01'), value: 100 },
    { date: new Date('2024-03-15'), value: 115 },
  ]

  it('calculates total return correctly', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate(equityCurve)
    expect(result.totalReturn).toBeCloseTo(0.15, 2) // 15% return
  })

  it('calculates max drawdown', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate(equityCurve)
    expect(result.maxDrawdown).toBeLessThan(0)
    expect(result.maxDrawdown).toBeGreaterThan(-0.2)
  })

  it('handles empty equity curve', () => {
    const calculator = new RiskMetricsCalculator()
    expect(() => calculator.calculate([])).toThrow()
  })

  it('calculates volatility', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate(equityCurve)
    expect(result.volatility).toBeGreaterThan(0)
  })

  it('calculates Sharpe ratio', () => {
    const calculator = new RiskMetricsCalculator()
    const result = calculator.calculate(equityCurve)
    expect(typeof result.sharpeRatio).toBe('number')
  })
})
```

**Step 2: 运行测试确认失败**

Run: `npm run test:run -- src/lib/__tests__/risk-metrics.test.ts`
Expected: FAIL (calculator not implemented or methods don't match)

**Step 3: 实现测试中调用的方法**

检查 `src/lib/backtest/risk-metrics.ts` 确认接口，若接口已存在则测试通过；若不匹配则调整测试以匹配实际接口。

**Step 4: 运行测试确认通过**

Run: `npm run test:run -- src/lib/__tests__/risk-metrics.test.ts`
Expected: PASS

---

### Task 2b: 成本模型测试

**Files:**
- Create: `src/lib/__tests__/cost-model.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { CostModel } from '@/lib/backtest/cost-model'

describe('CostModel', () => {
  it('calculates fixed commission', () => {
    const model = new CostModel({ commission: 5, slippage: 0 })
    const cost = model.calculate({ price: 100, quantity: 10 }, 'BUY')
    expect(cost.total).toBeGreaterThan(0)
  })

  it('calculates percentage commission', () => {
    const model = new CostModel({ commission: 0.001, slippage: 0 })
    const cost = model.calculate({ price: 100, quantity: 10 }, 'BUY')
    expect(cost.total).toBeCloseTo(1, 0) // 100 * 10 * 0.001 = 1
  })

  it('buy and sell have similar costs', () => {
    const model = new CostModel({ commission: 5, slippage: 0.001 })
    const buyCost = model.calculate({ price: 100, quantity: 10 }, 'BUY')
    const sellCost = model.calculate({ price: 105, quantity: 10 }, 'SELL')
    expect(sellCost.total).toBeGreaterThan(buyCost.total) // sell slippage higher
  })
})
```

**Step 2: 运行测试确认失败**

Run: `npm run test:run -- src/lib/__tests__/cost-model.test.ts`

**Step 3: 实现**

检查 `src/lib/backtest/cost-model.ts` 确认接口，实现测试中调用的方法。

**Step 4: 确认通过**

---

### Task 2c: 因子库测试

**Files:**
- Create: `src/lib/__tests__/factor-library.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { FactorLibrary } from '@/lib/factors/factor-library'

describe('FactorLibrary', () => {
  it('returns all technical factors', () => {
    const library = new FactorLibrary()
    const factors = library.getAllFactors('technical')
    expect(factors.length).toBeGreaterThan(0)
  })

  it('returns factor by id', () => {
    const library = new FactorLibrary()
    const factor = library.getFactor('rsi_value')
    expect(factor).toBeDefined()
    expect(factor.name).toBeTruthy()
  })

  it('returns undefined for unknown factor', () => {
    const library = new FactorLibrary()
    const factor = library.getFactor('unknown_factor')
    expect(factor).toBeUndefined()
  })
})
```

---

### Task 2d: 指标计算器测试

**Files:**
- Create: `src/lib/__tests__/indicator-calculator.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { IndicatorCalculator } from '@/lib/indicators/calculator'

describe('IndicatorCalculator', () => {
  const mockData = [
    { date: new Date('2024-01-01'), open: 100, high: 105, low: 98, close: 103, volume: 1000000 },
    { date: new Date('2024-01-02'), open: 103, high: 108, low: 101, close: 106, volume: 1100000 },
    { date: new Date('2024-01-03'), open: 106, high: 110, low: 104, close: 108, volume: 900000 },
    // ... 20+ data points for MA calculation
  ]

  it('calculates SMA', () => {
    const calculator = new IndicatorCalculator()
    const result = calculator.calculateMA(mockData.map(d => d.close), 5)
    expect(result.latest).toBeDefined()
    expect(typeof result.latest).toBe('number')
  })

  it('calculates RSI', () => {
    const calculator = new IndicatorCalculator()
    const result = calculator.calculateRSI(mockData.map(d => d.close), 14)
    expect(result.latest).toBeGreaterThanOrEqual(0)
    expect(result.latest).toBeLessThanOrEqual(100)
  })
})
```

---

## 任务 3: 拆分超大型组件

**Files:**
- Split: `src/components/analysis/PortfolioBacktestRunner.tsx` (977行)
- Split: `src/components/analysis/BacktestRunner.tsx` (623行)
- Split: `src/components/chart/ChartContainer.tsx` (479行)

---

### Task 3a: 拆分 PortfolioBacktestRunner (977行)

**拆分策略：** 6个独立子组件 + 1个主容器

**Step 1: 创建子组件文件**

```
src/components/analysis/portfolio-backtest/
├── PortfolioBacktestRunner.tsx          # 主容器（路由状态，组织子组件）
├── BacktestPlanList.tsx                # 回测计划列表 + 加载状态
├── BacktestCreateForm.tsx              # 新建回测表单
├── BacktestReportPanel.tsx             # 回测报告展示面板（图表 + 指标卡）
├── BacktestAdvancedPanel.tsx           # 优化 / Walk-Forward / Monte Carlo 高级面板
└── index.ts                           # 导出
```

**Step 2: BacktestPlanList.tsx 职责**
- 状态: plans, selectedPlan, loading
- 渲染: 计划卡片列表，选中高亮，加载骨架屏
- 事件: onSelect, onDelete, onCreate

**Step 3: BacktestCreateForm.tsx 职责**
- 状态: formData, strategyParams (内部管理)
- 渲染: 所有表单字段，策略选择，预设组合选择
- 事件: onSubmit 返回完整表单数据

**Step 4: BacktestReportPanel.tsx 职责**
- 状态: report (内部)
- 渲染: BacktestChart + RiskMetricsCard + TradeLog
- 接收: planId prop，内部加载报告

**Step 5: BacktestAdvancedPanel.tsx 职责**
- 状态: advancedTab, optimizationResults, walkforwardResult, monteCarloResult
- 渲染: OptimizationResults + WalkForwardChart + MonteCarloChart

**Step 6: 主容器 PortfolioBacktestRunner.tsx**
- 状态提升: plans, selectedPlan, formData, advancedTab 状态
- 组合子组件，移除内部实现逻辑

---

### Task 3b: 拆分 BacktestRunner (623行)

**拆分策略：** 4个独立子组件

```
src/components/analysis/backtest/
├── BacktestRunner.tsx                  # 主容器
├── BacktestForm.tsx                    # 新建计划表单
├── BacktestResult.tsx                  # 结果展示（图表 + 指标 + 交易记录）
├── QuickStrategyCards.tsx              # 快速策略卡片
└── index.ts
```

**Step 1: BacktestForm.tsx**
- 表单字段: name, symbols, startDate, endDate, initialCapital
- 内部状态管理，onSubmit 返回表单数据

**Step 2: BacktestResult.tsx**
- 接收: selectedPlan, trades, equityCurve
- 渲染: 图表 + MetricCard 指标组 + TradeLog

**Step 3: QuickStrategyCards.tsx**
- 接收: onQuickRun(strategyId, params)
- 渲染: 4个预设策略卡片网格

**Step 4: 主容器 BacktestRunner.tsx**
- 状态提升，组合子组件

---

### Task 3c: 拆分 ChartContainer (479行)

```
src/components/chart/
├── ChartContainer.tsx                   # 主容器（数据获取 + 状态管理）
├── ChartPanel.tsx                      # 图表渲染逻辑（lightweight-charts 调用）
├── IndicatorPanel.tsx                  # 指标叠加层控制面板
└── ChartToolbar.tsx                   # 工具栏（周期选择、指标开关）
```

---

## 任务 4: 去重确认

**Files to check:**
- `src/lib/backtest-engine.ts` vs `src/lib/backtest/engine.ts`
- `src/lib/portfolio-metrics.ts` vs `src/lib/portfolio/risk-monitor.ts`
- `src/lib/alert-monitor.ts` vs `src/lib/realtime/alert-engine.ts`
- `src/lib/data/data-source.ts` generateMockData vs `src/app/api/indicators/route.ts` generateMockHistoricalData

**Step 1: 确认 backtest-engine.ts vs backtest/engine.ts**

检查两个文件的导出函数和接口：
- `backtest-engine.ts` 的 `runBacktest()` 和 `backtest/engine.ts` 的 `PortfolioBacktestEngine.run()` 功能是否重复
- 如果完全重复：删除 `backtest-engine.ts`，让 API 路由改用 `backtest/engine.ts`
- 如果各有用途：保留，在 AGENTS.md 中明确区分

**Step 2: 确认 portfolio-metrics.ts vs portfolio/risk-monitor.ts**

- `portfolio-metrics.ts` 处理组合持仓相关指标
- `portfolio/risk-monitor.ts` 处理风险监控和告警
- 如果功能重叠：合并到 `portfolio/risk-monitor.ts`

**Step 3: 确认 alert-monitor.ts vs realtime/alert-engine.ts**

- `alert-monitor.ts` 是独立的告警检查逻辑（定时轮询）
- `realtime/alert-engine.ts` 是 WebSocket 驱动的告警引擎
- 如果功能重叠：合并告警检查逻辑到 `realtime/alert-engine.ts`

**Step 4: 统一 mock 数据生成**

- 将 `src/app/api/indicators/route.ts` 中的 `generateMockHistoricalData()` 替换为 `DataSource.generateMockData()`
- 确认 `data-source.ts` 的 mock 生成逻辑足够通用

---

## 任务 5: 添加 .env.example

**Files:**
- Create: `.env.example`

**Step 1: 检查 .env 文件中的变量**

Run: `cat .env`

**Step 2: 创建 .env.example**

```
# Database
DATABASE_URL=file:./prisma/dev.db

# WebSocket Server
WS_PORT=3001

# Client WebSocket URL
NEXT_PUBLIC_WS_URL=http://localhost:3001

# Data Source (optional, defaults shown)
# DATA_SOURCE=yahoo
# FALLBACK=mock
```

