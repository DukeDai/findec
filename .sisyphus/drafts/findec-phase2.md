# Draft: Findec Phase 2 - Bug Fix + New Features

## Requirements (confirmed)

**User Request**: 修复bug，继续开发，直到新功能都ready再提问

**具体需求**:
1. 修复 Indicators API bug (500错误)
2. 实现因子选股/筛选功能
3. 实现回测系统
4. 实现实时监控/预警
5. 实现组合分析功能

**约束条件**:
- 用户不希望中途提问，希望一次性完成所有功能
- 所有功能实现后再汇报结果

---

## Known Issues (Bug)

**Indicators API Bug** (HIGH PRIORITY):
- **症状**: `/api/indicators` 返回 500 Internal Server Error
- **原因**: 未处理 Yahoo Finance 403 错误，没有 mock 数据回退
- **位置**: `src/app/api/indicators/route.ts`
- **修复方案**: 添加 try-catch 和 mock 数据回退（与 history API 相同模式）

---

## New Features (待规划)

### 1. 因子选股/筛选 (Factor-based Screening)

**功能描述**:
- 根据技术指标筛选股票（如 MA20 > MA60, RSI < 30 等）
- 多因子组合筛选
- 筛选结果展示

**技术考虑**:
- 需要批量获取多股票数据
- 需要筛选引擎（规则匹配）
- 需要筛选结果缓存（避免重复计算）

---

### 2. 回测系统 (Backtesting)

**功能描述**:
- 策略定义（买卖条件）
- 历史数据回测
- 绩效指标计算（收益率、胜率、最大回撤等）
- 回测报告生成

**技术考虑**:
- 事件驱动回测 vs 向量化回测
- 需要策略定义 API
- 需要回测引擎（模拟交易）
- 需要绩效指标计算库

---

### 3. 实时监控/预警 (Real-time Monitoring/Alerts)

**功能描述**:
- 实时价格监控
- 指标阈值预警（如价格突破 MA20，RSI 超买等）
- 预警通知（浏览器推送/邮件）

**技术考虑**:
- WebSocket vs Server-Sent Events vs Polling
- Next.js 16 实时数据推送方案
- 预警规则引擎
- 通知机制

---

### 4. 组合分析 (Portfolio Analysis)

**功能描述**:
- 多股票组合管理
- 组合绩效指标（Sharpe Ratio, Alpha/Beta, Max Drawdown）
- 组合权重优化
- 组合风险评估

**技术考虑**:
- 需要组合数据模型（Stock + Weight）
- 需要组合指标计算库
- 需要组合优化算法
- 需要组合风险分析

---

## Research Findings (待收集)

等待两个后台任务完成：
1. `bg_70252461` - 现有架构研究（explore agent）
2. `bg_4f174f27` - 最佳实践研究（librarian agent）

**期望收集的信息**:
- 现有数据模型和扩展建议
- API 路由模式和命名规范
- 技术指标库的可扩展性
- 前端组件架构和可复用模式
- 回测系统实现方式（事件驱动 vs 向量化）
- 实时数据推送方案（WebSocket vs SSE vs Polling）
- 组合分析指标计算库
- 可用的 npm 库推荐

---

## Scope Boundaries

**INCLUDE**:
- Bug 修复（Indicators API）
- 因子选股/筛选（核心功能）
- 回测系统（策略定义 + 回测引擎 + 绩效报告）
- 实时监控（价格监控 + 预警通知）
- 组合分析（组合管理 + 绩效指标 + 风险分析）

**EXCLUDE**:
- 实盘交易执行（仅分析，不执行交易）
- 复杂的策略编辑器UI（先实现简单策略）
- 邮件通知系统（先实现浏览器推送）
- 多用户系统（个人使用，单用户）
- 移动端适配（桌面优先）

---

## Open Questions (待研究回答)

1. 回测系统：事件驱动还是向量化实现？
2. 实时监控：WebSocket、SSE 还是 Polling？
3. 组合分析：使用现成库还是自己实现指标计算？
4. 因子选股：是否需要预定义因子库，还是用户自定义筛选条件？
5. 数据获取：批量获取多股票数据时如何处理 API 限制？

---

## Next Steps

等待研究结果完成后：
1. 综合研究信息
2. 设计数据模型扩展
3. 规划实现步骤（Wave 1: Bug修复, Wave 2-N: 新功能）
4. 生成完整工作计划到 `.sisyphus/plans/findec-complete-development.md`
5. 启动执行（用户运行 `/start-work`）

---

**Draft Updated**: 2026-04-03 15:20
**Status**: 等待研究结果