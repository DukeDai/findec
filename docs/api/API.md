# FinDec API 文档

FinDec 美股量化分析平台 API 文档，涵盖行情数据、因子选股、回测系统、组合管理、实时预警等模块。

## 目录

1. [概述](#概述)
2. [行情数据 (Market Data)](#行情数据-market-data)
3. [数据管理 (Data Management)](#数据管理-data-management)
4. [基本面数据 (Fundamentals)](#基本面数据-fundamentals)
5. [因子选股 (Factor Screening)](#因子选股-factor-screening)
6. [回测 (Backtesting)](#回测-backtesting)
7. [策略管理 (Strategy Management)](#策略管理-strategy-management)
8. [组合管理 (Portfolio Management)](#组合管理-portfolio-management)
9. [实时预警 (Alerts)](#实时预警-alerts)
10. [用户配置 (User Config)](#用户配置-user-config)
11. [WebSocket](#websocket)
12. [错误代码](#错误代码)

---

## 概述

### 基础信息

- **Base URL**: `http://localhost:3000/api`
- **Content-Type**: `application/json`
- **字符编码**: UTF-8

### 通用响应格式

成功响应:
```json
{
  "data": "..."
}
```

错误响应:
```json
{
  "error": "错误描述信息"
}
```

---

## 行情数据 (Market Data)

### 获取实时报价

```http
GET /api/quotes?symbol={symbol}
```

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbol | string | 是 | 股票代码，支持 AAPL、MSFT 等，1-10 个字符 |

**响应示例:**

```json
{
  "symbol": "AAPL",
  "price": 175.5,
  "change": 2.35,
  "changePercent": 1.36,
  "volume": 52437800,
  "high": 178.5,
  "low": 173.2,
  "open": 174.0,
  "previousClose": 173.15,
  "timestamp": "2026-04-05T10:30:00.000Z"
}
```

**错误码:**
- `400`: Symbol 参数缺失或格式无效
- `500`: 服务器内部错误

---

### 获取历史 K 线数据

```http
GET /api/history?symbol={symbol}&range={range}&interval={interval}
```

**请求参数:**

| 参数 | 类型 | 必填 | 说明 | 可选值 |
|------|------|------|------|--------|
| symbol | string | 是 | 股票代码 | - |
| range | string | 否 | 时间范围 | 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max (默认: 1y) |
| interval | string | 否 | 时间间隔 | 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo (默认: 1d) |

**响应示例:**

```json
{
  "symbol": "AAPL",
  "range": "1y",
  "interval": "1d",
  "source": "yahoo",
  "data": [
    {
      "date": "2025-04-05",
      "open": 174.0,
      "high": 178.5,
      "low": 173.2,
      "close": 175.5,
      "volume": 52437800
    }
  ]
}
```

**错误码:**
- `400`: 参数无效或格式错误
- `404`: 未找到该股票的历史数据
- `500`: 服务器内部错误

---

### 搜索股票

```http
GET /api/search?q={query}
```

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 是 | 搜索关键词，支持股票代码、英文名称或中文名称，1-50 个字符 |

**响应示例:**

```json
{
  "query": "apple",
  "results": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "nameZh": "苹果公司",
      "exchange": "NASDAQ",
      "type": "Equity"
    }
  ],
  "count": 1
}
```

**错误码:**
- `400`: 查询参数缺失或长度不在 1-50 字符范围内
- `500`: 服务器内部错误

---

### 计算技术指标

```http
GET /api/indicators?symbol={symbol}&indicators={indicators}
```

**请求参数:**

| 参数 | 类型 | 必填 | 说明 | 格式 |
|------|------|------|------|------|
| symbol | string | 是 | 股票代码 | - |
| indicators | string | 否 | 指标列表，逗号分隔 | 默认: ma20,rsi |

**支持的指标:**

| 指标 | 格式示例 | 说明 |
|------|----------|------|
| MA | ma5, ma20, ma60 | 简单移动平均线，后跟周期 |
| EMA | ema12, ema26 | 指数移动平均线 |
| RSI | rsi14, rsi | 相对强弱指标，默认 14 周期 |
| MACD | macd | MACD 指标 (12,26,9) |
| Bollinger | bollinger20,2 或 bb20,2 | 布林带，参数: 周期,标准差倍数 |
| ATR | atr14, atr | 真实波幅均值 |
| ADX | adx14, adx | 平均趋向指数 |
| Stochastic | stoch 或 stoch14,3 | 随机指标，参数: K周期,D周期 |
| OBV | obv | 能量潮指标 |

**响应示例:**

```json
{
  "symbol": "AAPL",
  "indicators": {
    "ma": {
      "20": [175.2, 175.5, 175.8]
    },
    "ema": {
      "12": [175.3, 175.6, 175.9]
    },
    "rsi": {
      "period": 14,
      "values": [65.2, 68.5, 72.1]
    },
    "macd": {
      "macdLine": [0.5, 0.8, 1.2],
      "signalLine": [0.3, 0.5, 0.9],
      "histogram": [0.2, 0.3, 0.3]
    },
    "bollinger": {
      "upper": [180.5, 181.2, 182.0],
      "middle": [175.2, 175.5, 175.8],
      "lower": [169.9, 169.8, 169.6]
    },
    "atr": {
      "period": 14,
      "values": [2.5, 2.6, 2.8]
    },
    "adx": {
      "period": 14,
      "values": [25.3, 26.1, 27.2]
    },
    "stoch": {
      "k": [75.2, 78.5, 82.1],
      "d": [70.3, 73.6, 77.9]
    },
    "obv": [123456789, 123556789, 123656789]
  }
}
```

**错误码:**
- `400`: Symbol 参数缺失
- `404`: 无可用数据
- `500`: 服务器内部错误

---

## 数据管理 (Data Management)

### 获取缓存状态

```http
GET /api/data-manager
```

**响应示例:**

```json
{
  "status": [
    {
      "symbol": "AAPL",
      "ranges": [
        { "range": "1y", "fetchedAt": "2026-04-05T10:00:00.000Z" }
      ]
    }
  ]
}
```

**错误码:**
- `500`: 服务器内部错误

---

### 批量下载数据

```http
POST /api/data-manager
```

**请求体:**

```json
{
  "symbols": ["AAPL", "MSFT", "GOOGL"],
  "range": "1y"
}
```

**参数说明:**

| 参数 | 类型 | 必填 | 说明 | 可选值 |
|------|------|------|------|--------|
| symbols | string[] | 是 | 股票代码数组 | - |
| range | string | 是 | 时间范围 | 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max |

**响应示例:**

```json
{
  "success": true,
  "downloaded": ["AAPL", "MSFT"],
  "failed": [
    {
      "symbol": "GOOGL",
      "reason": "无法获取历史数据（可能代码无效或数据不可用）"
    }
  ],
  "cacheInfo": [
    {
      "symbol": "AAPL",
      "fetchedAt": "2026-04-05T10:00:00.000Z",
      "dataPoints": 252
    }
  ]
}
```

**错误码:**
- `400`: 参数无效（无效的时间范围或空股票列表）
- `500`: 服务器内部错误

---

## 基本面数据 (Fundamentals)

### 获取基本面数据

```http
GET /api/fundamentals?symbol={symbol}
```

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbol | string | 是 | 股票代码，1-10 个字符 |

**响应示例:**

```json
{
  "symbol": "AAPL",
  "marketCap": 2800000000000,
  "peRatio": 28.5,
  "forwardPE": 25.3,
  "pegRatio": 2.1,
  "priceToBook": 45.2,
  "priceToSales": 7.8,
  "enterpriseValue": 2850000000000,
  "profitMargin": 0.25,
  "operatingMargin": 0.30,
  "revenue": 380000000000,
  "revenueGrowth": 0.08,
  "earningsGrowth": 0.12,
  "returnOnEquity": 0.85,
  "returnOnAssets": 0.22,
  "debtToEquity": 1.85,
  "currentRatio": 1.12,
  "quickRatio": 0.85,
  "dividendYield": 0.005,
  "exDividendDate": "2026-02-10",
  "payoutRatio": 0.15,
  "beta": 1.25,
  "fiftyTwoWeekHigh": 199.62,
  "fiftyTwoWeekLow": 164.08,
  "averageVolume": 52000000,
  "sharesOutstanding": 15400000000,
  "floatShares": 15300000000,
  "shortRatio": 1.2,
  "bookValuePerShare": 3.85,
  "revenuePerShare": 24.5,
  "freeCashFlow": 85000000000
}
```

**错误码:**
- `400`: Symbol 参数缺失或格式无效
- `500`: 服务器内部错误

---

## 因子选股 (Factor Screening)

### 获取选股策略列表

```http
GET /api/factors/strategies
```

**响应示例:**

```json
[
  {
    "id": "strategy-uuid",
    "name": "价值投资策略",
    "description": "选择低PE、高ROE的价值股",
    "rules": [
      {
        "id": "rule-uuid",
        "field": "pe_ratio",
        "operator": "<",
        "value": 20,
        "weight": 1.0
      }
    ],
    "createdAt": "2026-04-01T10:00:00.000Z",
    "updatedAt": "2026-04-01T10:00:00.000Z"
  }
]
```

**错误码:**
- `500`: 服务器内部错误

---

### 创建选股策略

```http
POST /api/factors/strategies
```

**请求体:**

```json
{
  "name": "价值投资策略",
  "description": "选择低PE、高ROE的价值股",
  "rules": [
    {
      "field": "pe_ratio",
      "operator": "<",
      "value": 20,
      "weight": 1.0
    }
  ]
}
```

**参数说明:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 策略名称 |
| description | string | 否 | 策略描述 |
| rules | array | 否 | 选股规则数组 |

**rule 对象:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| field | string | 是 | 因子字段，如 pe_ratio, roe 等 |
| operator | string | 是 | 操作符: <, >, =, <=, >= |
| value | number/string | 是 | 阈值 |
| weight | number | 否 | 权重，默认 1.0 |

**响应示例:**

```json
{
  "id": "strategy-uuid",
  "name": "价值投资策略",
  "description": "选择低PE、高ROE的价值股",
  "rules": [...],
  "createdAt": "2026-04-05T10:00:00.000Z",
  "updatedAt": "2026-04-05T10:00:00.000Z"
}
```

**错误码:**
- `400`: 策略名称不能为空
- `500`: 服务器内部错误

---

### 执行因子筛选

```http
POST /api/factors/screen
```

**请求体:**

```json
{
  "strategyId": "strategy-uuid",
  "symbols": ["AAPL", "MSFT", "GOOGL", "AMZN", "META"],
  "scoringMethod": "weighted_sum"
}
```

**参数说明:**

| 参数 | 类型 | 必填 | 说明 | 可选值 |
|------|------|------|------|--------|
| strategyId | string | 是 | 策略 ID | - |
| symbols | string[] | 是 | 待筛选股票代码数组 | - |
| scoringMethod | string | 否 | 评分方法 | weighted_sum, rank_sum, threshold_count (默认: weighted_sum) |

**响应示例:**

```json
{
  "strategyId": "strategy-uuid",
  "results": [
    {
      "id": "result-uuid",
      "strategyId": "strategy-uuid",
      "symbol": "AAPL",
      "score": 85.5,
      "rank": 1,
      "createdAt": "2026-04-05T10:00:00.000Z"
    }
  ]
}
```

**错误码:**
- `400`: 参数缺失或评分方法无效
- `404`: 策略不存在
- `500`: 服务器内部错误

---

### 获取因子有效性指标

```http
GET /api/factors/effectiveness?factorId={factorId}
```

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| factorId | string | 否 | 因子 ID，不提供则返回所有因子 |

**响应示例:**

```json
{
  "factors": [
    {
      "factorId": "pe_ratio",
      "name": "市盈率",
      "ic": {
        "current": 0.15,
        "history": [
          { "date": "2026-04-01", "ic": 0.12 }
        ],
        "mean": 0.14,
        "std": 0.05
      },
      "icIr": 2.8,
      "groupReturns": [
        { "group": 1, "return": -0.02 },
        { "group": 2, "return": -0.01 },
        { "group": 3, "return": 0.01 },
        { "group": 4, "return": 0.03 },
        { "group": 5, "return": 0.05 }
      ],
      "decayTest": {
        "ic_1d": 0.15,
        "ic_5d": 0.12,
        "ic_20d": 0.08
      }
    }
  ]
}
```

**错误码:**
- `404`: 因子不存在或数据不足
- `500`: 服务器内部错误

---

### POST 批量查询因子有效性

```http
POST /api/factors/effectiveness
```

**请求体:**

```json
{
  "factorIds": ["pe_ratio", "roe", "momentum"]
}
```

**响应示例:** 同上

**错误码:**
- `400`: factorIds 数组不能为空
- `500`: 服务器内部错误

---

### 获取因子相关性矩阵

```http
GET /api/factors/correlation
```

从缓存数据计算因子相关性。

**响应示例:**

```json
{
  "matrix": [
    [1.0, 0.35, 0.28],
    [0.35, 1.0, 0.42],
    [0.28, 0.42, 1.0]
  ],
  "factors": ["pe_ratio", "roe", "momentum"],
  "warnings": [
    "pe_ratio 和 roe 相关性较高 (0.85)，可能存在冗余"
  ]
}
```

**错误码:**
- `500`: 服务器内部错误

---

### POST 计算因子相关性

```http
POST /api/factors/correlation
```

**请求体:**

```json
{
  "factorIds": ["pe_ratio", "roe", "momentum"],
  "symbols": ["AAPL", "MSFT", "GOOGL", "AMZN", "META"]
}
```

**参数说明:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| factorIds | string[] | 是 | 因子 ID 数组，至少 2 个 |
| symbols | string[] | 是 | 股票代码数组 |

**响应示例:**

```json
{
  "matrix": [[1.0, 0.35, 0.28], [0.35, 1.0, 0.42], [0.28, 0.42, 1.0]],
  "factors": ["pe_ratio", "roe", "momentum"],
  "factorNames": {
    "pe_ratio": "市盈率",
    "roe": "净资产收益率",
    "momentum": "动量"
  },
  "warnings": [],
  "symbolCount": 5,
  "analyzedFactors": 3
}
```

**错误码:**
- `400`: 参数无效或数据不足
- `500`: 服务器内部错误

---

### 因子评分优化

```http
POST /api/factors/optimize
```

**请求体:**

```json
{
  "strategy": {
    "id": "strategy-uuid",
    "name": "优化策略",
    "rules": [
      {
        "factorId": "pe_ratio",
        "operator": "<",
        "value": 20,
        "weight": 1.0
      }
    ]
  },
  "symbols": ["AAPL", "MSFT", "GOOGL", "AMZN", "META"],
  "scoringMethod": "weighted_sum"
}
```

**响应示例:**

```json
{
  "topSymbols": [
    {
      "symbol": "AAPL",
      "score": 85.5,
      "rank": 1
    }
  ],
  "factorContributions": [
    {
      "factorId": "pe_ratio",
      "contribution": 45.2,
      "avgScore": 72.3
    }
  ],
  "methodComparison": {
    "weightedRankCorrelation": 0.92,
    "rankThresholdCorrelation": 0.85
  }
}
```

**错误码:**
- `400`: 参数缺失或策略规则为空
- `500`: 服务器内部错误

---

## 回测 (Backtesting)

### 获取回测列表

```http
GET /api/backtests
```

**响应示例:**

```json
[
  {
    "id": "backtest-uuid",
    "name": "MA交叉策略",
    "symbols": "AAPL,MSFT",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T00:00:00.000Z",
    "initialCapital": 100000,
    "trades": [],
    "createdAt": "2026-04-05T10:00:00.000Z"
  }
]
```

**错误码:**
- `500`: 服务器内部错误

---

### 创建单标的回测

```http
POST /api/backtests
```

**请求体:**

```json
{
  "name": "MA交叉策略",
  "symbols": ["AAPL"],
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "initialCapital": 100000
}
```

**响应示例:**

```json
{
  "id": "backtest-uuid",
  "name": "MA交叉策略",
  "symbols": "AAPL",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T00:00:00.000Z",
  "initialCapital": 100000,
  "createdAt": "2026-04-05T10:00:00.000Z"
}
```

**错误码:**
- `400`: 缺少必填字段
- `500`: 服务器内部错误

---

### 创建组合回测

```http
POST /api/backtests/portfolio
```

**请求体:**

```json
{
  "name": "组合回测",
  "symbols": ["AAPL", "MSFT", "GOOGL"],
  "initialCapital": 100000,
  "allocation": {
    "AAPL": 0.4,
    "MSFT": 0.35,
    "GOOGL": 0.25
  },
  "strategies": [
    {
      "id": "strategy-1",
      "type": "ma_crossover",
      "parameters": {
        "shortWindow": 10,
        "longWindow": 30
      }
    }
  ],
  "rebalance": "monthly",
  "rebalanceThreshold": 0.05,
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

**参数说明:**

| 参数 | 类型 | 必填 | 说明 | 可选值 |
|------|------|------|------|--------|
| name | string | 是 | 回测名称 | - |
| symbols | string[] | 是 | 股票代码数组 | - |
| initialCapital | number | 是 | 初始资金 | > 0 |
| allocation | object | 否 | 资产配置权重 | 权重和必须等于 1 |
| strategies | array | 是 | 策略配置数组 | - |
| rebalance | string | 否 | 再平衡周期 | daily, weekly, monthly, none (默认: monthly) |
| rebalanceThreshold | number | 否 | 再平衡阈值 | 默认: 0.05 |
| startDate | string | 是 | 开始日期 | ISO 日期格式 |
| endDate | string | 是 | 结束日期 | ISO 日期格式 |

**响应示例:**

```json
{
  "planId": "backtest-uuid",
  "name": "组合回测",
  "status": "pending",
  "createdAt": "2026-04-05T10:00:00.000Z"
}
```

**错误码:**
- `400`: 参数无效（名称/股票列表为空、资金非正、日期无效等）
- `500`: 服务器内部错误

---

### 获取组合回测列表

```http
GET /api/backtests/portfolio
```

**响应示例:**

```json
{
  "plans": [
    {
      "id": "plan-uuid",
      "name": "组合回测",
      "symbols": ["AAPL", "MSFT", "GOOGL"],
      "allocation": { "AAPL": 0.4, "MSFT": 0.35, "GOOGL": 0.25 },
      "strategies": [...],
      "rebalance": "monthly",
      "rebalanceThreshold": 0.05,
      "initialCapital": 100000,
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "status": "completed",
      "metrics": {
        "portfolioReturn": 0.25,
        "portfolioSharpe": 1.8,
        "portfolioSortino": 2.1,
        "portfolioCalmar": 1.5,
        "portfolioMaxDrawdown": -0.15,
        "portfolioVolatility": 0.18,
        "portfolioVaR95": -0.03
      },
      "createdAt": "2026-04-05T10:00:00.000Z",
      "updatedAt": "2026-04-05T11:00:00.000Z"
    }
  ]
}
```

**错误码:**
- `500`: 服务器内部错误

---

### 回测参数优化 (Grid Search)

```http
POST /api/backtests/portfolio/{id}/optimize
```

**请求体:**

```json
{
  "searchParams": [
    {
      "param": "shortWindow",
      "min": 5,
      "max": 20,
      "step": 5
    },
    {
      "param": "longWindow",
      "min": 20,
      "max": 50,
      "step": 10
    }
  ],
  "metric": "sharpeRatio"
}
```

**参数说明:**

| 参数 | 类型 | 必填 | 说明 | 可选值 |
|------|------|------|------|--------|
| searchParams | array | 是 | 搜索参数配置 | - |
| metric | string | 否 | 优化目标 | sharpeRatio, totalReturn, maxDrawdown (默认: sharpeRatio) |

**searchParam 对象:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| param | string | 是 | 参数名 |
| min | number | 是 | 最小值 |
| max | number | 是 | 最大值 |
| step | number | 是 | 步长 |

**响应示例:**

```json
{
  "planId": "plan-uuid",
  "bestParams": {
    "shortWindow": 10,
    "longWindow": 30
  },
  "bestResult": {
    "sharpeRatio": 1.85,
    "totalReturn": 0.28,
    "maxDrawdown": -0.12
  },
  "totalCombinations": 16
}
```

**错误码:**
- `400`: 参数无效
- `404`: 回测计划不存在
- `500`: 服务器内部错误

---

### Monte Carlo 模拟

```http
POST /api/backtests/portfolio/{id}/montecarlo
```

**请求体:**

```json
{
  "simulations": 1000
}
```

**参数说明:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| simulations | number | 否 | 模拟次数，默认 1000 |

**响应示例:**

```json
{
  "planId": "plan-uuid",
  "percentiles": {
    "0.05": -0.05,
    "0.25": 0.15,
    "0.5": 0.28,
    "0.75": 0.42,
    "0.95": 0.65
  },
  "probabilityOfProfit": 0.78,
  "averageReturn": 0.30,
  "medianReturn": 0.28,
  "stdDeviation": 0.18,
  "var": -0.05,
  "cvar": -0.08,
  "averageMaxDrawdown": -0.15,
  "simulations": 1000
}
```

**错误码:**
- `404`: 回测计划不存在
- `500`: 服务器内部错误

---

### 回测可靠性评分 (NEW)

```http
POST /api/backtests/reliability
```

**请求体:**

```json
{
  "trades": [
    {
      "type": "buy",
      "value": 10000,
      "date": "2025-01-15T10:00:00Z"
    }
  ],
  "equityCurve": [
    {
      "date": "2025-01-01",
      "value": 100000
    }
  ],
  "config": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "symbols": ["AAPL"]
  }
}
```

**响应示例:**

```json
{
  "score": 85,
  "grade": "A",
  "dimensions": {
    "sampleSize": {
      "score": 90,
      "tradeCount": 50,
      "minRequired": 20
    },
    "outOfSample": {
      "score": 80,
      "testRatio": 0.3
    },
    "robustness": {
      "score": 85,
      "parameterStability": 0.88
    },
    "statistical": {
      "score": 88,
      "sharpeTStat": 2.5
    }
  },
  "warnings": ["交易次数偏少，建议增加测试周期"]
}
```

**错误码:**
- `400`: 数据格式错误
- `500`: 服务器内部错误

---

## 策略管理 (Strategy Management)

### 获取策略列表

```http
GET /api/strategies
```

**响应示例:**

```json
[
  {
    "id": "strategy-uuid",
    "name": "MA金叉策略",
    "description": "短期均线上穿长期均线时买入",
    "rules": {
      "conditions": [...],
      "actions": [...]
    },
    "createdAt": "2026-04-05T10:00:00.000Z",
    "updatedAt": "2026-04-05T10:00:00.000Z"
  }
]
```

**错误码:**
- `500`: 服务器内部错误

---

### 创建策略

```http
POST /api/strategies
```

**请求体:**

```json
{
  "name": "MA金叉策略",
  "description": "短期均线上穿长期均线时买入",
  "rules": {
    "conditions": [
      {
        "indicator": "MA10",
        "operator": ">",
        "value": "MA30"
      }
    ]
  },
  "actions": {
    "entry": "buy",
    "exit": "sell"
  }
}
```

**响应示例:**

```json
{
  "id": "strategy-uuid",
  "name": "MA金叉策略",
  "description": "短期均线上穿长期均线时买入",
  "rules": {...},
  "actions": {...},
  "createdAt": "2026-04-05T10:00:00.000Z",
  "updatedAt": "2026-04-05T10:00:00.000Z"
}
```

**错误码:**
- `400`: 策略名称或规则不能为空
- `500`: 服务器内部错误

---

## 组合管理 (Portfolio Management)

### 获取组合列表

```http
GET /api/portfolios
```

**响应示例:**

```json
[
  {
    "id": "portfolio-uuid",
    "name": "我的组合",
    "description": "价值投资组合",
    "positions": [
      {
        "id": "position-uuid",
        "symbol": "AAPL",
        "quantity": 100,
        "avgCost": 150.0,
        "currentPrice": 175.5
      }
    ],
    "createdAt": "2026-04-05T10:00:00.000Z",
    "updatedAt": "2026-04-05T10:00:00.000Z"
  }
]
```

**错误码:**
- `500`: 服务器内部错误

---

### 创建组合

```http
POST /api/portfolios
```

**请求体:**

```json
{
  "name": "我的组合",
  "description": "价值投资组合"
}
```

**响应示例:**

```json
{
  "id": "portfolio-uuid",
  "name": "我的组合",
  "description": "价值投资组合",
  "positions": [],
  "createdAt": "2026-04-05T10:00:00.000Z",
  "updatedAt": "2026-04-05T10:00:00.000Z"
}
```

**错误码:**
- `400`: 组合名称不能为空
- `500`: 服务器内部错误

---

### 获取组合风险指标

```http
GET /api/portfolios/{id}/metrics
```

**响应示例:**

```json
{
  "totalValue": 50000,
  "totalReturn": 0.25,
  "sharpeRatio": 1.85,
  "sortinoRatio": 2.1,
  "calmarRatio": 1.5,
  "maxDrawdown": -0.15,
  "volatility": 0.18,
  "var95": -0.03,
  "beta": 1.1,
  "alpha": 0.05,
  "positions": [
    {
      "symbol": "AAPL",
      "weight": 0.4,
      "contribution": 0.12
    }
  ]
}
```

**错误码:**
- `404`: 组合不存在
- `500`: 服务器内部错误

---

### 获取组合健康度评分

```http
GET /api/portfolios/{id}/health
```

**响应示例:**

```json
{
  "total": 85,
  "concentration": {
    "score": 90,
    "topHoldingWeight": 0.35,
    "top5Weight": 0.85
  },
  "volatility": {
    "score": 80,
    "portfolioVol": 0.18
  },
  "correlation": {
    "score": 88,
    "avgCorrelation": 0.65
  },
  "liquidity": {
    "score": 92,
    "avgVolume": 50000000
  },
  "riskAdjustedReturn": {
    "score": 75,
    "sharpeRatio": 1.5
  },
  "breakdown": "组合整体健康",
  "suggestions": ["可适当增加防御性资产以降低波动率"]
}
```

**错误码:**
- `404`: 组合不存在
- `500`: 服务器内部错误

---

### 获取组合持仓

```http
GET /api/portfolios/{id}/positions
```

**响应示例:**

```json
[
  {
    "id": "position-uuid",
    "portfolioId": "portfolio-uuid",
    "symbol": "AAPL",
    "quantity": 100,
    "avgCost": 150.0,
    "currentPrice": 175.5,
    "createdAt": "2026-04-05T10:00:00.000Z",
    "updatedAt": "2026-04-05T10:00:00.000Z"
  }
]
```

**错误码:**
- `500`: 服务器内部错误

---

### 添加/更新持仓

```http
POST /api/portfolios/{id}/positions
```

**请求体:**

```json
{
  "symbol": "AAPL",
  "quantity": 100,
  "price": 175.5,
  "type": "buy"
}
```

**参数说明:**

| 参数 | 类型 | 必填 | 说明 | 可选值 |
|------|------|------|------|--------|
| symbol | string | 是 | 股票代码 | - |
| quantity | number | 是 | 数量 | > 0 |
| price | number | 是 | 价格 | > 0 |
| type | string | 是 | 交易类型 | buy, sell |

**响应示例:**

```json
{
  "id": "position-uuid",
  "portfolioId": "portfolio-uuid",
  "symbol": "AAPL",
  "quantity": 100,
  "avgCost": 150.0,
  "currentPrice": 175.5,
  "createdAt": "2026-04-05T10:00:00.000Z",
  "updatedAt": "2026-04-05T11:00:00.000Z"
}
```

**错误码:**
- `400`: 参数缺失
- `404`: 组合不存在
- `500`: 服务器内部错误

---

## 实时预警 (Alerts)

### 获取预警列表

```http
GET /api/alerts
```

**响应示例:**

```json
[
  {
    "id": "alert-uuid",
    "symbol": "AAPL",
    "condition": "above",
    "targetValue": 180.0,
    "message": "AAPL 价格突破 $180",
    "isActive": true,
    "triggeredAt": null,
    "createdAt": "2026-04-05T10:00:00.000Z"
  }
]
```

**错误码:**
- `500`: 服务器内部错误

---

### 创建预警

```http
POST /api/alerts
```

**请求体:**

```json
{
  "symbol": "AAPL",
  "condition": "above",
  "targetValue": 180.0,
  "message": "AAPL 价格突破 $180"
}
```

**参数说明:**

| 参数 | 类型 | 必填 | 说明 | 可选值 |
|------|------|------|------|--------|
| symbol | string | 是 | 股票代码 | - |
| condition | string | 是 | 触发条件 | above, below, change_above, change_below |
| targetValue | number | 否 | 目标值 | - |
| message | string | 否 | 预警消息 | - |

**响应示例:**

```json
{
  "id": "alert-uuid",
  "symbol": "AAPL",
  "condition": "above",
  "targetValue": 180.0,
  "message": "AAPL 价格突破 $180",
  "isActive": true,
  "triggeredAt": null,
  "createdAt": "2026-04-05T10:00:00.000Z"
}
```

**错误码:**
- `400`: Symbol 和 condition 为必填项
- `500`: 服务器内部错误

---

### 获取智能预警推荐 (NEW)

```http
GET /api/alerts/recommend?symbol={symbol}
```

**请求参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbol | string | 是 | 股票代码 |

**响应示例:**

```json
{
  "symbol": "AAPL",
  "recommendations": [
    {
      "type": "support",
      "level": 170.5,
      "reason": "近期支撑位"
    },
    {
      "type": "resistance",
      "level": 180.0,
      "reason": "近期阻力位"
    },
    {
      "type": "volatility",
      "level": 5.0,
      "reason": "10日波动率超过5%"
    }
  ],
  "suggestedAlerts": [
    {
      "condition": "above",
      "targetValue": 180.0,
      "message": "AAPL 突破阻力位"
    }
  ]
}
```

**错误码:**
- `400`: 缺少股票代码参数
- `500`: 服务器内部错误

---

### 手动触发预警检查

```http
POST /api/alerts/check
```

**响应示例:**

```json
{
  "checked": 10,
  "triggered": 2,
  "alerts": [
    {
      "id": "alert-uuid",
      "symbol": "AAPL",
      "condition": "above",
      "targetValue": 180.0,
      "currentPrice": 181.5,
      "message": "AAPL 价格突破 $180"
    }
  ]
}
```

**错误码:**
- `500`: 服务器内部错误

---

### 发送邮件通知

```http
POST /api/alerts/{id}/notify
```

**响应示例:**

```json
{
  "success": true
}
```

**错误码:**
- `400`: 预警 ID 不能为空或未配置邮箱
- `404`: 预警不存在
- `500`: 邮件发送失败

---

## 用户配置 (User Config)

### 获取用户配置

```http
GET /api/user-config
```

**响应示例:**

```json
{
  "email": "user@example.com",
  "emailAlertsEnabled": true,
  "lastEmailSentAt": "2026-04-05T10:00:00.000Z"
}
```

**错误码:**
- `500`: 服务器内部错误

---

### 更新用户配置

```http
POST /api/user-config
```

**请求体:**

```json
{
  "email": "user@example.com",
  "emailAlertsEnabled": true
}
```

**响应示例:**

```json
{
  "email": "user@example.com",
  "emailAlertsEnabled": true
}
```

**错误码:**
- `500`: 服务器内部错误

---

### 部分更新配置 (PATCH)

```http
PATCH /api/user-config
```

**请求体:**

```json
{
  "emailAlertsEnabled": false
}
```

**响应示例:** 同上

**错误码:**
- `404`: 配置不存在
- `500`: 服务器内部错误

---

### 发送测试邮件

```http
PUT /api/user-config
```

**请求体:**

```json
{
  "action": "test",
  "email": "user@example.com"
}
```

**响应示例:**

```json
{
  "success": true,
  "message": "测试邮件已发送"
}
```

**错误码:**
- `400`: 邮箱地址不能为空或未知操作
- `500`: 邮件发送失败

---

## WebSocket

### 实时预警推送

```
ws://localhost:3001
```

使用 Socket.io 连接 WebSocket 服务，接收实时预警推送。

**连接示例:**

```typescript
import { io } from 'socket.io-client'

const socket = io('ws://localhost:3001')

socket.on('connect', () => {
  console.log('WebSocket 已连接')
})

socket.on('alert-triggered', (alert) => {
  console.log('预警触发:', alert)
})

socket.on('price-update', (data) => {
  console.log('价格更新:', data)
})
```

**事件类型:**

| 事件名 | 说明 | 数据格式 |
|--------|------|----------|
| alert-triggered | 预警触发通知 | `{ id, symbol, condition, currentPrice, message }` |
| price-update | 实时价格更新 | `{ symbol, price, change, changePercent, timestamp }` |

**错误处理:**

```typescript
socket.on('error', (error) => {
  console.error('WebSocket 错误:', error)
})

socket.on('disconnect', () => {
  console.log('WebSocket 已断开')
})
```

---

## 错误代码

### HTTP 状态码

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| 200 | 请求成功 | - |
| 201 | 创建成功 | POST 请求成功创建资源 |
| 400 | 请求参数错误 | 缺少必填参数、参数格式无效、验证失败 |
| 404 | 资源未找到 | ID 不存在、股票代码无效 |
| 500 | 服务器内部错误 | 数据库错误、外部 API 失败、未捕获的异常 |

### 错误消息

错误响应统一格式:

```json
{
  "error": "具体的错误描述信息"
}
```

**常见错误消息:**

| 错误消息 | 说明 | 解决方法 |
|----------|------|----------|
| Symbol parameter is required | 缺少股票代码参数 | 检查请求参数 |
| Invalid symbol format | 股票代码格式无效 | 使用 1-10 位字母数字组合 |
| Strategy not found | 策略不存在 | 检查策略 ID 是否正确 |
| Portfolio not found | 组合不存在 | 检查组合 ID 是否正确 |
| Failed to fetch quote data | 获取报价失败 | 检查数据源服务状态 |
| 获取配置失败 | 获取用户配置失败 | 检查数据库连接 |

---

## 附录

### 数据类型说明

#### HistoricalDataPoint

| 字段 | 类型 | 说明 |
|------|------|------|
| date | string (YYYY-MM-DD) | 交易日期 |
| open | number | 开盘价 |
| high | number | 最高价 |
| low | number | 最低价 |
| close | number | 收盘价 |
| volume | number | 成交量 |

#### TradeData

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 交易类型: buy/sell |
| value | number | 交易金额 |
| date | string (ISO 8601) | 交易时间 |

#### EquityPoint

| 字段 | 类型 | 说明 |
|------|------|------|
| date | string (YYYY-MM-DD) | 日期 |
| value | number | 权益值 |

---

*文档版本: 1.0.0*  
*最后更新: 2026-04-05*
