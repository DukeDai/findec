# Findec - 美股量化分析平台设计文档

**创建日期**: 2026-03-29  
**版本**: v0.1  
**状态**: 设计确认，准备实施

---

## 1. 项目概述

### 1.1 定位
个人美股量化分析平台，从基础行情和技术指标起步，逐步扩展到筛选、回测、预警、组合分析。

### 1.2 目标用户
个人交易者，用于辅助交易决策。

### 1.3 第一阶段目标
- 查看美股行情（实时/历史K线）
- 叠加技术指标（均线、RSI、MACD等）
- 多标的对比分析
- 响应式界面，本地运行

---

## 2. 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | Next.js 14 (App Router) + TypeScript |
| 后端API | Next.js API Routes |
| 数据存储 | SQLite + Prisma ORM |
| 图表库 | Lightweight Charts |
| 数据源 | Yahoo Finance API |
| 样式 | Tailwind CSS + shadcn/ui |
| 部署 | 本地开发优先 |

---

## 3. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│  前端 (Next.js Pages)                                   │
│  ├── /dashboard      主面板，标的搜索和快速预览           │
│  ├── /chart/[symbol] K线图详情，技术指标叠加             │
│  └── /settings       数据源配置、指标参数设置            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  API Routes                                             │
│  ├── /api/quotes     获取实时报价                        │
│  ├── /api/history    获取历史K线数据                     │
│  ├── /api/indicators 计算技术指标                        │
│  └── /api/search     股票代码搜索                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  数据层                                                 │
│  ├── Prisma Client   数据库操作                         │
│  ├── SQLite          存储历史数据、用户配置              │
│  └── Yahoo Finance   外部数据源                          │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 数据模型

### 4.1 Stock (股票)
```prisma
model Stock {
  symbol      String   @id          // 股票代码，如 AAPL
  name        String?               // 公司名称
  exchange    String?               // 交易所
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  history     HistoricalData[]
}
```

### 4.2 HistoricalData (历史数据)
```prisma
model HistoricalData {
  id          String   @id @default(uuid())
  stockSymbol String
  stock       Stock    @relation(fields: [stockSymbol], references: [symbol])
  date        DateTime               // 日期
  open        Float                  // 开盘价
  high        Float                  // 最高价
  low         Float                  // 最低价
  close       Float                  // 收盘价
  volume      BigInt                 // 成交量
  createdAt   DateTime @default(now())
  
  @@unique([stockSymbol, date]) // 同一股票同一天只有一条记录
}
```

### 4.3 UserConfig (用户配置)
```prisma
model UserConfig {
  id          String   @id @default(uuid())
  key         String   @unique      // 配置键
  value       String                 // 配置值 (JSON字符串)
  updatedAt   DateTime @updatedAt
}
```

---

## 5. API 设计

### 5.1 获取实时报价
```
GET /api/quotes?symbol=AAPL
Response: { symbol, price, change, changePercent, volume, timestamp }
```

### 5.2 获取历史数据
```
GET /api/history?symbol=AAPL&period=1y&interval=1d
Response: { symbol, data: [{ date, open, high, low, close, volume }] }
```

### 5.3 计算技术指标
```
GET /api/indicators?symbol=AAPL&indicators=MA20,RSI,MACD
Response: { symbol, indicators: { MA20: [...], RSI: [...], MACD: {...} } }
```

### 5.4 股票搜索
```
GET /api/search?q=apple
Response: { results: [{ symbol, name, exchange }] }
```

---

## 6. 缓存策略

| 数据类型 | 缓存时长 | 存储位置 |
|----------|----------|----------|
| 历史K线 | 每日更新 | SQLite |
| 实时报价 | 5分钟 | 内存/不缓存 |
| 技术指标 | 实时计算 | 不缓存 |

---

## 7. 技术指标实现计划

第一阶段实现：
- **MA (移动平均)**: MA5, MA10, MA20, MA60
- **EMA (指数移动平均)**: EMA12, EMA26
- **RSI (相对强弱指数)**: 14日RSI
- **MACD**: DIF, DEA, MACD柱

计算库：`technicalindicators` (npm包)

---

## 8. 开发阶段规划

### Phase 1: 基础框架 (第1周)
- 项目初始化 (Next.js + TypeScript)
- Prisma + SQLite 配置
- 基础 UI 框架 (Tailwind + shadcn/ui)
- Yahoo Finance API 集成

### Phase 2: 核心功能 (第2周)
- K线图组件 (Lightweight Charts)
- 历史数据获取与存储
- 技术指标计算
- 多标的对比视图

### Phase 3: 完善优化 (第3周)
- 搜索功能
- 配置持久化
- 响应式优化
- 性能优化

### 未来阶段 (后续)
- 因子选股/筛选
- 回测系统
- 实时监控/预警
- 组合分析

---

## 9. 约束与决策

### 9.1 YAGNI 原则
- 不做用户系统（个人使用）
- 不做权限管理
- 不做移动端适配优先
- 不做复杂的实时推送（轮询即可）

### 9.2 技术决策
- 选择 SQLite 而非 PostgreSQL：轻量、无需额外服务
- 选择 Lightweight Charts：专为金融图表设计
- 选择 Yahoo Finance：免费、数据全、API 简单

---

## 10. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Yahoo API 限流 | 数据获取失败 | 本地缓存 + 请求合并 |
| 数据延迟 | 决策失误 | 明确标注数据时效 |
| SQLite 性能瓶颈 | 查询慢 | 合理索引 + 定期清理旧数据 |

---

**下一步**: 执行实施计划，搭建项目骨架。