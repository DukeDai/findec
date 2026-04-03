# Findec - 美股量化分析平台

个人美股量化分析工具，提供 K 线图查看、技术指标分析等功能。

## 技术栈

- Next.js 16 (App Router)
- TypeScript
- Prisma + SQLite
- Lightweight Charts v5
- Yahoo Finance API
- Tailwind CSS + shadcn/ui

## 功能特性

- 📊 K 线图查看（使用 Lightweight Charts）
- 📈 技术指标计算（MA, EMA, RSI, MACD）
- 🔍 股票搜索
- 💹 快速报价
- 💾 历史数据存储（SQLite）
- 🎨 响应式界面（Tailwind + shadcn/ui）

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma db push
npx prisma generate

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看应用。

## API 端点

- `GET /api/quotes?symbol=AAPL` - 获取实时报价
- `GET /api/history?symbol=AAPL&range=1y` - 获取历史数据
- `GET /api/search?q=apple` - 搜索股票
- `GET /api/indicators?symbol=AAPL&indicators=ma20,rsi` - 计算技术指标

## 项目结构

```
src/
  app/
    api/          # API Routes
    chart/[symbol]/ # 动态图表页面
    dashboard/     # Dashboard 页面
  components/
    chart/         # 图表组件
    dashboard/     # Dashboard 组件
    ui/            # shadcn/ui 组件
  lib/
    prisma.ts      # Prisma Client
    yahoo-finance.ts # Yahoo Finance API
    indicators.ts  # 技术指标计算
  types/
    stock.ts       # 类型定义
prisma/
  schema.prisma    # 数据模型
```

## 开发计划

### 第一阶段（已完成）
- ✅ Next.js 项目初始化
- ✅ Prisma + SQLite 配置
- ✅ Yahoo Finance API 集成（带 mock 数据回退）
- ✅ K 线图组件
- ✅ Dashboard 页面
- ✅ 技术指标计算服务
- ✅ 技术指标叠加显示（MA, EMA, RSI, MACD）
- ✅ 数据缓存优化（SQLite 存储）

### 未来阶段
- [ ] 技术指标叠加显示
- [ ] 数据缓存优化
- [ ] 因子选股/筛选
- [ ] 回测系统
- [ ] 实时监控/预警
- [ ] 组合分析

## 许可证

MIT
