# FinDec - 美股量化分析平台

美股量化分析工具，提供 K 线图查看、技术指标分析、因子选股、回测系统、实时监控、组合分析等功能。设计上作为**学习工具**，帮助理解量化交易核心概念。

## 技术栈

- **框架**: Next.js 16 (App Router + Turbopack)
- **语言**: TypeScript (strict mode)
- **数据库**: Prisma + SQLite (libsql)
- **图表**: Lightweight Charts v5, Recharts
- **技术分析**: technicalindicators 库
- **实时**: Socket.io WebSocket (端口 3001)
- **样式**: Tailwind CSS v4 + shadcn/ui
- **邮件**: Nodemailer (SMTP)
- **数据源**: Yahoo Finance / Finnhub / Polygon 多源抽象

## 功能特性

- 📊 **K 线图** - 多周期支持（1D/1W/1M/3M/6M/1Y/2Y/5Y），支持十字光标和缩放
- 📈 **技术指标** - MA, EMA, RSI, MACD, Bollinger Bands, Stochastic, ATR, OBV, VWAP 等
- 🔍 **因子选股** - 价值因子、动量因子、质量因子、技术因子，支持自定义规则和权重评分（加权/排名/阈值三种方法）
- 📊 **因子有效性分析** - IC 时序图、IC_IR 柱状图、分组收益热力图、IC 衰减测试
- 🌡️ **因子相关性热力图** - 可视化因子间相关性，避免冗余因子
- 📋 **预设策略模板** - 价值投资、动量策略、质量策略、低波动 4 种一键模板
- 🧪 **回测系统** - 单标的/组合回测，支持多种策略、成本模型、定期再平衡、Walk-Forward 优化、Monte Carlo 模拟
- 📉 **风险指标** - 夏普比率、最大回撤、索提诺比率、Calmar 比率、VaR、Omega、偏度、峰度等
- 💹 **实时报价** - Socket.io WebSocket 推送
- ⏰ **实时预警** - 价格预警、指标预警，支持 Web 推送、浏览器原生通知、邮件通知
- 💼 **组合管理** - 持仓跟踪、交易记录、资金曲线分析
- 🏥 **组合健康度** - 5 维度评分（集中度、波动率、相关性、流动性、风险调整收益）
- 📁 **自定义仪表盘** - 拖拽式 widget 配置面板，6 种可配置组件
- 📚 **学习模式** - 量化概念释义、回测陷阱演示、交互式参数预览、33 个术语词汇百科
- 📤 **报告导出** - CSV 交易记录导出、HTML 可打印报告导出
- 💾 **数据备份** - 组合/策略/预警 JSON 导入导出
- 📚 **交互式学习路径** - 首次访问引导，逐步学习量化交易核心概念
- 🎯 **回测可靠性评估** - 量化回测结果可信度评分（样本量/过拟合/数据质量/稳定性）
- 📊 **参数敏感性分析** - 可视化参数变化对收益/夏普/回撤的影响
- 🤖 **智能预警推荐** - 基于历史波动率自动推荐预警参数
- 🔎 **策略相似度搜索** - 从历史策略库推荐相似策略

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
| 量化分析 | `/analysis` | Tab 式界面：因子选股、回测运行器、实时监控、组合分析 |
| 数据管理 | `/data-manager` | 批量下载历史数据到本地缓存 |
| 策略编辑器 | `/strategy-editor` | 自定义策略 JSON 规则编辑器 |
| 基本面 | `/fundamentals/[symbol]` | 个股基本面数据 4-tab 面板 |
| 词汇百科 | `/education/vocabulary` | 33 个量化交易术语搜索 |
| 回测陷阱 | `/education/backtest-pitfalls` | 过拟合/前视偏差/生存者偏差交互演示 |
| 数据管理 | `/settings/data-management` | JSON 导入导出备份 |

## API 端点

### 行情数据
- `GET /api/quotes?symbol=AAPL` - 获取实时报价
- `GET /api/history?symbol=AAPL&range=1y` - 获取历史 K 线数据
- `GET /api/search?q=apple` - 搜索股票（支持中文名模糊匹配）
- `GET /api/indicators?symbol=AAPL&indicators=ma,ema,rsi` - 计算技术指标

### 数据管理
- `GET /api/data-manager` - 获取本地缓存状态
- `POST /api/data-manager` - 批量下载 K 线数据到本地

### 基本面数据
- `GET /api/fundamentals?symbol=AAPL` - 获取基本面数据

### 因子选股
- `GET /api/factors/strategies` - 获取所有选股策略
- `POST /api/factors/strategies` - 创建新策略
- `POST /api/factors/screen` - 执行筛选
- `GET /api/factors/history` - 获取因子历史值
- `GET /api/factors/effectiveness` - 获取因子有效性指标（IC/IR/分组收益）
- `GET /api/factors/correlation` - 获取因子相关性矩阵
- `POST /api/factors/optimize` - 因子评分优化（因子贡献度、评分方法对比）

### 回测
- `GET /api/backtests` - 获取历史回测记录
- `POST /api/backtests` - 创建单标的回测
- `POST /api/backtests/portfolio` - 创建组合回测
- `POST /api/backtests/optimize` - 参数优化（Grid Search / Walk-Forward）
- `POST /api/backtests/monte-carlo` - Monte Carlo 模拟
- `GET /api/backtests/:id/trades` - 获取回测交易记录

### 策略管理
- `GET /api/strategies` - 获取所有自定义策略
- `POST /api/strategies` - 创建新策略
- `GET /api/strategies/:id` - 获取策略详情
- `PUT /api/strategies/:id` - 更新策略
- `DELETE /api/strategies/:id` - 删除策略

### 组合管理
- `GET /api/portfolios` - 获取所有组合
- `POST /api/portfolios` - 创建组合
- `GET /api/portfolios/:id` - 获取组合详情
- `GET /api/portfolios/:id/metrics` - 获取组合风险指标
- `GET /api/portfolios/:id/health` - 获取组合健康度评分
- `GET /api/portfolios/:id/positions` - 获取持仓列表

### 实时预警
- `GET /api/alerts` - 获取所有预警
- `POST /api/alerts` - 创建预警规则
- `POST /api/alerts/:id/notify` - 触发邮件通知
- `DELETE /api/alerts/:id` - 删除预警
- `POST /api/alerts/check` - 手动触发预警检查
- WebSocket: `ws://localhost:3001` - 实时预警推送

### 用户配置
- `GET /api/user-config` - 获取用户配置
- `PUT /api/user-config` - 更新用户配置（邮件地址、通知偏好等）

## 项目结构

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── alerts/               # 预警管理
│   │   ├── backtests/            # 回测（单标的 + 组合）
│   │   ├── data-manager/         # 批量数据下载
│   │   ├── factors/              # 因子选股 + 有效性 + 相关性 + 优化
│   │   ├── fundamentals/         # 基本面数据
│   │   ├── history/              # 历史 K 线
│   │   ├── indicators/           # 技术指标
│   │   ├── portfolio/            # 组合详情风险
│   │   ├── portfolios/           # 组合管理 + 健康度 + 持仓
│   │   ├── quotes/              # 实时报价
│   │   ├── search/              # 股票搜索 + 名称缓存
│   │   ├── strategies/           # 自定义策略 CRUD
│   │   ├── user-config/         # 用户配置
│   │   └── ws/                   # WebSocket 路由
│   ├── analysis/                # 量化分析页面（Tab 式）
│   ├── dashboard/                # 自定义 Dashboard 页面
│   ├── data-manager/             # 批量数据管理 UI
│   ├── education/                # 学习内容（回测陷阱 + 词汇百科）
│   ├── fundamentals/[symbol]/   # 基本面数据页面
│   ├── settings/data-management/ # JSON 导入导出
│   ├── strategy-editor/         # 策略编辑器页面
│   └── page.tsx                 # 首页
├── components/
│   ├── analysis/                 # 分析 UI 组件
│   │   ├── AlertManager.tsx      # 预警管理器
│   │   ├── BacktestRunner.tsx    # 回测运行器
│   │   ├── BenchmarkMetricsCard.tsx # 基准对比指标
│   │   ├── CostModelPanel.tsx    # 成本模型配置
│   │   ├── DeepRiskAnalysis.tsx   # 深度风险分析
│   │   ├── ExportPanel.tsx        # 报告导出面板
│   │   ├── FactorScreener.tsx    # 因子筛选器
│   │   ├── MonteCarloChart.tsx   # Monte Carlo 图表
│   │   ├── OptimizationResults.tsx # 优化结果
│   │   ├── PortfolioDashboard.tsx # 组合面板
│   │   ├── RiskMetricsCard.tsx   # 风险指标卡片
│   │   ├── StrategyComparison.tsx # 策略对比
│   │   ├── StrategyExplorer.tsx  # 策略探索
│   │   ├── TradeLog.tsx          # 交易记录
│   │   └── WalkForwardChart.tsx  # Walk-Forward 图表
│   ├── chart/                   # 图表组件
│   │   ├── ChartContainer.tsx   # K 线图容器
│   │   ├── ChartToolbar.tsx     # 图表工具栏
│   │   └── IndicatorOverlay.tsx  # 指标叠加层
│   ├── dashboard/               # Dashboard 组件
│   │   ├── AlertNotificationBridge.tsx # WebSocket 通知桥接
│   │   ├── DashboardSettings.tsx  # Dashboard 配置面板
│   │   ├── EmailNotificationSettings.tsx # 邮件通知设置
│   │   ├── NotificationSettings.tsx # 通知设置
│   │   ├── PortfolioRiskPanel.tsx # 组合风险面板
│   │   ├── WidgetRegistry.tsx    # 组件注册表
│   │   ├── WidgetWrapper.tsx     # Widget 包装器
│   │   ├── quick-quote.tsx      # 快捷报价
│   │   ├── stock-list.tsx        # 股票列表
│   │   └── widgets/              # 可配置 Widget
│   │       ├── AlertListWidget.tsx
│   │       ├── MiniChartWidget.tsx
│   │       ├── PortfolioHealthWidget.tsx
│   │       ├── PortfolioOverviewWidget.tsx
│   │       ├── QuickQuoteWidget.tsx
│   │       └── RiskMetricsWidget.tsx
│   ├── factors/                 # 因子可视化组件
│   │   ├── FactorCorrelationHeatmap.tsx # 相关性热力图
│   │   ├── FactorEffectiveness.tsx  # 有效性看板
│   │   ├── FactorScoringPanel.tsx   # 评分方法面板
│   │   ├── GroupReturnChart.tsx     # 分组收益热力图
│   │   ├── IcChart.tsx            # IC 时序图
│   │   ├── IcDecayChart.tsx       # IC 衰减图
│   │   ├── IcIrChart.tsx          # IC_IR 柱状图
│   │   └── StrategyTemplates.tsx   # 预设策略模板
│   ├── fundamentals/            # 基本面数据展示
│   │   ├── FinancialHealth.tsx
│   │   ├── FundamentalsPanel.tsx
│   │   ├── GrowthMetrics.tsx
│   │   ├── ProfitabilityMetrics.tsx
│   │   └── ValuationMetrics.tsx
│   ├── interactive/             # 交互参数组件
│   │   └── ParameterControls.tsx  # 参数滑块 + 实时信号预览
│   ├── layout/                 # 布局组件
│   │   ├── Breadcrumb.tsx
│   │   └── Navigation.tsx
│   ├── learning/               # 学习组件
│   │   ├── TermTooltip.tsx      # 术语悬浮提示
│   │   └── VocabularySearch.tsx  # 词汇搜索
│   ├── strategy-editor/         # 策略编辑器
│   │   ├── ActionConfig.tsx
│   │   ├── ConditionGroup.tsx
│   │   ├── ConditionRow.tsx
│   │   ├── index.ts
│   │   └── StrategyPreview.tsx
│   └── ui/                     # shadcn/ui 组件
└── lib/
    ├── backtest/               # 回测引擎
    │   ├── cost-model.ts        # 交易成本模型（佣金、滑点、印花税）
    │   ├── engine.ts            # 组合回测引擎
    │   ├── grid-search.ts       # 网格搜索优化
    │   ├── monte-carlo.ts       # Monte Carlo 模拟
    │   ├── position-manager.ts  # 仓位管理器
    │   ├── risk-metrics.ts     # 风险指标计算器
    │   └── walk-forward.ts      # Walk-Forward 分析
    ├── data/                   # 数据层
    │   ├── cache-manager.ts     # SQLite 持久化缓存
    │   ├── data-source.ts       # DataSource 抽象
    │   ├── data-source-config.ts # 数据源配置
    │   ├── data-source-registry.ts # 多源注册 + 熔断
    │   ├── fundamental-data.ts  # 基本面数据获取
    │   ├── rate-limiter.ts     # API 速率限制
    │   └── sources/             # 数据源实现
    │       ├── finnhub-source.ts
    │       ├── polygon-source.ts
    │       └── yahoo-finance-source.ts
    ├── export/                  # 导出工具
    │   ├── backup.ts            # JSON 导入导出
    │   └── exportUtils.ts       # CSV + HTML 打印导出
    ├── factors/                 # 因子系统
    │   ├── factor-correlation.ts # 相关性计算
    │   ├── factor-library.ts    # 因子定义库
    │   ├── factor-metrics.ts   # IC/IR 计算
    │   ├── fundamental-factors.ts # 基本面因子
    │   ├── screening-engine.ts  # 筛选引擎
    │   └── strategy-templates.ts # 预设策略模板
    ├── hooks/                   # React Hooks
    │   ├── useBrowserNotifications.ts # 浏览器通知
    │   └── useWebSocket.ts     # WebSocket 连接
    ├── indicators/              # 指标系统
    │   ├── calculator.ts         # 指标计算器
    │   └── signal-decorator.ts  # 信号标注
    ├── learning/               # 学习系统
    │   └── vocabulary.ts        # 33 个量化术语
    ├── portfolio/              # 组合模块
    │   ├── allocation.ts       # 资金配置优化
    │   ├── health-score.ts      # 健康度评分（5 维度）
    │   └── risk-monitor.ts     # 风险监控
    ├── realtime/               # 实时模块
    │   ├── alert-engine.ts     # 预警引擎
    │   └── email-notifier.ts   # 邮件通知
    ├── prisma.ts              # Prisma Client 单例
    ├── alert-monitor.ts       # 预警监控循环
    ├── indicators.ts          # 指标注册表
    ├── portfolio-metrics.ts   # 组合指标计算
    ├── utils.ts               # 工具函数
    ├── yahoo-finance.ts       # Yahoo Finance API
    └── websocket-server.ts    # WebSocket 服务器

prisma/
└── schema.prisma              # 数据库模型
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
| `StockNameCache` | 股票中文名缓存（中文搜索） |
| `LocalDataCache` | 本地 K 线数据缓存 |
| `CustomStrategy` | 自定义策略配置 |

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
- 回测的常见陷阱（过拟合、前视偏差、生存者偏差）
- 风险指标的数学原理

## 许可证

MIT
