# Findec 美股量化分析平台改进设计

## 项目定位

**定位：学习和教育工具**

让用户理解量化交易的基本概念，学习技术指标、回测原理、因子筛选和组合管理。全面覆盖回测→指标→因子→组合的学习路径。

## 需求总结

| 维度 | 要求 |
|------|------|
| 数据 | 真实数据为主，让学习者看到真实策略表现 |
| 回测精度 | 进阶组合模型：多资产组合、资金分配、风险指标 |
| 可视化 | 全面可视化：权益曲线、指标叠加K线、因子分布、组合风险图表 |
| 实施策略 | 框架先行式：先搭核心框架，再填充细节 |

---

## 架构设计

### 核心架构：组合优先

将现有单模块架构升级为组合优先架构：

```
src/lib/
├── data/              # 数据层（新增）
│   ├── data-source.ts    # 数据源抽象（Yahoo/Mock可切换）
│   ├── rate-limiter.ts   # API调用限流
│   └── cache-manager.ts  # 数据缓存管理
│
├── backtest/          # 回测层（重构）
│   ├── engine.ts         # 组合级回测引擎
│   ├── cost-model.ts     # 交易成本模型（佣金+滑点）
│   ├── position-manager.ts # 多资产仓位管理
│   ├── risk-metrics.ts   # 组合风险指标
│   └── signal-generator.ts # 策略信号生成
│
├── indicators/        # 指标层（扩展）
│   ├── calculator.ts     # 指标计算（统一返回结构）
│   ├── signal-decorator.ts # K线信号标注
│   └── factor-extractor.ts # 从指标提取因子值
│
├── factors/           # 因子层（新增）
│   ├── factor-library.ts # 因子定义和计算
│   ├── screening-engine.ts # 筛选执行
│   ├── factor-metrics.ts  # 因子有效性分析
│
├── portfolio/         # 组合层（扩展）
│   ├── metrics.ts        # 组合指标（现有扩展）
│   ├── risk-monitor.ts   # 风险监控
│   └── allocation.ts     # 仓位优化建议
│
└── realtime/          # 实时层（新增）
    ├── price-stream.ts   # 实时价格流
    ├── alert-engine.ts   # 预警引擎（WebSocket接入）
    └── dashboard-data.ts # Dashboard数据聚合
```

---

## 模块详细设计

### 1. 数据层 (data/)

**目标：可靠的真实数据获取，Mock作为备选**

#### data-source.ts

```typescript
interface DataSourceConfig {
  primary: 'yahoo' | 'alpha-vantage' | 'iex'
  fallback: 'mock' | 'cache'
  mockMode: boolean  // 开发模式开关
}

interface DataPoint {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
  source: 'yahoo' | 'mock' | 'cache'
  sourceTimestamp: Date
}

class DataSource {
  // 获取历史数据，自动fallback
  async getHistoricalData(symbol: string, range: string): Promise<DataPoint[]>
  
  // 获取实时报价
  async getQuote(symbol: string): Promise<Quote>
  
  // 数据源健康检查
  async checkHealth(): Promise<{ yahoo: boolean, fallback: boolean }>
}
```

#### rate-limiter.ts

```typescript
interface RateLimitConfig {
  maxRequestsPerSecond: number
  maxRequestsPerMinute: number
  cooldownMs: number
}

class RateLimiter {
  // 包装API调用，自动限流
  async wrap<T>(fn: () => Promise<T>): Promise<T>
  
  // 获取当前速率状态
  getStatus(): { currentRate: number, isLimited: boolean }
}
```

#### cache-manager.ts

```typescript
interface CacheEntry {
  symbol: string
  range: string
  data: DataPoint[]
  cachedAt: Date
  expiresAt: Date
  source: string
}

class CacheManager {
  // 获取缓存（检查过期）
  async get(symbol: string, range: string): Promise<CacheEntry | null>
  
  // 设置缓存
  async set(symbol: string, range: string, data: DataPoint[]): Promise<void>
  
  // 清理过期缓存
  async cleanup(): Promise<void>
}
```

---

### 2. 回测层 (backtest/)

**目标：组合级回测，包含成本模型和风险指标**

#### engine.ts - 组合回测引擎

```typescript
interface PortfolioBacktestConfig {
  initialCapital: number
  symbols: string[]
  allocation: { [symbol: string]: number }  // 初始权重
  strategies: {
    symbol: string
    type: 'ma_crossover' | 'rsi' | 'macd' | 'custom'
    parameters: Record<string, number>
  }[]
  rebalance: 'none' | 'weekly' | 'monthly' | 'threshold'
  rebalanceThreshold: number  // 权重偏离阈值
}

interface PortfolioBacktestResult {
  // 组合级指标
  portfolioEquityCurve: { date: Date; value: number }[]
  portfolioReturn: number
  portfolioSharpe: number
  portfolioMaxDrawdown: number
  portfolioVolatility: number
  portfolioSortino: number
  portfolioCalmar: number
  
  // 资产级指标
  assetResults: { [symbol: string]: AssetBacktestResult }
  
  // 交易记录
  trades: PortfolioTrade[]
  
  // 风险分解
  riskDecomposition: {
    assetContribution: { [symbol: string]: number }
    correlationMatrix: number[][]
  }
}

class PortfolioBacktestEngine {
  async run(config: PortfolioBacktestConfig): Promise<PortfolioBacktestResult>
}
```

#### cost-model.ts - 交易成本模型

```typescript
interface CostModelConfig {
  commission: {
    type: 'fixed' | 'percent' | 'both'
    fixedPerTrade: number      // $5/笔
    percentOfValue: number     // 0.1%
  }
  slippage: {
    model: 'fixed' | 'spread' | 'volatility'
    fixedPercent: number       // 0.05%
    spreadMultiplier: number   // 1.5x bid-ask spread
  }
  marketImpact: {
    enabled: boolean
    coefficient: number        // 基于交易量占日均量的比例
  }
}

interface TradeCost {
  commission: number
  slippage: number
  marketImpact: number
  total: number
}

class CostModel {
  calculateBuyCost(price: number, quantity: number, volumeRatio: number): TradeCost
  calculateSellCost(price: number, quantity: number, volumeRatio: number): TradeCost
}
```

#### position-manager.ts - 多资产仓位管理

```typescript
interface Position {
  symbol: string
  quantity: number
  entryPrice: number
  currentPrice: number
  weight: number           // 当前权重
  targetWeight: number     // 目标权重
  unrealizedPnL: number
}

interface PortfolioState {
  cash: number
  positions: Position[]
  totalValue: number
  weights: { [symbol: string]: number }
}

class PositionManager {
  // 检查是否需要再平衡
  needsRebalance(state: PortfolioState, threshold: number): boolean
  
  // 计算再平衡交易
  calculateRebalanceTrades(state: PortfolioState): Trade[]
  
  // 执行交易，更新状态
  executeTrade(state: PortfolioState, trade: Trade, cost: TradeCost): PortfolioState
}
```

#### risk-metrics.ts - 组合风险指标

```typescript
interface PortfolioRiskMetrics {
  // 基础风险指标
  volatility: number           // 日波动率
  annualizedVolatility: number
  maxDrawdown: number
  maxDrawdownDuration: number  // 天数
  
  // 风险调整收益
  sharpeRatio: number
  sortinoRatio: number         // 只考虑下行波动
  calmarRatio: number          // 收益/最大回撤
  
  // 风险分解
  valueAtRisk95: number        // 95% VaR
  valueAtRisk99: number        // 99% VaR
  expectedShortfall: number    // CVaR
  
  // 资产贡献
  assetRiskContribution: { [symbol: string]: number }
  
  // 连续统计
  maxConsecutiveLosses: number
  maxConsecutiveWins: number
  avgLossDuration: number
  avgWinDuration: number
}

class RiskMetricsCalculator {
  calculate(equityCurve: EquityPoint[], assetReturns: AssetReturns): PortfolioRiskMetrics
  
  // 单指标计算
  calculateVolatility(returns: number[]): number
  calculateMaxDrawdown(equityCurve: EquityPoint[]): { drawdown: number, duration: number }
  calculateVaR(returns: number[], confidence: number): number
  calculateSortino(returns: number[], riskFreeRate: number): number
}
```

---

### 3. 指标层 (indicators/)

**目标：统一结构，支持信号标注**

#### calculator.ts - 指标计算器

```typescript
interface IndicatorValue {
  name: string           // 'ma20', 'rsi14', 'macd'
  period: number         // 对应的周期
  values: number[]       // 与K线对齐（前面填充null）
  latest: number         // 最新值
}

interface IndicatorResult {
  date: Date
  close: number
  indicators: { [name: string]: number }
  signals: Signal[]
}

interface Signal {
  type: 'buy' | 'sell' | 'hold'
  source: string         // 哪个指标触发
  strength: number       // 0-1 强度
  reason: string         // 解释
}

class IndicatorCalculator {
  // 计算，返回对齐结果
  calculate(data: HistoricalPrice[], config: IndicatorConfig): IndicatorResult[]
  
  // 单指标计算
  calculateMA(data: number[], period: number): IndicatorValue
  calculateRSI(data: number[], period: number): IndicatorValue
  calculateMACD(data: number[], config: MACDConfig): IndicatorValue[]
  calculateBollinger(data: number[], period: number, stdDev: number): IndicatorValue[]
  calculateATR(data: HistoricalPrice[], period: number): IndicatorValue
  calculateADX(data: HistoricalPrice[], period: number): IndicatorValue
  calculateStochastic(data: HistoricalPrice[], config: StochConfig): IndicatorValue[]
}
```

#### signal-decorator.ts - K线信号标注

```typescript
interface DecoratedCandle {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
  
  // 指标值
  indicators: { [name: string]: number }
  
  // 信号
  primarySignal: Signal      // 主信号
  confirmingSignals: Signal[] // 确认信号
  
  // 标注
  annotations: Annotation[]
}

interface Annotation {
  type: 'buy_marker' | 'sell_marker' | 'indicator_cross' | 'threshold_hit'
  position: 'above' | 'below' | 'inline'
  text: string
  color: string
}

class SignalDecorator {
  decorate(data: IndicatorResult[]): DecoratedCandle[]
  
  // 标注买卖点
  markTradePoints(candles: DecoratedCandle[], trades: Trade[]): DecoratedCandle[]
}
```

---

### 4. 因子层 (factors/)

**目标：因子定义清晰，筛选有效**

#### factor-library.ts - 因子库

```typescript
interface FactorDefinition {
  id: string
  name: string
  category: 'technical' | 'fundamental' | 'sentiment' | 'custom'
  description: string
  calculation: FactorCalculation
  normalRange: { min: number, max: number }
  interpretation: string  // 高值/低值含义
}

interface FactorCalculation {
  type: 'indicator_value' | 'indicator_signal' | 'price_ratio' | 'custom'
  indicator?: string
  transform?: 'raw' | 'rank' | 'zscore' | 'percentile'
  lookback?: number
}

interface FactorValue {
  factorId: string
  symbol: string
  date: Date
  value: number
  rank?: number           // 在所有股票中的排名
  zscore?: number
}

// 技术因子库
const TECHNICAL_FACTORS: FactorDefinition[] = [
  { id: 'ma20_position', name: 'MA20位置', category: 'technical',
    description: '价格相对于MA20的位置',
    calculation: { type: 'price_ratio', transform: 'raw' },
    normalRange: { min: -20, max: 20 },
    interpretation: '正值表示高于均线，负值低于' },
  
  { id: 'rsi_value', name: 'RSI值', category: 'technical',
    description: 'RSI(14)当前值',
    calculation: { type: 'indicator_value', indicator: 'rsi14', transform: 'raw' },
    normalRange: { min: 0, max: 100 },
    interpretation: '>70超买，<30超卖' },
  
  { id: 'macd_signal', name: 'MACD信号', category: 'technical',
    description: 'MACD与信号线关系',
    calculation: { type: 'indicator_signal', indicator: 'macd' },
    normalRange: { min: -1, max: 1 },
    interpretation: '正为多头，负为空头' },
  
  { id: 'volatility_20d', name: '20日波动率', category: 'technical',
    description: '过去20日收益率标准差',
    calculation: { type: 'custom', lookback: 20 },
    normalRange: { min: 0, max: 100 },
    interpretation: '高波动=高风险' },
  
  { id: 'momentum_10d', name: '10日动量', category: 'technical',
    description: '10日价格变化百分比',
    calculation: { type: 'custom', lookback: 10 },
    normalRange: { min: -50, max: 50 },
    interpretation: '正值上涨动量，负值下跌' },
  
  { id: 'atr_ratio', name: 'ATR/价格比率', category: 'technical',
    description: 'ATR占价格的百分比',
    calculation: { type: 'indicator_value', indicator: 'atr14', transform: 'raw' },
    normalRange: { min: 0, max: 10 },
    interpretation: '高值表示波动大' },
]

class FactorLibrary {
  getFactor(id: string): FactorDefinition
  getAllFactors(category?: string): FactorDefinition[]
  calculateFactor(factorId: string, data: HistoricalPrice[]): number
  calculateAllFactors(data: HistoricalPrice[]): FactorValue[]
}
```

#### screening-engine.ts - 筛选引擎

```typescript
interface ScreeningRule {
  factorId: string
  operator: '>' | '<' | '>=' | '<=' | '==' | 'between'
  value: number | [number, number]
  weight: number
}

interface ScreeningStrategy {
  id: string
  name: string
  rules: ScreeningRule[]
  scoringMethod: 'weighted_sum' | 'rank_sum' | 'threshold_count'
}

interface ScreeningResult {
  symbol: string
  score: number
  matchedFactors: string[]
  factorValues: { [factorId: string]: number }
  rank?: number
}

class ScreeningEngine {
  // 执行筛选
  screen(strategy: ScreeningStrategy, symbols: string[]): Promise<ScreeningResult[]>
  
  // 单股票评分
  scoreSymbol(strategy: ScreeningStrategy, factorValues: FactorValue[]): number
  
  // 加权评分
  weightedScore(rules: ScreeningRule[], values: FactorValue[]): number
  
  // 排名评分
  rankScore(rules: ScreeningRule[], ranks: FactorValue[]): number
}
```

#### factor-metrics.ts - 因子有效性分析

```typescript
interface FactorPerformance {
  factorId: string
  ic: number              // Information Coefficient
  icIr: number            // IC的IR
  positiveRatio: number   // IC>0的比例
  monotonicity: number    // 分组收益单调性
  turnover: number        // 因子值变化率
}

interface FactorDecay {
  factorId: string
  halfLife: number        // 因子信息半衰期（天）
  decayCurve: number[]    // 每日IC衰减
}

class FactorMetricsCalculator {
  // 计算IC（因子值与未来收益的相关性）
  calculateIC(factorValues: FactorValue[], futureReturns: FutureReturn[]): number
  
  // 因子有效性综合评估
  evaluateFactor(factorId: string, historicalData: FactorHistory): FactorPerformance
  
  // 因子衰减分析
  analyzeDecay(factorId: string, historicalData: FactorHistory): FactorDecay
}
```

---

### 5. 组合层 (portfolio/)

**目标：实时风险监控，仓位优化**

#### risk-monitor.ts - 风险监控

```typescript
interface RiskAlert {
  type: 'drawdown' | 'concentration' | 'volatility' | 'correlation'
  severity: 'warning' | 'critical'
  message: string
  current: number
  threshold: number
  recommendations: string[]
}

class RiskMonitor {
  // 实时风险检查
  checkRisk(portfolio: PortfolioState, config: RiskThresholds): RiskAlert[]
  
  // 集中度风险
  checkConcentration(weights: Record<string, number>, maxWeight: number): RiskAlert | null
  
  // 回撤风险
  checkDrawdown(equityCurve: EquityPoint[], maxDrawdown: number): RiskAlert | null
  
  // 波动率风险
  checkVolatility(returns: number[], maxVolatility: number): RiskAlert | null
}
```

#### allocation.ts - 仓位优化

```typescript
interface AllocationSuggestion {
  currentWeights: Record<string, number>
  suggestedWeights: Record<string, number>
  trades: Trade[]
  reason: string
  expectedImprovement: {
    riskReduction: number
    returnImprovement: number
  }
}

class AllocationOptimizer {
  // 风险平价
  riskParity(volatilities: Record<string, number>): Record<string, number>
  
  // 均值方差优化（简化版）
  meanVariance(returns: Record<string, number[]>, targetReturn: number): Record<string, number>
  
  // 最小波动
  minVolatility(correlations: number[][]): Record<string, number>
  
  // 等权重
  equalWeight(symbols: string[]): Record<string, number>
}
```

---

### 6. 实时层 (realtime/)

**目标：WebSocket驱动，推送更新**

#### alert-engine.ts - 预警引擎

```typescript
interface AlertCondition {
  type: 'price' | 'indicator' | 'factor' | 'risk'
  symbol?: string
  metric: string
  operator: '>' | '<' | 'cross_above' | 'cross_below'
  threshold: number
}

interface AlertEvent {
  alertId: string
  condition: AlertCondition
  triggeredAt: Date
  currentValue: number
  message: string
}

class AlertEngine {
  // 实时检查
  check(conditions: AlertCondition[], data: RealtimeData): AlertEvent[]
  
  // 注册预警（WebSocket订阅）
  register(alertId: string, condition: AlertCondition): void
  
  // 取消预警
  unregister(alertId: string): void
  
  // 推送触发事件
  broadcast(event: AlertEvent): void
}
```

---

## 数据流设计

### 回测数据流

```
用户配置 → PortfolioBacktestConfig
    ↓
DataSource.getHistoricalData(symbols[])
    ↓
IndicatorCalculator.calculate(data[], configs[])
    ↓
SignalGenerator.generateSignals(indicators[])
    ↓
PositionManager.managePortfolio(signals[], costs)
    ↓
RiskMetricsCalculator.calculate(equityCurve)
    ↓
PortfolioBacktestResult → 可视化
```

### 因子筛选数据流

```
ScreeningStrategy配置
    ↓
DataSource.getHistoricalData(symbols[])
    ↓
FactorLibrary.calculateAllFactors(data[])
    ↓
ScreeningEngine.screen(strategy, factorValues)
    ↓
ScreeningResult[] → 排序/过滤 → 可视化
```

### 实时监控数据流

```
WebSocket连接
    ↓
PriceStream.subscribe(symbols[])
    ↓
AlertEngine.check(conditions[], realtimeData)
    ↓
WebSocket.emit('alert-triggered', event)
    ↓
DashboardData.aggregate(portfolio, alerts)
    ↓
前端Dashboard更新
```

---

## API 设计

### 回测 API

```
POST /api/backtests/portfolio
  Body: {
    name: string
    symbols: string[]
    initialCapital: number
    allocation: Record<string, number>
    strategies: StrategyConfig[]
    costModel: CostModelConfig
    startDate: Date
    endDate: Date
  }
  Response: {
    planId: string
    status: 'pending'
  }

GET /api/backtests/portfolio/[id]/execute
  Response: PortfolioBacktestResult

GET /api/backtests/portfolio/[id]/report
  Response: {
    summary: BacktestSummary
    equityCurve: EquityPoint[]
    trades: Trade[]
    riskMetrics: RiskMetrics
    assetBreakdown: AssetResult[]
  }
```

### 因子 API

```
GET /api/factors/library
  Response: FactorDefinition[]

POST /api/factors/screen
  Body: {
    strategyId: string
    symbols: string[]
  }
  Response: ScreeningResult[]

GET /api/factors/performance/[factorId]
  Query: { startDate, endDate }
  Response: FactorPerformance
```

### 风险 API

```
GET /api/portfolio/[id]/risk
  Response: {
    current: RiskMetrics
    alerts: RiskAlert[]
    history: RiskMetricsHistory[]
  }

POST /api/portfolio/[id]/optimize
  Body: { method: 'risk_parity' | 'equal_weight' | 'min_vol' }
  Response: AllocationSuggestion
```

---

## 可视化设计

### 回测可视化组件

1. **权益曲线图**（Lightweight Charts）
   - 组合权益曲线
   - 基准对比线（SPY）
   - 最大回撤区域标注

2. **收益分布图**
   - 月度收益柱状图
   - 正负分布
   - 累积收益曲线

3. **风险指标仪表盘**
   - Sharpe/Sortino/Calmar 数字显示
   - VaR/ES 图表
   - 回撤深度/持续时间

4. **交易日志可视化**
   - 买卖点K线标注
   - 持仓时间热力图
   - 资金流向图

### 指标可视化组件

1. **指标叠加K线**
   - MA/EMA 线叠加
   - Bollinger Bands 区间
   - 成交量柱

2. **指标副图**
   - RSI 区域（超买超卖标注）
   - MACD 柱状图
   - 信号交叉标注

3. **信号解读面板**
   - 当前信号状态
   - 信号强度指示
   - 历史信号准确率

### 因子可视化组件

1. **因子分布图**
   - 单因子分布直方图
   - 当前股票位置标注

2. **筛选结果排行**
   - 评分排名表
   - 因子值对比

3. **因子相关性矩阵**
   - 热力图
   - 聚类分组

---

## 数据库扩展

### Prisma Schema 新增

```prisma
// 数据源元数据
model DataSourceMeta {
  id            String   @id @default(uuid())
  symbol        String
  date          DateTime
  source        String   // 'yahoo' | 'mock' | 'cache'
  sourceTimestamp DateTime
  createdAt     DateTime @default(now())
  
  @@unique([symbol, date])
}

// 因子历史值
model FactorHistory {
  id          String   @id @default(uuid())
  factorId    String
  symbol      String
  date        DateTime
  value       Float
  rank        Float?
  zscore      Float?
  createdAt   DateTime @default(now())
  
  @@unique([factorId, symbol, date])
}

// 组合回测计划（扩展）
model PortfolioBacktestPlan {
  id              String   @id @default(uuid())
  name            String
  symbols         String   // JSON array
  allocation      String   // JSON object
  strategies      String   // JSON array
  costModel       String   // JSON object
  initialCapital  Float
  startDate       DateTime
  endDate         DateTime
  status          String   @default("pending")
  
  // 组合级结果
  portfolioReturn Float?
  portfolioSharpe Float?
  portfolioSortino Float?
  portfolioCalmar Float?
  portfolioMaxDrawdown Float?
  portfolioVolatility Float?
  portfolioVaR95 Float?
  
  // 详细结果（JSON）
  equityCurve     String?  // JSON array
  riskMetrics     String?  // JSON object
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// 风险预警记录
model RiskAlertLog {
  id          String   @id @default(uuid())
  portfolioId String
  type        String
  severity    String
  message     String
  current     Float
  threshold   Float
  triggeredAt DateTime
  createdAt   DateTime @default(now())
}

// 实时预警扩展
model Alert {
  // ... 现有字段
  type        String   @default("price")  // 'price' | 'indicator' | 'factor' | 'risk'
  metric      String?  // 具体指标名
  broadcast   Boolean  @default(false)    // 是否已推送
}
```

---

## 实施阶段划分

### Phase 1: 框架搭建（2周）

**目标：核心架构可运行，数据流完整**

1. 数据层框架
   - DataSource 抽象类
   - RateLimiter 基础实现
   - CacheManager 基础实现

2. 回测层框架
   - PortfolioBacktestEngine 骨架
   - CostModel 基础实现
   - PositionManager 基础实现

3. 因子层框架
   - FactorLibrary 技术因子
   - ScreeningEngine 基础筛选

4. 数据库扩展
   - 新模型迁移

### Phase 2: 回测完善（2周）

**目标：组合回测可用，结果可信**

1. 多资产回测逻辑
2. 成本模型完整实现
3. 风险指标计算
4. 回测可视化组件

### Phase 3: 指标扩展（1周）

**目标：指标丰富，信号清晰**

1. 新指标计算（Bollinger, ATR, ADX, Stochastic）
2. 统一返回结构
3. K线信号标注
4. 指标可视化组件

### Phase 4: 因子深化（2周）

**目标：因子有效，筛选有意义**

1. 权重评分实现
2. 因子有效性分析
3. 因子历史存储
4. 因子可视化组件

### Phase 5: 组合监控（1周）

**目标：实时风险监控可用**

1. 风险监控实现
2. 仓位优化建议
3. WebSocket预警接入
4. Dashboard实时更新

### Phase 6: 教学增强（1周）

**目标：学习体验优化**

1. 解释性文字增强
2. 概念说明弹窗
3. 参数影响演示
4. 学习路径引导

---

## 成功标准

### Phase 1 完成标准

- DataSource 能可靠获取 Yahoo 数据
- PortfolioBacktestEngine 能运行简单组合回测
- ScreeningEngine 能执行基础因子筛选
- 新数据库模型迁移成功

### Phase 2 完成标准

- 组合回测包含成本模型
- 风险指标完整计算
- 权益曲线可视化可用
- 回测结果可保存和对比

### Phase 3 完成标准

- 至少8种技术指标可用
- K线信号标注清晰
- 指标参数可调

### Phase 4 完成标准

- 至少10个技术因子
- 因子评分使用权重
- 因子分布可视化
- 筛选结果排名展示

### Phase 5 完成标准

- 实时风险预警触发
- WebSocket推送正常
- 组合Dashboard更新

### Phase 6 完成标准

- 每个功能有概念说明
- 参数调整有实时反馈
- 有学习引导入口

---

## 技术依赖

### 新增依赖

```json
{
  "dependencies": {
    // 无新增核心依赖，使用现有：
    // - lightweight-charts (可视化)
    // - technicalindicators (指标计算)
    // - socket.io (实时)
    // - prisma (数据库)
  }
}
```

### 现有依赖充分利用

- `technicalindicators` 已支持 BollingerBands, ATR, ADX, Stochastic 等
- `lightweight-charts` 支持多图层、标注
- `socket.io` 支持房间订阅、定向推送

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| Yahoo API不稳定 | RateLimiter + Cache + Mock fallback |
| 回测计算慢 | 增量计算、结果缓存、后台任务 |
| WebSocket断连 | 重连机制、状态恢复 |
| 数据量大 | 分页加载、懒加载、压缩存储 |

---

## 附录：关键代码示例

### DataSource 优先级获取

```typescript
async getHistoricalData(symbol: string, range: string): Promise<DataPoint[]> {
  // 1. 检查缓存
  const cached = await this.cache.get(symbol, range)
  if (cached && !this.isExpired(cached)) {
    return cached.data.map(d => ({ ...d, source: 'cache' }))
  }
  
  // 2. 尝试 Yahoo
  try {
    await this.rateLimiter.wrap(() => {})
    const yahooData = await this.yahoo.getHistoricalData(symbol, range)
    const dataWithMeta = yahooData.map(d => ({
      ...d,
      source: 'yahoo',
      sourceTimestamp: new Date()
    }))
    await this.cache.set(symbol, range, dataWithMeta)
    return dataWithMeta
  } catch (error) {
    console.warn(`Yahoo fetch failed for ${symbol}:`, error)
  }
  
  // 3. Fallback to mock
  if (this.config.mockMode || this.config.fallback === 'mock') {
    return this.generateMockData(symbol, range)
  }
  
  throw new Error(`No data available for ${symbol}`)
}
```

### 组合回测核心循环

```typescript
async run(config: PortfolioBacktestConfig): Promise<PortfolioBacktestResult> {
  // 获取所有资产数据
  const allData = await this.fetchAllData(config.symbols, config.startDate, config.endDate)
  
  // 初始化组合状态
  let state = this.initializePortfolio(config)
  
  // 按日期迭代
  for (const date of this.getDateRange(config.startDate, config.endDate)) {
    // 计算所有资产的指标和信号
    const signals = this.generateSignals(allData, date, config.strategies)
    
    // 检查是否需要再平衡
    if (this.needsRebalance(state, signals, config)) {
      const trades = this.calculateRebalance(state, signals, config)
      for (const trade of trades) {
        const cost = this.costModel.calculate(trade)
        state = this.executeTrade(state, trade, cost)
        this.recordTrade(trade, cost, date)
      }
    }
    
    // 更新价格和权益
    state = this.updatePrices(state, allData, date)
    this.recordEquity(state, date)
  }
  
  // 计算风险指标
  const riskMetrics = this.riskCalculator.calculate(this.equityCurve, this.assetReturns)
  
  return this.buildResult(state, riskMetrics)
}
```