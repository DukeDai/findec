# FinDec — 美股量化分析平台

> 文档位置: `docs/feature-summary.md`
> 最后更新: 2026-04-06（学习增强 + 基础设施完善 ✅）
> 用途: 功能全景图 + 缺口追踪

---

## 项目概述

FinDec 是一个基于 **Next.js 16 + TypeScript strict + Prisma + SQLite** 构建的**美股量化分析平台**，设计定位为**学习工具**，帮助用户理解量化交易核心概念。
此项目无需支持国际化和响应式UI。

### 技术栈

| 层次 | 技术选型 |
|------|---------|
| 框架 | Next.js 16 (App Router + Turbopack) |
| 语言 | TypeScript strict mode |
| 数据库 | Prisma + SQLite (libsql) |
| 样式 | Tailwind CSS v4 + shadcn/ui |
| 图表 | Lightweight Charts v5, Recharts |
| 技术分析 | technicalindicators 库 |
| 实时 | Socket.io WebSocket (端口 3001) |
| 邮件 | Nodemailer (SMTP) |
| 数据源 | Yahoo Finance / Finnhub / Polygon 多源抽象 |

### 核心能力总览

```
数据层 ─── 多源数据抽象 + SQLite 缓存 + 熔断器
          ↓
指标层 ─── 28 个技术指标 + 自定义公式计算器
          ↓
因子层 ─── 28 个因子（21 技术 + 6 基本面 + 1 ML LSTM）+ PCA 降维 + 相关性热力图
          ↓
回测层 ─── 单标的/组合回测 + 事件驱动 + Worker Threads 并行 + Walk-Forward + Monte Carlo
          ↓
组合层 ─── 五维健康评分 + Barra 因子暴露 + 仓位优化
          ↓
实时层 ─── 价格/指标预警 + WebSocket 推送 + 邮件/浏览器通知
          ↓
输出层 ─── CSV/HTML/PDF 报告导出 + JSON 备份
```

---

## 一、已实现功能

### 1. 数据源与数据获取

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 多源数据抽象层 (Yahoo/Finnhub/Polygon + 熔断器) | `src/lib/data/data-source*.ts` | ✅ |
| SQLite 本地 K 线缓存 | `src/lib/data/cache-manager.ts` | ✅ |
| 股票名称中文缓存预热 | `src/app/api/search/cache/route.ts` | ✅ |
| WebSocket 实时行情 (Socket.IO, 端口 3001) | `src/lib/websocket-server.ts`, `useWebSocket.ts` | ✅ |
| 基本面数据获取 | `src/app/api/fundamentals/route.ts` | ✅ |

### 2. 技术指标

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 指标计算引擎 (MA/EMA/RSI/MACD/BB/ATR/ADX/Stochastic/OBV/VWAP/CCI/KST/WMA/ROC) | `src/lib/indicators/calculator.ts` | ✅ |
| 指标注册表 | `src/lib/indicators.ts` | ✅ |
| 交易信号注解 (BUY/SELL) | `src/lib/indicators/signal-decorator.ts` | ✅ |
| K 线图表 + 指标叠加 (Lightweight Charts) | `src/components/chart/ChartContainer.tsx`, `IndicatorOverlay.tsx`, `ChartToolbar.tsx` | ✅ |
| 指标计算 API | `src/app/api/indicators/route.ts` | ✅ |
| 自定义公式计算器 (表达式解析器，支持 SMA/EMA/RSI/MACD/BB/ATR/ADX/STOCH/MAX/MIN + 四则运算) | `src/lib/indicators/formula-engine.ts` | ✅ |
| 公式计算 API + UI (6 个预设公式、实时预览图表) | `src/app/api/formula/route.ts`, `src/components/interactive/FormulaCalculator.tsx` | ✅ |

### 3. 因子系统

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 技术因子库 (21 个：MA/EMA/RSI/MACD/BB/ATR/ADX/Stochastic/OBV/ROC/CCI/KST/WMA/VWAP + DMI±/ADX强度/Ichimoku云图/Vortex±/PutCall比/做空利率/VIX代理) | `src/lib/factors/factor-library.ts` | ✅ |
| 基本面因子 (6 个: PE/PEG/PB/股息率/EPS增长/Beta) | `src/lib/factors/fundamental-factors.ts` | ✅ |
| 因子筛选引擎 (3 种打分方法) | `src/lib/factors/screening-engine.ts` | ✅ |
| 因子有效性分析 (IC/IR/衰减/换手率) | `src/lib/factors/factor-metrics.ts` | ✅ |
| 因子相关性矩阵 | `src/lib/factors/factor-correlation.ts` | ✅ |
| 因子 PCA 降维分析 (幂迭代特征分解、方差解释率图、因子载荷可视化、冗余因子识别) | `src/lib/factors/factor-pca.ts`, `src/app/api/factors/pca/route.ts`, `src/components/factors/FactorPCAAnalysis.tsx` | ✅ |
| 4 个预设策略模板 (价值/动量/质量/低波动) | `src/lib/factors/strategy-templates.ts` | ✅ |
| 因子筛选/有效性/相关性/优化 API | `src/app/api/factors/**/*.ts` | ✅ |
| IC 图表 / IC 衰减图 / IC_IR 图 / 分组收益图 | `src/components/factors/IcChart.tsx`, `IcDecayChart.tsx`, `IcIrChart.tsx`, `GroupReturnChart.tsx` | ✅ |
| 因子相关性热力图 | `src/components/factors/FactorCorrelationHeatmap.tsx` | ✅ |
| **TensorFlow.js LSTM ML 因子** — 历史数据训练 LSTM 模型，预测未来涨跌概率 (BUY/SELL/HOLD 信号)，可作为筛选因子 | `src/lib/ml/price-predictor.ts`, `src/app/api/ml/train|predict/route.ts`, `src/components/factors/MLFactorPanel.tsx`, `MLModelTrainer.tsx` | ✅ |

### 4. 回测引擎

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 核心回测引擎 (多策略/再平衡) | `src/lib/backtest/engine.ts` | ✅ |
| 成本模型 (佣金/滑点/印花税/分红再投资) | `src/lib/backtest/cost-model.ts` | ✅ |
| 仓位管理 (现金/持仓/再平衡) | `src/lib/backtest/position-manager.ts` | ✅ |
| 风险指标计算 (Sharpe/Sortino/Calmar/VaR/CVaR 等 20+ 指标) | `src/lib/backtest/risk-metrics.ts` | ✅ |
| 网格搜索参数优化 | `src/lib/backtest/grid-search.ts` | ✅ |
| 蒙特卡洛模拟 | `src/lib/backtest/monte-carlo.ts` | ✅ |
| Walk-Forward 分析 | `src/lib/backtest/walk-forward.ts` | ✅ |
| 基准对比 (Alpha/Beta/跟踪误差/R²) | `src/lib/backtest/benchmark-calculator.ts` | ✅ |
| 回测 UI (Form/Result/TradeLog/Benchmark) | `src/components/analysis/backtest/`, `src/components/analysis/BacktestRunner.tsx` | ✅ |
| 组合回测 UI 增强 (月度收益热力图 + 回撤热力图集成到 ReportPanel; 批量回测入口 BatchBacktestModal) | `src/components/analysis/portfolio-backtest/ReportPanel.tsx`, `src/components/analysis/BatchBacktestModal.tsx` | ✅ |
| 月度收益热力图 (12 列 × N 年月格，8 级红绿配色) | `src/components/analysis/MonthlyReturnsHeatmap.tsx` | ✅ |
| 回撤热力图 (回撤面积图，含最大/平均/当前回撤统计) | `src/components/analysis/DrawdownHeatmap.tsx` | ✅ |
| 回测 API 路由 (创建/执行/montecarlo/walkforward/report) | `src/app/api/backtests/**/*.ts` | ✅ |
| 事件驱动回测 (EventSignalEngine，支持财报/FOMC/CPI/分红除权事件信号注入、事件日历) | `src/lib/backtest/event-signal-engine.ts`, `src/app/api/backtests/event-driven/route.ts` | ✅ |
| 批量回测并行化 (Worker Threads + Promise.all 数据并发获取，默认 4 并发) | `src/lib/backtest/batch-worker.ts`, `src/lib/backtest/batch-runner.ts`, `/api/backtests/batch` | ✅ |
| **Strategy Battle** — 多策略同区间对比，9 项指标自动排名 + 雷达图 + 权益曲线叠加 | `src/components/analysis/StrategyBattle.tsx`, `src/app/api/backtests/compare/route.ts` | ✅ |

### 5. 模拟交易 (Paper Trading)

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| PaperAccount / PaperPosition / PaperOrder 数据模型 | `prisma/schema.prisma` | ✅ |
| 模拟交易核心逻辑 (账户创建/订单下单/成交执行/持仓更新) | `src/lib/paper-trade.ts` | ✅ |
| 模拟交易 CRUD + 订单执行 API | `src/app/api/paper-trading/**/*.ts` | ✅ |

### 6. 组合分析

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 五维健康评分 (集中度/波动率/相关性/流动性/风险调整收益) | `src/lib/portfolio/health-score.ts` | ✅ |
| 风险监控 (回撤/集中度/VaR/相关性阈值预警) | `src/lib/portfolio/risk-monitor.ts` | ✅ |
| 仓位优化器 (风险平价/最小方差/最大夏普/等权) | `src/lib/portfolio/allocation.ts` | ✅ |
| Barra 风格因子暴露度分析 (8 个因子、雷达图 + 柱状图 + 风险分解 + 智能建议) | `src/lib/portfolio/factor-exposure.ts`, `src/app/api/portfolio/factor-exposure/route.ts`, `src/components/portfolio/PortfolioFactorAnalysis.tsx` | ✅ |
| 组合 CRUD + 健康评分/持仓管理/优化 API | `src/app/api/portfolios/**/*.ts` | ✅ |
| 组合健康评分小部件 | `src/components/dashboard/widgets/PortfolioHealthWidget.tsx` | ✅ |

### 7. 预警与通知

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 预警引擎 (价格/指标/风险/组合) | `src/lib/realtime/alert-engine.ts` | ✅ |
| 邮件通知 (SMTP + 限速) | `src/lib/realtime/email-notifier.ts` | ✅ |
| 浏览器通知 | `src/lib/hooks/useBrowserNotifications.ts` | ✅ |
| 预警监控循环 (含指数退避重试，防止重复启动) | `src/lib/alert-monitor.ts` | ✅ |
| 预警 CRUD + 通知 API | `src/app/api/alerts/**/*.ts` | ✅ |

### 8. 仪表盘

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 小部件注册系统 (插件化) | `src/components/dashboard/WidgetRegistry.tsx` | ✅ |
| 快速行情/组合概览/风险指标/股票列表/预警列表/小图表 6 种小部件 | `src/components/dashboard/widgets/*.tsx`, `src/components/dashboard/stock-list.tsx` | ✅ |
| 仪表盘配置 UI | `DashboardSettings.tsx`, `NotificationSettings.tsx` | ✅ |
| WebSocket 预警桥接 | `AlertNotificationBridge.tsx` | ✅ |

### 9. 策略编辑器

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| JSON 策略编辑器 (条件组/条件行/动作配置 + 实时预览) | `src/app/strategy-editor/page.tsx`, `src/components/strategy-editor/*.tsx` | ✅ |
| 策略 CRUD + 执行/优化 API | `src/app/api/strategies/**/*.ts` | ✅ |
| **Git 风格版本管理** — 策略/回测版本快照、历史、diff、还原 (StrategyVersion/BacktestVersion) | `src/components/strategy-editor/VersionHistory.tsx`, `src/app/api/strategies|backtests/[id]/versions/**` | ✅ |

### 10. 学习系统

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 33 个量化术语词汇库 (中英双语) | `src/lib/learning/vocabulary.ts` | ✅ |
| 词汇百科页面 + 回测陷阱交互式演示 | `src/app/education/vocabulary.tsx`, `src/app/education/BacktestPitfalls.tsx` | ✅ |

### 11. 数据管理

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 批量历史数据下载 (UI + API) | `src/app/data-manager/`, `src/app/api/data-manager/route.ts` | ✅ |
| JSON 全量备份导出/导入 | `src/lib/export/backup.ts` | ✅ |
| CSV/HTML/PDF 回测报告导出 | `src/lib/export/exportUtils.ts` | ✅ |
| 备份管理 UI | `src/app/settings/data-management/page.tsx` | ✅ |
| 股票搜索 (中英文) + 搜索缓存 API | `src/app/api/search/route.ts`, `src/app/api/search/cache/**/*.ts` | ✅ |

### 12. 基础设施

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 结构化日志 (JSON 格式，含模块名/timestamp/error堆栈，LOG_LEVEL 环境变量控制) | `src/lib/logger.ts` | ✅ |
| 测试框架 (Vitest + 单元测试) | `vitest.config.ts`, `tests/**/*.test.ts` | ✅ |
| 统一错误处理系统 (AppError + handleApiError，53 个 API routes 一致的错误响应) | `src/lib/errors.ts` | ✅ |
| Playwright E2E 测试配置 | `playwright.config.ts`, `tests/e2e/` | ✅ |
| API 文档 | `docs/api/API.md` | ✅ |
| 开发者指南 | `docs/DEVELOPER.md` | ✅ |

### 13. 学习增强

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 交互式学习路径引导 | `src/lib/learning/path.ts`, `src/components/learning/OnboardingFlow.tsx`, `src/components/learning/OnboardingGuard.tsx`, `src/app/onboarding/page.tsx` | ✅ |
| 回测可靠性评估工具 | `src/lib/backtest/reliability-scorer.ts`, `src/app/api/backtests/reliability/route.ts`, `src/components/analysis/BacktestReliabilityPanel.tsx` | ✅ |
| 参数敏感性分析可视化 | `src/lib/backtest/sensitivity-analysis.ts`, `src/app/api/backtests/sensitivity/route.ts`, `src/components/analysis/SensitivityChart.tsx` | ✅ |
| 智能预警推荐 | `src/lib/realtime/smart-alert-recommender.ts`, `src/app/api/alerts/recommend/route.ts` | ✅ |
| 策略相似度搜索 | `src/lib/strategies/similarity-search.ts`, `src/app/api/strategies/similar/route.ts` | ✅ |

---

## Changelog

| 日期 | 变更 |
|------|------|
| 2026-04-05 | 初始功能盘点，整理已实现功能 + 缺口列表 |
| 2026-04-05 | 完成 4 项技术债务修复（回测日期参数化、因子库整合、结构化日志、预警监控健壮性）|
| 2026-04-05 | 完成 4 项高优先级功能：因子库扩展至 21 个因子、模拟交易系统、自定义公式计算器、月度收益/回撤热力图 |
| 2026-04-05 | 批量回测并行化、组合回测 UI 增强、因子 PCA 降维分析、事件驱动回测、Barra 因子暴露度分析、PDF 报告全部完成 |
| 2026-04-05 | 中优先级全部 6 项完成，feature-summary 重写为项目总览格式 |
| 2026-04-05 | 低优先级全部 4 项完成：Strategy Battle 多策略对比竞争、策略/回测版本管理 (Git 风格)、TensorFlow.js LSTM ML 选股因子、Vitest 测试框架 (76 个测试用例)；功能待办已全部清零 |
| 2026-04-06 | 学习增强（交互式学习路径、回测可靠性评估、参数敏感性分析）、高级分析（智能预警推荐、策略相似度搜索）、基础设施（统一错误处理、Playwright E2E、API 文档、开发者指南）、依赖安全审计、性能优化（Suspense + 懒加载） |
