# Findec Complete Development Plan

## TL;DR

> **Quick Summary**: Fix indicators API bug and implement all Phase 2 features (factor screening, backtesting, real-time monitoring, portfolio analysis)
> 
> **Deliverables**: 
> - Fixed indicators API with proper error handling
> - Factor screening system with multi-factor rules
> - Event-driven backtesting engine
> - Real-time monitoring with WebSocket alerts
> - Portfolio analysis with performance metrics
> 
> **Estimated Effort**: Large (2-3 weeks)
> **Parallel Execution**: YES - Multiple waves can run in parallel after dependency setup
> **Critical Path**: Bug Fix → Data Models → Factor Screening → Backtesting → Portfolio Analysis → Frontend → Verification

---

## Context

### Original Request
修复bug，继续开发，直到新功能都ready再提问

### Current State (from Research)
**Bug**: Indicators API returns 500 Internal Server Error
- **Root Cause**: Missing error handling and mock data fallback
- **Fix**: Add try-catch and fallback to `generateMockHistoricalData`

**Existing Architecture** (from explore agent findings):
- **Data Models**: Stock, HistoricalData, UserConfig
- **API Pattern**: GET routes with query params, JSON responses, error handling
- **Indicators**: MA, EMA, RSI, MACD via `calculateIndicators()`
- **Data Fetch**: `getHistoricalData()` with caching and mock fallback
- **Frontend**: React components with lightweight-charts

**Research Findings** (from librarian agent):
- **Factor Screening**: Event-driven with FactorDefinition, FactorScore, UniverseFilter
- **Backtesting**: Event-driven architecture with MarketEvent, Order, Trade, Account
- **Real-time**: WebSocket for low-latency, SSE for simple push, Polling for fallback
- **Portfolio**: Position, Trade, PerformanceSnapshot with Sharpe, Max Drawdown
- **Next.js 16**: Streaming, Suspense, App Router, prefetchInlining
- **Libraries**: technicalindicators, talib, chrono-tick for reference

---

## Work Objectives

### Core Objective
Fix the indicators API bug and implement complete Phase 2 features: factor screening, backtesting, real-time monitoring, and portfolio analysis.

### Concrete Deliverables
1. Fixed `/api/indicators` endpoint (error handling + mock fallback)
2. New Prisma models for FactorStrategy, FactorRule, ScreeningResult, BacktestPlan, BacktestTrade, Alert, Portfolio, Position, Transaction
3. Factor screening API with multi-factor rule engine
4. Backtesting engine with event-driven architecture
5. Real-time monitoring with WebSocket-based alerts
6. Portfolio analysis with performance metrics (Sharpe, Max Drawdown, Alpha/Beta)
7. Frontend UI components for all new features
8. Integration tests and verification evidence

### Definition of Done
- [ ] All APIs return correct responses (verified with curl)
- [ ] All database models created and migrated
- [ ] Factor screening works with multiple rules
- [ ] Backtesting runs strategies and generates reports
- [ ] Real-time monitoring sends alerts when thresholds reached
- [ ] Portfolio analysis calculates all metrics correctly
- [ ] Frontend pages render and interact correctly
- [ ] All verification evidence captured

### Must Have
- Proper error handling in all APIs (no 500 errors)
- Mock data fallback for all external API failures
- Database persistence for all user-generated data (strategies, alerts, portfolios)
- Real-time data streaming via WebSocket
- Comprehensive performance metrics for backtesting and portfolios

### Must NOT Have
- Complex strategy editor UI (simple JSON config first)
- Email notification system (browser notifications only)
- Multi-user support (single user only)
- Mobile-specific UI (desktop-first)
- Trading execution (analysis only, no actual trades)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Next.js, Prisma, SQLite)
- **Automated tests**: NO (manual verification via curl/UI)
- **Framework**: Next.js build + manual API testing + UI verification
- **Agent-Executed QA**: YES - every feature verified with concrete evidence

### QA Policy
Every feature includes agent-executed verification scenarios:
- **API**: Bash (curl) - capture JSON responses, timing
- **UI**: Playwright (screenshot) - verify components render
- **WebSocket**: interactive_bash (tmux) - verify real-time data flow
- **Database**: Bash (sqlite3) - verify data persistence

Evidence saved to `.sisyphus/evidence/phase2/`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Bug Fix - Foundation):
└── Task 1: Fix indicators API error handling [quick]

Wave 2 (Data Models - Unblocks all features):
└── Task 2: Add new Prisma models and migrate [quick]

Wave 3 (Factor Screening - Parallel after Wave 2):
├── Task 3: Factor screening API routes [quick]
├── Task 4: Factor rule engine [quick]
└── Task 5: Screening result storage [quick]

Wave 4 (Backtesting - Parallel after Wave 2):
├── Task 6: Backtest engine core [quick]
├── Task 7: Backtest strategy execution [quick]
└── Task 8: Backtest report generation [quick]

Wave 5 (Real-time Monitoring - Parallel after Wave 2):
├── Task 9: WebSocket server setup [quick]
├── Task 10: Alert engine and rules [quick]
└── Task 11: Real-time data streaming [quick]

Wave 6 (Portfolio Analysis - Parallel after Wave 2):
├── Task 12: Portfolio CRUD API [quick]
├── Task 13: Position management [quick]
└── Task 14: Performance metrics calculation [quick]

Wave 7 (Frontend Integration - After Wave 3-6):
├── Task 15: Factor screening UI [visual-engineering]
├── Task 16: Backtest UI [visual-engineering]
├── Task 17: Real-time dashboard [visual-engineering]
└── Task 18: Portfolio management UI [visual-engineering]

Wave 8 (Testing - After Wave 7):
├── Task 19: API endpoint testing [quick]
├── Task 20: UI component testing [quick]
├── Task 21: Integration testing [quick]
└── Task 22: Performance testing [quick]

Wave FINAL (Evidence & Report):
├── Task F1: Compile verification evidence [quick]
├── Task F2: Generate final report [quick]
└── Task F3: User acceptance verification [quick]
```

### Dependency Matrix
- **1**: — 2 (bug fix before models)
- **2**: 1 — 3,4,5,6 (models unblock all features)
- **3**: 2 — 7,15 (factor screening → frontend)
- **4**: 2 — 7,16 (backtesting → frontend)
- **5**: 2 — 7,17 (monitoring → frontend)
- **6**: 2 — 7,18 (portfolio → frontend)
- **7**: 3,4,5,6 — 8 (frontend → testing)
- **8**: 7 — F1 (testing → final)
- **F1-F3**: 8 — Complete

### Agent Dispatch Summary
- **Wave 1**: quick (bug fix)
- **Wave 2**: quick (data models)
- **Wave 3**: quick (factor screening backend)
- **Wave 4**: quick (backtesting backend)
- **Wave 5**: quick (real-time monitoring)
- **Wave 6**: quick (portfolio analysis)
- **Wave 7**: visual-engineering (frontend UI)
- **Wave 8**: quick (testing)
- **FINAL**: quick (evidence compilation)

---

## TODOs

### Wave 1: Bug Fix

- [ ] 1. Fix indicators API error handling

  **What to do**:
  - Edit `src/app/api/indicators/route.ts`
  - Add try-catch around `getHistoricalData()` call
  - Catch YahooFinanceError and fall back to `generateMockHistoricalData()`
  - Return proper JSON error response instead of 500
  - Test API with curl to verify fix

  **Must NOT do**:
  - Not adding error handling
  - Not testing the fix

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple error handling fix, pattern matching from history route
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (Sequential)
  - **Blocks**: Task 2 (data models depend on working indicators)
  - **Blocked By**: None

  **References**:
  - Current broken code: `src/app/api/indicators/route.ts:13` (getHistoricalData call without try-catch)
  - Working pattern: `src/app/api/history/route.ts:102-115` (error handling + mock fallback)
  - Mock data generator: `src/lib/yahoo-finance.ts:generateMockHistoricalData()`

  **Acceptance Criteria**:
  - [ ] Indicators API returns JSON with indicators when Yahoo Finance works
  - [ ] Indicators API returns JSON with indicators (from mock data) when Yahoo Finance fails
  - [ ] No 500 errors in any scenario
  - [ ] curl test passes: `curl "http://localhost:3000/api/indicators?symbol=AAPL&indicators=ma20,rsi"`

  **QA Scenarios**:
  ```
  Scenario: Indicators API works with Yahoo Finance
    Tool: Bash (curl)
    Steps:
      1. Start dev server
      2. curl "http://localhost:3000/api/indicators?symbol=AAPL&indicators=ma20,rsi"
      3. Verify JSON response with ma20 and rsi arrays
    Expected: HTTP 200, valid JSON with indicator data
    Evidence: .sisyphus/evidence/phase2/indicators-fix-success.json

  Scenario: Indicators API falls back to mock data
    Tool: Bash (curl)
    Steps:
      1. Start dev server (ensure Yahoo returns 403)
      2. curl "http://localhost:3000/api/indicators?symbol=AAPL&indicators=ma20,rsi"
      3. Verify JSON response with indicator data from mock
    Expected: HTTP 200, valid JSON (mock data), console warning about using mock
    Evidence: .sisyphus/evidence/phase2/indicators-fix-mock.json
  ```

  **Evidence to Capture**:
  - [ ] API response with real data
  - [ ] API response with mock data
  - [ ] Server console logs showing fallback

---

### Wave 2: Data Models

- [ ] 2. Add new Prisma models and migrate

  **What to do**:
  - Edit `prisma/schema.prisma`
  - Add FactorStrategy model
  - Add FactorRule model  
  - Add ScreeningResult model
  - Add BacktestPlan model
  - Add BacktestTrade model
  - Add Alert model
  - Add Portfolio model
  - Add Position model
  - Add Transaction model
  - Run `npx prisma migrate dev --name phase2-features`
  - Generate Prisma client

  **Must NOT do**:
  - Not running migration
  - Breaking existing models

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Database schema changes, straightforward
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Wave 1)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 3-14 (all features depend on data models)
  - **Blocked By**: Task 1 (bug fix)

  **References**:
  - Current schema: `prisma/schema.prisma`
  - Migration guide: Prisma docs

  **Acceptance Criteria**:
  - [ ] All new models added to schema
  - [ ] Migration successful: `npx prisma migrate dev`
  - [ ] Prisma client generated: `npx prisma generate`
  - [ ] Database tables created (verify with sqlite3)

  **QA Scenarios**:
  ```
  Scenario: Database schema updated
    Tool: Bash (sqlite3)
    Steps:
      1. Run migration
      2. sqlite3 prisma/dev.db ".tables"
      3. Verify new tables exist: FactorStrategy, FactorRule, etc.
    Expected: All new tables listed
    Evidence: .sisyphus/evidence/phase2/db-schema.txt
  ```

  **Evidence to Capture**:
  - [ ] Updated schema.prisma file
  - [ ] Migration output
  - [ ] Database tables list

---

### Wave 3: Factor Screening

- [ ] 3. Factor screening API routes

  **What to do**:
  - Create `src/app/api/factors/strategies/route.ts` (GET/POST)
  - Create `src/app/api/factors/screen/route.ts` (POST)
  - Implement CRUD for FactorStrategy
  - Implement screening logic endpoint

  **Must NOT do**:
  - Complex rule engine yet
  - Skip input validation

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4,5)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 15 (frontend)
  - **Blocked By**: Task 2 (data models)

- [ ] 4. Factor rule engine

  **What to do**:
  - Create `src/lib/factor-engine.ts`
  - Implement rule parsing (field, operator, value)
  - Implement scoring calculation
  - Support operators: >, <, >=, <=, ==, between

  **Must NOT do**:
  - Complex formula parsing
  - Skip unit tests

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3,5)

- [ ] 5. Screening result storage

  **What to do**:
  - Store screening results in ScreeningResult table
  - Add caching for repeated screenings
  - Implement result pagination

  **Must NOT do**:
  - Skip database writes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3,4)

---

### Wave 4: Backtesting

- [ ] 6. Backtest engine core

  **What to do**:
  - Create `src/lib/backtest-engine.ts`
  - Implement event-driven architecture
  - Define MarketEvent, Order, Trade types
  - Create Account state tracker

  **Must NOT do**:
  - Complex order matching
  - Skip transaction costs

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 7,8)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 16 (frontend)
  - **Blocked By**: Task 2 (data models)

- [ ] 7. Backtest strategy execution

  **What to do**:
  - Load historical data for backtest period
  - Iterate through events and execute strategy
  - Generate trades and update positions
  - Calculate daily equity

  **Must NOT do**:
  - Skip error handling

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6,8)

- [ ] 8. Backtest report generation

  **What to do**:
  - Calculate performance metrics (total return, Sharpe, max drawdown)
  - Generate trade list
  - Store results in BacktestPlan
  - Create report summary

  **Must NOT do**:
  - Skip metrics calculation

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6,7)

---

### Wave 5: Real-time Monitoring

- [ ] 9. WebSocket server setup

  **What to do**:
  - Create WebSocket server endpoint
  - Set up connection handling
  - Implement subscription management
  - Add heartbeat/ping-pong

  **Must NOT do**:
  - Skip authentication
  - No connection limits

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10,11)
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 17 (frontend)
  - **Blocked By**: Task 2 (data models)

- [ ] 10. Alert engine and rules

  **What to do**:
  - Create `src/lib/alert-engine.ts`
  - Define Alert model and rules
  - Implement rule evaluation
  - Trigger alerts when conditions met

  **Must NOT do**:
  - Skip rule validation

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 9,11)

- [ ] 11. Real-time data streaming

  **What to do**:
  - Poll Yahoo Finance API for price updates
  - Broadcast updates via WebSocket
  - Handle connection drops and reconnection
  - Implement rate limiting

  **Must NOT do**:
  - Skip error handling

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 9,10)

---

### Wave 6: Portfolio Analysis

- [ ] 12. Portfolio CRUD API

  **What to do**:
  - Create `src/app/api/portfolios/route.ts`
  - Implement GET, POST, PUT, DELETE
  - Handle portfolio creation and updates

  **Must NOT do**:
  - Skip validation

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 13,14)
  - **Parallel Group**: Wave 6
  - **Blocks**: Task 18 (frontend)
  - **Blocked By**: Task 2 (data models)

- [ ] 13. Position management

  **What to do**:
  - Create `src/app/api/portfolios/[id]/positions/route.ts`
  - Handle buy/sell transactions
  - Update position quantities and average cost
  - Store transaction history

  **Must NOT do**:
  - Skip transaction validation

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 12,14)

- [ ] 14. Performance metrics calculation

  **What to do**:
  - Create `src/lib/portfolio-metrics.ts`
  - Implement Sharpe Ratio calculation
  - Implement Max Drawdown calculation
  - Implement Alpha/Beta calculation
  - Store daily performance snapshots

  **Must NOT do**:
  - Skip edge cases (empty portfolio, single day)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 12,13)

---

### Wave 7: Frontend Integration

- [ ] 15. Factor screening UI

  **What to do**:
  - Create `src/app/factors/page.tsx`
  - Create factor strategy editor component
  - Create screening results display
  - Integrate with factor API

  **Must NOT do**:
  - Complex visualizations (table first)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend UI components, React, Tailwind
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 16,17,18)
  - **Parallel Group**: Wave 7
  - **Blocks**: Task 19 (testing)
  - **Blocked By**: Tasks 3-14 (all backends)

- [ ] 16. Backtest UI

  **What to do**:
  - Create `src/app/backtest/page.tsx`
  - Create strategy configuration form
  - Create backtest results display
  - Show performance metrics and trades

  **Must NOT do**:
  - Complex chart visualizations (simple metrics first)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15,17,18)

- [ ] 17. Real-time dashboard

  **What to do**:
  - Create WebSocket client hook
  - Create real-time price display
  - Create alert notification component
  - Integrate with alert API

  **Must NOT do**:
  - Skip connection error handling

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15,16,18)

- [ ] 18. Portfolio management UI

  **What to do**:
  - Create `src/app/portfolios/page.tsx`
  - Create portfolio list component
  - Create portfolio detail view
  - Show positions and performance metrics

  **Must NOT do**:
  - Complex allocation visualizations (table first)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15,16,17)

---

### Wave 8: Testing

- [ ] 19. API endpoint testing

  **What to do**:
  - Test all new API endpoints with curl
  - Verify JSON responses
  - Test error scenarios
  - Capture evidence

  **Must NOT do**:
  - Skip any endpoints

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20,21,22)
  - **Parallel Group**: Wave 8
  - **Blocks**: Tasks F1-F3 (final)
  - **Blocked By**: Task 15-18 (frontend)

- [ ] 20. UI component testing

  **What to do**:
  - Verify all new pages render
  - Test component interactions
  - Capture screenshots
  - Verify responsive design

  **Must NOT do**:
  - Skip visual verification

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 19,21,22)

- [ ] 21. Integration testing

  **What to do**:
  - Test full user workflows
  - Create factor → screen → view results
  - Create strategy → backtest → view report
  - Create alert → trigger → receive notification
  - Create portfolio → add position → view metrics

  **Must NOT do**:
  - Skip end-to-end flows

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 19,20,22)

- [ ] 22. Performance testing

  **What to do**:
  - Test API response times
  - Verify database query performance
  - Test WebSocket connection limits
  - Document performance baseline

  **Must NOT do**:
  - Skip load testing

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 19,20,21)

---

### Wave FINAL: Evidence & Report

- [ ] F1. Compile verification evidence

  **What to do**:
  - Collect all evidence files
  - Organize by feature
  - Verify completeness

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

- [ ] F2. Generate final report

  **What to do**:
  - Create VERIFICATION_REPORT.md
  - Summarize all features
  - List known issues
  - Document performance metrics

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

- [ ] F3. User acceptance verification

  **What to do**:
  - Present verification results
  - Confirm all requirements met
  - Get user sign-off

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (none needed)

---

## Success Criteria

### Verification Commands
```bash
# Bug Fix
npm run build  # Expected: success
curl "http://localhost:3000/api/indicators?symbol=AAPL&indicators=ma20,rsi"  # Expected: JSON with indicators, no 500

# Factor Screening
curl -X POST "http://localhost:3000/api/factors/strategies" -d '{"name":"Test","rules":[]}'  # Expected: created strategy
curl "http://localhost:3000/api/factors/strategies"  # Expected: list of strategies
curl -X POST "http://localhost:3000/api/factors/screen" -d '{"strategyId":"...","symbols":["AAPL"]}'  # Expected: screening results

# Backtesting
curl -X POST "http://localhost:3000/api/backtests/run" -d '{"name":"Test","symbols":["AAPL"],"startDate":"...","endDate":"...","initialCapital":10000}'  # Expected: backtest started
curl "http://localhost:3000/api/backtests/{id}"  # Expected: backtest results with metrics

# Real-time Monitoring
curl "http://localhost:3000/api/alerts"  # Expected: list of alerts
curl -X POST "http://localhost:3000/api/alerts" -d '{"symbol":"AAPL","condition":{"field":"price","operator":">","value":200}}'  # Expected: alert created

# Portfolio Analysis
curl "http://localhost:3000/api/portfolios"  # Expected: list of portfolios
curl -X POST "http://localhost:3000/api/portfolios" -d '{"name":"My Portfolio"}'  # Expected: portfolio created
curl "http://localhost:3000/api/portfolios/{id}"  # Expected: portfolio with positions and metrics
```

### Final Checklist
- [ ] All 22 tasks completed
- [ ] All evidence files captured
- [ ] Final report generated
- [ ] User acceptance confirmed
- [ ] No critical bugs
- [ ] Performance acceptable

---

## Evidence Directory Structure

```
.sisyphus/evidence/phase2/
├── bug-fix/
│   ├── indicators-fix-success.json
│   └── indicators-fix-mock.json
├── data-models/
│   └── db-schema.txt
├── factor-screening/
│   ├── strategies-api.json
│   ├── screen-api.json
│   └── ui-screenshot.png
├── backtesting/
│   ├── backtest-run.json
│   ├── backtest-results.json
│   └── ui-screenshot.png
├── real-time/
│   ├── alerts-api.json
│   ├── websocket-test.log
│   └── ui-screenshot.png
├── portfolio/
│   ├── portfolios-api.json
│   ├── positions-api.json
│   └── ui-screenshot.png
├── integration/
│   └── workflow-tests.log
├── performance/
│   └── performance-baseline.txt
└── VERIFICATION_REPORT.md
```

---

## Commit Strategy

- **1**: `fix(api): add error handling to indicators endpoint`
- **2**: `chore(db): add Phase 2 data models (factors, backtest, alerts, portfolios)`
- **3**: `feat(factors): implement factor screening API and rule engine`
- **4**: `feat(backtest): implement event-driven backtesting engine`
- **5**: `feat(monitoring): implement WebSocket real-time monitoring and alerts`
- **6**: `feat(portfolio): implement portfolio analysis with performance metrics`
- **7**: `feat(ui): add frontend pages for factors, backtest, monitoring, portfolios`
- **8**: `test: add integration tests and verification evidence`
- **9**: `docs: add Phase 2 verification report`

---

## Known Issues & Risks

**Risks**:
1. Yahoo Finance API rate limiting may affect real-time monitoring
   - **Mitigation**: Implement caching and fallback to mock data
2. WebSocket connections may drop frequently
   - **Mitigation**: Implement automatic reconnection
3. Backtesting large datasets may be slow
   - **Mitigation**: Add progress indicators and consider pagination
4. Factor screening with many stocks may timeout
   - **Mitigation**: Implement batching and async processing

**Known Limitations**:
- No email notifications (browser only)
- No complex strategy editor (JSON config only)
- No trading execution (analysis only)
- Single user only (no auth)
- Desktop-first UI (no mobile optimization)

---

## Plan Status

**Created**: 2026-04-03
**Updated**: 2026-04-03
**Status**: Ready for execution
**Next Action**: Run `/start-work findec-complete-development` to begin

---

## Notes

**Research Sources**:
- Explore agent: Architecture analysis from codebase
- Librarian agent: Best practices from Next.js docs, GitHub repos, npm libraries
- Key references:
  - Next.js Streaming: https://nextjs.org/learn/dashboard-app/streaming
  - Next.js 16.2: https://nextjs.org/blog/next-16-2
  - Technical indicators: @wahack/technicalindicators
  - Backtesting reference: ChronoTick-Algorithmic-Trading-Simulator
  - Portfolio metrics: Awesome Quant collection

**Execution Notes**:
- All waves after Wave 2 can run in parallel
- Frontend tasks (Wave 7) must wait for all backend completion
- Testing (Wave 8) must wait for frontend completion
- Estimated total time: 2-3 weeks with parallel execution