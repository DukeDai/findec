# FinDec 开发者指南

FinDec 美股量化分析平台开发文档。本文档面向开发者，涵盖环境配置、开发流程、代码规范及项目架构。

---

## 目录

1. [环境配置](#环境配置)
2. [本地开发](#本地开发)
3. [数据库](#数据库)
4. [数据源配置](#数据源配置)
5. [调试](#调试)
6. [代码规范](#代码规范)
7. [项目架构](#项目架构)
8. [贡献指南](#贡献指南)

---

## 环境配置

### 系统要求

| 工具 | 版本要求 |
|------|----------|
| Node.js | >= 18.x |
| npm | >= 9.x |
| Git | >= 2.x |

### 环境变量

复制 `.env.example` 创建 `.env.local`：

```bash
cp .env.example .env.local
```

**必需的环境变量：**

```env
# 数据库配置
DATABASE_URL=file:./prisma/dev.db

# WebSocket 服务
WS_PORT=3001
NEXT_PUBLIC_WS_URL=http://localhost:3001

# 数据源配置（逗号分隔，按优先级排序）
DATA_SOURCES=yahoo,finnhub

# 熔断阈值（连续失败次数后禁用）
DATA_SOURCE_CIRCUIT_BREAKER_THRESHOLD=3

# 启用模拟数据模式（开发环境）
DATA_SOURCE_MOCK_MODE=false

# 所有源失败时回退到模拟数据
DATA_SOURCE_FALLBACK_TO_MOCK=true
```

**可选的环境变量（数据源 API 密钥）：**

| 变量名 | 说明 | 获取地址 |
|--------|------|----------|
| `FINNHUB_API_KEY` | Finnhub API 密钥 | https://finnhub.io |
| `POLYGON_API_KEY` | Polygon.io API 密钥 | https://polygon.io |

**注意：**
- 开发环境可不配置 API 密钥，系统会自动回退到模拟数据
- 生产环境建议至少配置一个数据源密钥以确保数据准确性
- 切勿将 `.env` 文件提交到版本控制

---

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

这将同时启动：
- Next.js 开发服务器（http://localhost:3000）
- WebSocket 服务器（端口 3001）

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本（包含类型检查） |
| `npm run lint` | 运行 ESLint 检查 |
| `npx tsc --noEmit` | 仅运行 TypeScript 类型检查 |

### 构建流程

```bash
# 完整构建包含：Prisma 验证、客户端生成、Next.js 构建
npm run build
```

构建流程：
1. `prisma validate` - 验证数据库 Schema
2. `prisma generate` - 生成 Prisma Client
3. `next build` - 构建 Next.js 应用

---

## 数据库

### Prisma 命令

| 命令 | 说明 |
|------|------|
| `npx prisma db push` | 推送 Schema 变更到数据库 |
| `npx prisma generate` | 生成 Prisma Client |
| `npx prisma validate` | 验证 Schema 有效性 |
| `npx prisma db sync` | 验证+生成+推送（一键同步） |
| `npm run db:push` | 快捷命令：推送 Schema |
| `npm run db:generate` | 快捷命令：生成 Client |
| `npm run db:check` | 快捷命令：验证 Schema |
| `npm run db:sync` | 快捷命令：同步所有 |

### 数据库位置

```
prisma/dev.db          # SQLite 数据库文件（已 gitignore）
prisma/schema.prisma   # 数据库 Schema 定义
```

### 修改 Schema 后

每次修改 `prisma/schema.prisma` 后必须执行：

```bash
npx prisma db push && npx prisma generate
```

### 核心数据模型

| 模型 | 说明 |
|------|------|
| `Stock` / `HistoricalData` | 股票基础数据与历史 K 线 |
| `FactorStrategy` / `FactorRule` | 因子策略与规则 |
| `BacktestPlan` / `BacktestTrade` | 回测计划与交易记录 |
| `PortfolioBacktestPlan` | 组合回测计划 |
| `Alert` / `RiskAlertLog` | 预警规则与日志 |
| `Portfolio` / `Position` / `Transaction` | 组合、持仓、交易记录 |
| `CustomStrategy` | 自定义策略配置 |
| `StockNameCache` | 中文名称缓存（支持中文搜索） |

---

## 数据源配置

### 多源架构

FinDec 采用多数据源架构，支持自动故障转移：

```
┌─────────────────┐
│  DataSource     │ ← 统一接口
│  (Facade)       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌───▼──────┐ ┌──────────┐
│ Yahoo │ │ Finnhub  │ │ Polygon  │
│Finance│ │          │ │          │
└───┬───┘ └────┬─────┘ └────┬─────┘
    │          │            │
    └──────────┴────────────┘
               │
          ┌────▼────┐
          │ Circuit │
          │ Breaker │
          └─────────┘
```

### 配置数据源优先级

在 `.env.local` 中配置：

```env
# 按优先级排序，高优先级在前
DATA_SOURCES=yahoo,finnhub,polygon
```

系统按顺序尝试每个数据源，失败时自动切换到下一个。

### 熔断机制

当某个数据源连续失败达到阈值时，会自动熔断（暂时禁用）：

```env
# 连续失败 3 次后熔断
DATA_SOURCE_CIRCUIT_BREAKER_THRESHOLD=3
```

熔断后的数据源会在冷却期后自动恢复。

### Mock 数据回退

当所有数据源都失败时，系统会自动生成模拟数据：

```env
# 启用回退（推荐开发环境开启）
DATA_SOURCE_FALLBACK_TO_MOCK=true
```

### 代码中使用数据源

```typescript
// src/lib/data/data-source.ts
import { defaultDataSource } from '@/lib/data/data-source'

// 获取历史数据
const data = await defaultDataSource.getHistoricalData('AAPL', '1y')

// 获取实时报价
const quote = await defaultDataSource.getQuote('AAPL')

// 搜索股票
const results = await defaultDataSource.searchStocks('apple')

// 获取基本面数据
const fundamentals = await defaultDataSource.getFundamentalData('AAPL')

// 检查数据源健康状态
const health = await defaultDataSource.checkHealth()
```

---

## 调试

### WebSocket 调试

WebSocket 服务器运行在端口 3001：

```bash
# 检查 WebSocket 是否运行
curl http://localhost:3001/socket.io/

# 查看连接状态
lsof -i :3001
```

**浏览器中测试 WebSocket：**

```javascript
const socket = io('http://localhost:3001')
socket.on('connect', () => {
  console.log('WebSocket 已连接')
})
socket.on('alert-triggered', (alert) => {
  console.log('收到预警:', alert)
})
```

### API 调试

**使用 curl 测试 API：**

```bash
# 获取实时报价
curl "http://localhost:3000/api/quotes?symbol=AAPL"

# 获取历史数据
curl "http://localhost:3000/api/history?symbol=AAPL&range=1y"

# 搜索股票
curl "http://localhost:3000/api/search?q=apple"

# 获取技术指标
curl "http://localhost:3000/api/indicators?symbol=AAPL&indicators=ma,ema,rsi"

# 获取基本面数据
curl "http://localhost:3000/api/fundamentals?symbol=AAPL"
```

### 浏览器开发者工具

- **Network 面板**：查看 API 请求/响应
- **Console 面板**：查看日志输出
- **Application 面板**：查看 localStorage（Dashboard widget 配置存储于此）

### TypeScript 调试

```bash
# 仅检查类型错误
npx tsc --noEmit

# 查看详细错误信息
npx tsc --noEmit --pretty
```

---

## 代码规范

### TypeScript 规范

**严格模式：**

- 所有代码必须通过 TypeScript 严格模式检查
- 禁止使用 `any` 类型，使用 `unknown` 配合类型守卫
- 优先使用 `interface` 定义对象结构

```typescript
// ✅ 正确
interface User {
  id: string
  name: string
}

function processUser(user: User) {
  // ...
}

// ❌ 错误
const result: any = fetchData()
```

### Import 顺序

```typescript
// 1. React/Next.js 导入
import { useState, useEffect } from 'react'
import { NextRequest, NextResponse } from 'next/server'

// 2. 外部包（按字母顺序）
import { Button } from '@/components/ui/button'
import { io } from 'socket.io-client'

// 3. 内部模块（使用 @/* 别名）
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'
```

### 路径别名

- 使用 `@/*` 代替 `./src/*`
- 例如：`@/lib/prisma` 而不是 `../lib/prisma`

### React 组件规范

**服务端组件（默认）：**

```typescript
// 页面组件默认为服务端组件
export default function Page() {
  return <div>...</div>
}
```

**客户端组件：**

```typescript
"use client"

import { useState } from 'react'

export function InteractiveComponent() {
  const [value, setValue] = useState(0)
  return <div>...</div>
}
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件 | kebab-case | `backtest-engine.ts` |
| 组件 | PascalCase | `BacktestRunner` |
| 函数 | camelCase | `calculateIndicators` |
| Hooks | use + camelCase | `usePortfolio` |
| 常量 | SCREAMING_SNAKE_CASE | `DEFAULT_SYMBOLS` |
| Prisma 模型 | PascalCase | `PortfolioBacktestPlan` |
| 数据库字段 | snake_case | `created_at` |

### API 路由规范

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '需要提供 ID' }, { status: 400 })
    }

    const data = await prisma.model.findUnique({ where: { id } })
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET 错误:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
```

**规范要点：**
- 始终使用 try-catch 包裹逻辑
- 返回适当的 HTTP 状态码（400/404/500）
- 用户可见错误信息使用中文
- 使用 `console.error()` 记录错误

### 样式规范

```typescript
import { cn } from '@/lib/utils'

// 使用 cn() 合并条件类名
<div className={cn(
  'px-4 py-2 rounded-md',
  isActive && 'bg-primary text-white'
)}>
```

- 使用 Tailwind CSS 工具类
- 使用 CSS 变量（design tokens）定义颜色
- 响应式使用前缀：`sm:`, `md:`, `lg:`

### UI 语言规范

- **所有用户可见文本必须使用中文**
- 代码注释使用英文
- 错误提示信息使用中文

### 注释规范

```typescript
// ✅ 解释为什么（不是做什么）
// 使用防抖避免频繁请求
const debouncedSearch = debounce(search, 300)

// ❌ 冗余注释
// 设置值为 0
setValue(0)
```

- 代码应当自解释，避免不必要的注释
- 复杂逻辑添加简短注释说明原因
- 代码注释使用英文

---

## 项目架构

### 模块概览

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由端点
│   ├── analysis/          # 量化分析页面
│   ├── dashboard/         # 自定义仪表盘
│   ├── education/         # 学习内容
│   └── ...
├── components/            # React 组件
│   ├── analysis/          # 分析相关组件
│   ├── chart/             # 图表组件
│   ├── dashboard/         # 仪表盘组件
│   ├── factors/           # 因子相关组件
│   └── ui/                # shadcn/ui 基础组件
└── lib/                   # 核心库代码
    ├── backtest/          # 回测引擎
    ├── data/              # 数据层
    ├── factors/           # 因子系统
    ├── indicators/        # 技术指标
    ├── portfolio/         # 组合管理
    └── realtime/          # 实时预警
```

### 核心模块详解

#### 数据层 (`src/lib/data/`)

| 文件 | 说明 |
|------|------|
| `data-source.ts` | DataSource 统一接口 Facade |
| `data-source-registry.ts` | 多源注册器 + 熔断器 |
| `data-source-config.ts` | 数据源配置加载 |
| `cache-manager.ts` | SQLite 持久化缓存 |
| `rate-limiter.ts` | API 速率限制器 |
| `sources/` | 各数据源实现 |

#### 回测引擎 (`src/lib/backtest/`)

| 文件 | 说明 |
|------|------|
| `engine.ts` | 组合回测引擎 |
| `cost-model.ts` | 交易成本模型（佣金、滑点） |
| `risk-metrics.ts` | 风险指标计算 |
| `position-manager.ts` | 仓位管理器 |
| `grid-search.ts` | 网格搜索优化 |
| `monte-carlo.ts` | Monte Carlo 模拟 |
| `walk-forward.ts` | Walk-Forward 分析 |

#### 因子系统 (`src/lib/factors/`)

| 文件 | 说明 |
|------|------|
| `factor-library.ts` | 因子定义库 |
| `screening-engine.ts` | 筛选执行引擎 |
| `factor-metrics.ts` | IC/IR 有效性计算 |
| `factor-correlation.ts` | 因子相关性矩阵 |
| `fundamental-factors.ts` | 基本面因子 |
| `strategy-templates.ts` | 预设策略模板 |

#### 技术指标 (`src/lib/indicators/`)

| 文件 | 说明 |
|------|------|
| `calculator.ts` | 指标计算扩展 |
| `signal-decorator.ts` | 信号标注 |

#### 组合管理 (`src/lib/portfolio/`)

| 文件 | 说明 |
|------|------|
| `health-score.ts` | 组合健康度评分（5 维度） |
| `risk-monitor.ts` | 风险监控 |
| `allocation.ts` | 配置优化 |

### 关键抽象

#### DataSource 抽象

```typescript
import { defaultDataSource } from '@/lib/data/data-source'

// 统一接口访问所有数据源
const data = await defaultDataSource.getHistoricalData('AAPL', '1y')
const quote = await defaultDataSource.getQuote('AAPL')
```

#### DataSourceRegistry 多源注册

```typescript
import { DataSourceRegistry } from '@/lib/data/data-source-registry'

const registry = new DataSourceRegistry()
registry.register('yahoo', new YahooFinanceSource())
registry.register('finnhub', new FinnhubSource())

// 自动故障转移
const data = await registry.getHistoricalData('AAPL', '1y')
```

#### RiskMetrics 风险指标

```typescript
import { RiskMetricsCalculator } from '@/lib/backtest/risk-metrics'

const calculator = new RiskMetricsCalculator()
const metrics = calculator.calculate(equityCurve)
// 返回：夏普比率、最大回撤、索提诺比率等
```

### 如何添加新指标

1. **在 `src/lib/indicators/calculator.ts` 添加计算函数：**

```typescript
export function calculateNewIndicator(data: number[], period: number): number[] {
  // 实现计算逻辑
  return result
}
```

2. **在 `src/lib/indicators.ts` 注册指标：**

```typescript
export const INDICATORS = {
  // ... 现有指标
  newIndicator: {
    name: '新指标',
    description: '指标说明',
    defaultParams: { period: 14 },
  },
}
```

3. **在 API 路由中处理：**

```typescript
// src/app/api/indicators/route.ts
if (indicators.includes('newIndicator')) {
  result.newIndicator = calculateNewIndicator(closes, 14)
}
```

### 如何添加新因子

1. **在 `src/lib/factors/factor-library.ts` 定义因子：**

```typescript
export const FACTOR_LIBRARY = {
  // ... 现有因子
  NEW_FACTOR: {
    id: 'new_factor',
    name: '新因子',
    description: '因子说明',
    category: 'value', // value | momentum | quality | technical
    calculate: (data: StockData) => {
      // 返回因子值
      return value
    },
  },
}
```

2. **如果是基本面因子，在 `src/lib/factors/fundamental-factors.ts` 添加：**

```typescript
export const FUNDAMENTAL_FACTORS = {
  pe: {
    name: '市盈率',
    fetch: async (symbol: string) => {
      // 从数据源获取
      return value
    },
  },
}
```

3. **在 UI 中使用：**

```typescript
import { FactorLibrary } from '@/lib/factors/factor-library'

const library = new FactorLibrary()
const factors = library.getAllFactors()
```

---

## 贡献指南

### 分支命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 功能 | `feature/描述` | `feature/factor-screening` |
| 修复 | `fix/描述` | `fix/websocket-reconnect` |
| 重构 | `refactor/描述` | `refactor/backtest-engine` |
| 文档 | `docs/描述` | `docs/api-guide` |

### Commit Message 格式

```
类型: 简短描述

详细说明（可选）
```

**类型：**

- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

**示例：**

```bash
git commit -m "feat: 添加 MACD 指标支持"
git commit -m "fix: 修复回测收益计算错误"
git commit -m "docs: 更新 API 文档"
```

### PR 流程

1. **创建分支**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 描述"
   ```

3. **推送到远程**
   ```bash
   git push origin feature/my-feature
   ```

4. **创建 Pull Request**
   - 填写 PR 标题和描述
   - 关联相关 Issue
   - 请求代码审查

5. **审查与合并**
   - 解决审查意见
   - 确保 CI 通过
   - 合并到主分支

### 代码审查清单

- [ ] 代码通过 TypeScript 类型检查
- [ ] ESLint 无错误
- [ ] 新功能有适当的错误处理
- [ ] UI 文本使用中文
- [ ] 复杂逻辑有注释说明
- [ ] 遵循 Import 顺序规范

---

## 参考文档

- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Lightweight Charts 文档](https://tradingview.github.io/lightweight-charts/)
- [shadcn/ui 文档](https://ui.shadcn.com/)

---

**文档版本：** 1.0  
**最后更新：** 2025年4月
