# Findec 剩余工作计划

## TL;DR

> **目标**: 修复构建错误，完成数据缓存验证，确保所有功能正常工作
> 
> **交付物**: 
> - 构建成功的项目
> - 验证通过的数据缓存功能
> - 技术指标叠加功能正常运行
> 
> **预计工作量**: Quick (快速修复和验证)
> **并行执行**: NO - 顺序修复和验证

---

## Context

### 当前状态
- ✅ 技术指标叠加功能已实现（MA, EMA, RSI, MACD）
- ⚠️ 数据缓存优化已实现，但存在构建错误
- ❌ 构建失败：Google Fonts 加载问题
- ⚠️ Prisma Client 配置已更新，需要验证

### 发现的问题
1. **字体加载错误**: Next.js Turbopack 无法从 Google Fonts 下载 Geist 字体
   - 错误: `Error while requesting resource https://fonts.gstatic.com/...`
   - 原因: 网络问题或字体服务不可用
   
2. **Prisma Client 初始化**: 已修改为使用 `datasourceUrl` 参数，需要验证

### 已完成的更改
- `src/components/chart/ChartContainer.tsx` - 添加指标叠加功能
- `src/app/api/history/route.ts` - 实现数据缓存
- `src/lib/prisma.ts` - Prisma Client 配置更新

---

## Work Objectives

### Core Objective
修复构建错误并验证所有功能正常工作

### Concrete Deliverables
1. `npm run build` 成功通过
2. 数据缓存功能验证（首次请求从API获取，二次请求从缓存读取）
3. 技术指标叠加显示正常

### Definition of Done
- [ ] 构建成功（无错误）
- [ ] 开发服务器启动正常
- [ ] API 返回真实数据（非mock数据）
- [ ] 数据缓存逻辑验证
- [ ] 指标叠加功能正常

---

## TODOs

### Wave 1: 修复构建错误

- [x] 1. 修复字体加载问题

  **What to do**:
  - 编辑 `src/app/layout.tsx`
  - 删除 Google Fonts 导入: `import { Geist, Geist_Mono } from "next/font/google"`
  - 删除字体变量声明
  - 使用系统字体: `className="font-sans"`
  - 运行 `npm run build` 验证修复

  **Must NOT do**:
  - 不要修改其他文件
  - 不要破坏现有布局结构

  **Acceptance Criteria**:
  - [ ] `npm run build` 成功完成
  - [ ] 无字体加载错误

---

### Wave 2: 验证功能

- [x] 2. 启动开发服务器并测试

- [x] 3. 测试数据缓存功能

  **What to do**:
  - 使用 curl 测试 history API
  - 第一次请求验证从 Yahoo Finance 获取
  - 第二次请求验证从缓存读取（响应更快）
  - 检查数据库中的缓存数据

  **QA Scenarios**:
  ```
  Scenario: API 缓存测试
    Tool: Bash (curl)
    Steps:
      1. curl "http://localhost:3000/api/history?symbol=MSFT&range=1y"
      2. 检查响应中的 cached: false
      3. curl 第二次请求
      4. 检查响应中的 cached: true
    Expected: 第二次请求标记为 cached: true
  ```

  **Acceptance Criteria**:
  - [ ] API 返回真实数据（非mock）
  - [ ] 第二次请求使用缓存
  - [ ] 数据正确存储在 SQLite

---

### Wave 3: 最终提交

- [x] 4. 提交所有更改

  **What to do**:
  - 运行 `git add .`
  - 创建提交: `git commit -m "feat: 完成技术指标叠加和数据缓存功能"`
  - 更新 README 标记已完成功能

  **Acceptance Criteria**:
  - [ ] 所有更改已提交
  - [ ] README 更新反映当前状态

---

## Execution Strategy

### Dependency Matrix
- **1**: — 2, 修复是前置条件
- **2**: 1 — 3, 验证依赖修复
- **3**: 1, 2 — 4
- **4**: 1, 2, 3 — 结束

### Agent Dispatch
- **Wave 1**: quick - 修复字体问题
- **Wave 2**: unspecified-high - 功能验证和测试
- **Wave 3**: git - 最终提交

---

## Success Criteria

### Verification Commands
```bash
npm run build  # Expected: 构建成功
npm run dev    # Expected: 服务器启动
curl "http://localhost:3000/api/history?symbol=AAPL&range=1y"  # Expected: JSON响应
```

### Final Checklist
- [ ] 构建成功
- [ ] 数据缓存功能正常
- [ ] 指标叠加功能正常
- [ ] 所有测试通过