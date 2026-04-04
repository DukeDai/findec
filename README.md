# FinDec - 美股量化分析平台

美股量化分析工具，提供 K 线图查看、技术指标分析、因子选股、回测系统、实时监控、组合分析等功能。设计上作为**学习工具**，帮助理解量化交易核心概念。

## 技术栈

- **框架**: Next.js 16 (App Router + Turbopack)
- **语言**: TypeScript (strict mode)
- **数据库**: Prisma + SQLite (libsql)
- **图表**: Lightweight Charts v5
- **技术分析**: technicalindicators 库
- **实时**: Socket.io WebSocket (端口 3001)
- **样式**: Tailwind CSS v4 + shadcn/ui
- **数据源**: Yahoo Finance API (带 mock 数据回退)

## 功能特性

- 📊 **K 线图** - 多周期支持（1D/1W/1M/3M/6M/1Y/2Y/5Y），支持十字光标和缩放
- 📈 **技术指标** - MA, EMA, RSI, MACD, Bollinger Bands, Stochastic, ATR, OBV, VWAP 等
- 🔍 **因子选股** - 价值因子、动量因子、质量因子、技术因子，支持自定义规则和权重评分
- 🧪 **回测系统** - 单标的/组合回测，支持多种策略、成本模型、定期再平衡、Walk-Forward 优化、Monte Carlo 模拟
- 📉 **风险指标** - 夏普比率、最大回撤、索提诺比率、Calmar 比率、VaR、波动率等
- 💹 **实时报价** - Socket.io WebSocket 推送
- ⏰ **实时预警** - 价格预警、指标预警、因子预警、风险预警，支持 Web 推送
- 💼 **组合管理** - 持仓跟踪、交易记录、资金曲线分析
- 📚 **学习模式** - 量化概念释义，帮助理解各模块背后的金融原理

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma db push
npx prisma generate

# 启动开发服务器（Next.js + WebSocket 服务）
npm run dev

# 类型检查
npx tsc --noEmit

# 构建生产版本
npm run build
```

访问 http://localhost:3000 查看应用。

## 核心页面

| 页面 | 路径 | 说明 |
|------|------|------|
| Dashboard | `/` | 组合概览、快捷报价、风险面板 |
| 量化分析 | `/analysis` | Tab 式界面：因子选股、回测运行器、策略对比 |

## API 端点

### 行情数据
- `GET /api/quotes?symbol=AAPL` - 获取实时报价
- `GET /api/history?symbol=AAPL&range=1y` - 获取历史 K 线数据
- `GET /api/search?q=apple` - 搜索股票
- `GET /api/indicators?symbol=AAPL&indicators=ma,ema,rsi` - 计算技术指标

### 因子选股
- `GET /api/factors/strategies` - 获取所有选股策略
- `POST /api/factors/strategies` - 创建新策略
- `POST /api/factors/screen` - 执行筛选
- `GET /api/factors/history` - 获取因子历史值

### 回测
- `GET /api/backtests` - 获取历史回测记录
- `POST /api/backtests` - 创建单标的回测
- `POST /api/backtests/portfolio` - 创建组合回测
- `POST /api/backtests/optimize` - 参数优化（Grid Search / Walk-Forward）
- `POST /api/backtests/monte-carlo` - Monte Carlo 模拟
- `GET /api/backtests/:id/trades` - 获取回测交易记录

### 组合管理
- `GET /api/portfolios` - 获取所有组合
- `POST /api/portfolios` - 创建组合
- `GET /api/portfolio/:id/metrics` - 获取组合风险指标

### 实时预警
- `GET /api/alerts` - 获取所有预警
- `POST /api/alerts` - 创建预警规则
- `DELETE /api/alerts/:id` - 删除预警
- WebSocket: `ws://localhost:3001` - 实时预警推送

### 基础数据
- `GET /api/fundamentals?symbol=AAPL` - 获取基本面数据

## 项目结构

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── alerts/               # 预警管理
│   │   ├── backtests/            # 回测（单标的 + 组合）
│   │   ├── factors/              # 因子选股
│   │   ├── fundamentals/         # 基本面数据
│   │   ├── history/              # 历史 K 线
│   │   ├── indicators/           # 技术指标
│   │   ├── portfolio/            # 组合详情
│   │   ├── portfolios/           # 组合管理
│   │   ├── quotes/              # 实时报价
│   │   ├── search/              # 股票搜索
│   │   └── ws/                   # WebSocket 路由
│   ├── analysis/                # 量化分析页面（Tab 式）
│   ├── dashboard/                # Dashboard 页面
│   └── layout.tsx                # 全局布局
├── components/
│   ├── analysis/                # 分析 UI 组件
│   │   ├── AlertManager.tsx      # 预警管理器
│   │   ├── BacktestRunner.tsx    # 回测运行器
│   │   ├── BacktestChart.tsx     # 回测图表
│   │   ├── FactorScreener.tsx    # 因子筛选器
│   │   ├── MonteCarloChart.tsx   # Monte Carlo 图表
│   │   ├── OptimizationResults.tsx # 优化结果
│   │   ├── PortfolioBacktestRunner.tsx # 组合回测
│   │   ├── PortfolioDashboard.tsx # 组合面板
│   │   ├── RiskMetricsCard.tsx   # 风险指标卡片
│   │   ├── StrategyComparison.tsx # 策略对比
│   │   ├── StrategyExplorer.tsx  # 策略探索
│   │   ├── TradeLog.tsx          # 交易记录
│   │   └── WalkForwardChart.tsx  # Walk-Forward 图表
│   ├── chart/                   # 图表组件
│   ├── dashboard/              # Dashboard 组件
│   ├── layout/                  # 布局组件（导航、面包屑）
│   └── ui/                     # shadcn/ui 组件
└── lib/
    ├── backtest/               # 回测引擎
    │   ├── cost-model.ts        # 交易成本模型（佣金、滑点）
    │   ├── engine.ts            # 组合回测引擎
    │   ├── position-manager.ts  # 仓位管理器
    │   ├── risk-metrics.ts     # 风险指标计算器
    │   ├── grid-search.ts       # 网格搜索优化
    │   ├── monte-carlo.ts       # Monte Carlo 模拟
    │   └── walk-forward.ts      # Walk-Forward 分析
    ├── data/                   # 数据层
    │   ├── cache-manager.ts     # 缓存管理器（SQLite 持久化）
    │   ├── data-source.ts      # DataSource 抽象层
    │   └── rate-limiter.ts     # API 速率限制
    ├── factors/                # 因子系统
    │   ├── factor-library.ts    # 因子定义库
    │   ├── factor-metrics.ts   # 因子有效性分析
    │   ├── fundamental-factors.ts # 基本面因子
    │   └── screening-engine.ts  # 筛选执行引擎
    ├── indicators/             # 指标系统
    │   ├── calculator.ts        # 扩展指标计算器
    │   └── signal-decorator.ts  # 信号标注
    ├── portfolio/              # 组合模块
    │   ├── allocation.ts        # 资金配置优化
    │   └── risk-monitor.ts     # 风险监控
    ├── realtime/               # 实时模块
    │   └── alert-engine.ts     # 预警引擎
    ├── learning/               # 学习模块
    │   └── learning-context.tsx # 量化概念释义上下文
    ├── prisma.ts               # Prisma Client 单例
    ├── utils.ts                # 工具函数
    ├── yahoo-finance.ts        # Yahoo Finance API
    └── websocket-server.ts     # WebSocket 服务器
prisma/
└── schema.prisma               # 数据库模型
```

## 数据库模型

| 模型 | 说明 |
|------|------|
| `Stock` / `HistoricalData` | 股票基础数据与历史 K 线 |
| `FactorStrategy` / `FactorRule` / `FactorHistory` | 因子策略、规则与历史值 |
| `ScreeningResult` | 筛选结果记录 |
| `BacktestPlan` / `BacktestTrade` | 单标的回测计划与交易记录 |
| `PortfolioBacktestPlan` | 组合回测计划（含权益曲线、风险指标） |
| `Alert` / `RiskAlertLog` | 预警规则与触发日志 |
| `Portfolio` / `Position` / `Transaction` | 组合、持仓、交易记录 |
| `DataSourceMeta` | 数据来源追踪 |

## 开发指南

### 代码规范

- **TypeScript**: 严格模式，禁止 `any` 类型
- **路径别名**: 使用 `@/*` 引用 `src/*` 下的文件
- **组件**: PascalCase 文件名，React 组件使用 PascalCase
- **API**: 错误统一返回 `{ error: string }`，状态码 400/404/500
- **UI 语言**: 所有用户可见文本使用中文

### 添加技术指标

1. 在 `src/lib/indicators/calculator.ts` 中添加计算函数
2. 在 `src/app/api/indicators/route.ts` 中注册路由参数
3. 在图表组件中通过 `indicator` 查询参数叠加显示

### 添加因子

1. 在 `src/lib/factors/factor-library.ts` 中定义因子
2. 在 `src/lib/factors/fundamental-factors.ts` 中添加基本面因子
3. 在 FactorScreener UI 组件中选择使用

### WebSocket 预警

```typescript
import { io } from 'socket.io-client'

const socket = io('ws://localhost:3001')
socket.on('alert-triggered', (alert) => {
  console.log('触发预警:', alert)
})
```

## 学习资源

平台内置**学习模式**，各功能模块配有量化概念释义，帮助理解：
- 技术指标的金融含义与局限性
- 因子选股的逻辑与有效性评估
- 回测的常见陷阱（过拟合、前视偏差等）
- 风险指标的数学原理

## 许可证

MIT
