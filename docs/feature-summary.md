# FinDec 功能总结与待办

> 文档位置: `docs/feature-summary.md`
> 创建时间: 2026-04-05
> 用途: 功能现状盘点 + 缺口追踪

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
| 指标计算引擎 (MA/EMA/RSI/MACD/BB/ATR/ADX/Stochastic/OBV/VWAP) | `src/lib/indicators/calculator.ts` | ✅ |
| 指标注册表 | `src/lib/indicators.ts` | ✅ |
| 交易信号注解 (BUY/SELL) | `src/lib/indicators/signal-decorator.ts` | ✅ |
| K 线图表 + 指标叠加 (Lightweight Charts) | `src/components/chart/ChartContainer.tsx`, `IndicatorOverlay.tsx`, `ChartToolbar.tsx` | ✅ |
| 指标计算 API | `src/app/api/indicators/route.ts` | ✅ |

### 3. 因子系统

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 技术因子库 (10 个) | `src/lib/factors/factor-library.ts` | ✅ |
| 基本面因子 (6 个: PE/PEG/PB/股息率/EPS增长/Beta) | `src/lib/factors/fundamental-factors.ts` | ✅ |
| 因子筛选引擎 (3 种打分方法) | `src/lib/factors/screening-engine.ts` | ✅ |
| 因子有效性分析 (IC/IR/衰减/换手率) | `src/lib/factors/factor-metrics.ts` | ✅ |
| 因子相关性矩阵 | `src/lib/factors/factor-correlation.ts` | ✅ |
| 4 个预设策略模板 (价值/动量/质量/低波动) | `src/lib/factors/strategy-templates.ts` | ✅ |
| 因子筛选/有效性/相关性/优化 API | `src/app/api/factors/**/*.ts` | ✅ |
| IC 图表 / IC 衰减图 / IC_IR 图 / 分组收益图 | `src/components/factors/IcChart.tsx`, `IcDecayChart.tsx`, `IcIrChart.tsx`, `GroupReturnChart.tsx` | ✅ |
| 因子相关性热力图 | `src/components/factors/FactorCorrelationHeatmap.tsx` | ✅ |

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
| 回测 API 路由 (创建/执行/montecarlo/walkforward/report) | `src/app/api/backtests/**/*.ts` | ✅ |

### 5. 组合分析

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 五维健康评分 (集中度/波动率/相关性/流动性/风险调整收益) | `src/lib/portfolio/health-score.ts` | ✅ |
| 风险监控 (回撤/集中度/VaR/相关性阈值预警) | `src/lib/portfolio/risk-monitor.ts` | ✅ |
| 仓位优化器 (风险平价/最小方差/最大夏普/等权) | `src/lib/portfolio/allocation.ts` | ✅ |
| 组合 CRUD | `src/app/api/portfolios/route.ts` | ✅ |
| 组合健康评分 API | `src/app/api/portfolios/[id]/health/route.ts` | ✅ |
| 组合持仓管理 API | `src/app/api/portfolios/[id]/positions/route.ts` | ✅ |
| 组合优化 API | `src/app/api/portfolios/[id]/optimize/route.ts` | ✅ |
| 组合健康评分小部件 | `src/components/dashboard/widgets/PortfolioHealthWidget.tsx` | ✅ |

### 6. 预警与通知

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 预警引擎 (价格/指标/风险/组合) | `src/lib/realtime/alert-engine.ts` | ✅ |
| 邮件通知 (SMTP + 限速) | `src/lib/realtime/email-notifier.ts` | ✅ |
| 浏览器通知 | `src/lib/hooks/useBrowserNotifications.ts` | ✅ |
| 预警监控循环 | `src/lib/alert-monitor.ts` | ✅ |
| 预警 CRUD API | `src/app/api/alerts/route.ts` | ✅ |
| 预警通知 API | `src/app/api/alerts/[id]/notify/route.ts` | ✅ |

### 7. 仪表盘

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 小部件注册系统 (插件化) | `src/components/dashboard/WidgetRegistry.tsx` | ✅ |
| 快速行情小部件 | `src/components/dashboard/quick-quote.tsx` | ✅ |
| 组合概览小部件 | `src/components/dashboard/widgets/PortfolioOverviewWidget.tsx` | ✅ |
| 风险指标小部件 | `src/components/dashboard/widgets/RiskMetricsWidget.tsx` | ✅ |
| 股票列表小部件 | `src/components/dashboard/stock-list.tsx` | ✅ |
| 预警列表小部件 | `src/components/dashboard/AlertListWidget.tsx` | ✅ |
| 小图表小部件 | `src/components/dashboard/widgets/MiniChartWidget.tsx` | ✅ |
| 仪表盘配置 UI | `DashboardSettings.tsx`, `NotificationSettings.tsx` | ✅ |
| WebSocket 预警桥接 | `AlertNotificationBridge.tsx` | ✅ |

### 8. 策略编辑器

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| JSON 策略编辑器页面 | `src/app/strategy-editor/page.tsx` | ✅ |
| 条件组/条件行/动作配置 UI | `src/components/strategy-editor/ConditionGroup.tsx`, `ConditionRow.tsx`, `ActionConfig.tsx` | ✅ |
| 策略实时预览 | `src/components/strategy-editor/StrategyPreview.tsx` | ✅ |
| 策略 CRUD + 执行/优化 API | `src/app/api/strategies/**/*.ts` | ✅ |

### 9. 学习系统

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 33 个量化术语词汇库 (中英双语) | `src/lib/learning/vocabulary.ts` | ✅ |
| 词汇百科页面 | `src/app/education/vocabulary.tsx` | ✅ |
| 回测陷阱交互式演示 | `src/app/education/BacktestPitfalls.tsx` | ✅ |

### 10. 数据管理

| 功能 | 核心文件 | 状态 |
|------|----------|------|
| 批量历史数据下载 (UI + API) | `src/app/data-manager/`, `src/app/api/data-manager/route.ts` | ✅ |
| JSON 全量备份导出/导入 | `src/lib/export/backup.ts` | ✅ |
| CSV/HTML 回测报告导出 | `src/lib/export/exportUtils.ts` | ✅ |
| 备份管理 UI | `src/app/settings/data-management/page.tsx` | ✅ |
| 股票搜索 (中英文) | `src/app/api/search/route.ts` | ✅ |
| 搜索缓存 API | `src/app/api/search/cache/route.ts`, `cache/status/route.ts` | ✅ |

---

## 二、功能缺口与待办

### 🔴 高优先级

- [ ] **因子库扩展** — 添加量价因子 (DMI, Ichimoku, Vortex)、情绪因子 (Put/Call Ratio, Short Interest)、宏观因子 (VIX 相关)
- [ ] **实盘模拟交易 (Paper Trading)** — 将回测信号转化为模拟订单，追踪模拟持仓和浮动盈亏，新增 `PaperTrade` 模型和 API
- [ ] **自定义指标公式计算器** — 用户 UI 定义公式（如 `SMA(close,20)/SMA(close,50)-1`）实时计算，类似 TradingView 脚本
- [ ] **月度收益热力图 + 回撤热力图** — 已有 `BacktestChart.tsx`，扩展为 QuantConnect 风格多维可视化

### 🟡 中优先级

- [ ] **因子 PCA / 降维分析** — 主成分分析识别冗余因子
- [ ] **事件驱动回测** — 财报发布、宏观事件对股价影响的建模
- [ ] **组合因子暴露度分析** — Barra 风格因子暴露计算
- [ ] **批量回测并行化** — Worker Threads 或任务队列并行执行多股票回测
- [ ] **PDF 回测报告自动生成** — 已有 CSV/HTML 基础，扩展 PDF 格式
- [ ] **组合回测 UI 增强** — 完整的 `PortfolioBacktestRunner` UI，已有部分组件

### 🟢 低优先级

- [ ] **策略/回测版本管理** — Git 风格版本历史与回滚
- [ ] **多策略同区间对比竞争 (Strategy Battle)** — 自动排名与可视化对比
- [ ] **机器学习选股集成** — TensorFlow.js 价格预测模型作为筛选因子
- [ ] **移动端适配** — 仪表盘和预警的响应式移动 UI
- [ ] **国际化 (i18n)** — 中英文切换支持
- [ ] **策略市场 / 社区分享** — 用户发布策略模板、社区投票评论（需用户系统和权限）
- [ ] **数据库测试覆盖** — 当前无测试框架，Prisma 模型和关键 API 路由缺少单元测试

---


## Changelog

| 日期 | 变更 |
|------|------|
| 2026-04-05 | 初始功能盘点，整理已实现功能 + 缺口列表 |
