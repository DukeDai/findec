# Phase 1 Verification Plan

## TL;DR

> **Quick Summary**: Verify all Phase 1 features work correctly - build, APIs, UI, and data caching
> 
> **Deliverables**: 
> - Verification evidence (screenshots, API responses, build logs)
> - Confirmation all features operational
> 
> **Estimated Effort**: Quick (~15-20 minutes)
> **Parallel Execution**: NO - sequential verification
> **Critical Path**: Build → Dev Server → API Tests → UI Tests → Cache Verification

---

## Context

### Original Request
User wants to verify Phase 1 completion before proceeding to new features.

### Current State
- ✅ Git commits: `a9d251b docs: 更新 README`, `47b8356 feat: 修复构建错误，完成数据缓存功能`
- ✅ README shows Phase 1 features marked complete
- ⚠️ Need to verify actual functionality (not just commits)

### Features to Verify
1. **Build System**: `npm run build` succeeds without errors
2. **Dev Server**: `npm run dev` starts successfully on localhost:3000
3. **API Endpoints**: 
   - `/api/quotes` - real-time quotes
   - `/api/history` - historical data with caching
   - `/api/search` - stock search
   - `/api/indicators` - technical indicator calculations
4. **UI Pages**:
   - Dashboard page (`/dashboard`)
   - Chart detail page (`/chart/[symbol]`)
   - Stock list and quick quote components
5. **Technical Indicators Overlay**: MA, EMA, RSI, MACD display on charts
6. **Data Caching**: SQLite storage working (first fetch vs cached fetch)

---

## Work Objectives

### Core Objective
Verify all Phase 1 features work correctly with concrete evidence.

### Concrete Deliverables
- Build log showing success
- API response screenshots/logs showing correct data
- UI screenshots showing components render correctly
- Cache verification evidence (timing comparison: first vs second request)

### Definition of Done
- [ ] Build succeeds (no errors)
- [ ] Dev server starts and accessible
- [ ] All 4 API endpoints return valid responses
- [ ] Dashboard and chart pages render correctly
- [ ] Technical indicators display on charts
- [ ] Data caching reduces response time on second request

### Must Have
- Concrete evidence for each verification (not just "it works")
- Specific API responses with JSON structure
- Screenshots with visible content
- Timing data for cache comparison

### Must NOT Have
- Skipping verification steps
- Assuming features work without testing
- Not capturing evidence

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Next.js, Prisma, SQLite)
- **Automated tests**: NO (manual verification only)
- **Framework**: Next.js build + manual testing
- **Agent-Executed QA**: YES - agent will run all verification commands

### QA Policy
Every verification step includes agent-executed commands with evidence capture.
Evidence saved to `.sisyphus/evidence/verification/`.

- **Build**: Use Bash (npm run build) - capture stdout/stderr
- **Dev Server**: Use Bash (npm run dev) - check startup logs
- **API**: Use Bash (curl) - capture JSON responses, timing data
- **UI**: Use Bash (curl or screenshot tool) - capture rendered HTML or open in browser

---

## Execution Strategy

### Parallel Execution Waves

> Sequential verification - each step confirms readiness for next.

```
Wave 1 (Build Verification):
└── Task 1: Run build and capture logs [quick]

Wave 2 (Dev Server Verification):
└── Task 2: Start dev server and verify startup [quick]

Wave 3 (API Verification):
├── Task 3: Test quotes API [quick]
├── Task 4: Test history API (first request) [quick]
├── Task 5: Test history API (second request - cache) [quick]
├── Task 6: Test search API [quick]
└── Task 7: Test indicators API [quick]

Wave 4 (UI Verification):
├── Task 8: Verify dashboard page renders [quick]
├── Task 9: Verify chart page renders [quick]
└── Task 10: Verify technical indicators display [quick]

Wave FINAL (Evidence Summary):
└── Task F1: Compile all evidence and create verification report [quick]
```

### Dependency Matrix
- **1**: — 2 (build must succeed before server start)
- **2**: 1 — 3-7 (server must run before API tests)
- **3-7**: 2 — 8-10 (APIs must work before UI verification)
- **8-10**: 3-7 — F1 (UI needs working APIs)
- **F1**: 8-10 — Final

### Agent Dispatch Summary
- **Wave 1**: 1 → `quick` (build verification)
- **Wave 2**: 2 → `quick` (server verification)
- **Wave 3**: 3-7 → `quick` (API tests, can run in parallel if server stable)
- **Wave 4**: 8-10 → `quick` (UI verification)
- **FINAL**: F1 → `quick` (evidence compilation)

---

## TODOs

### Wave 1: Build Verification

- [x] 1. Verify build succeeds

  **What to do**:
  - Run `npm run build` in worktree directory
  - Capture complete build log (stdout + stderr)
  - Verify no errors or warnings
  - Save build output to evidence file

  **Must NOT do**:
  - Skip checking for warnings (only errors)
  - Ignore TypeScript compilation issues

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple command execution, no complex logic
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (Sequential)
  - **Blocks**: Task 2 (server verification)
  - **Blocked By**: None (can start immediately)

  **References**:
  - Working directory: `/Users/dukedai/Dev/findec/.worktrees/findec-dev`
  - Build command: `npm run build`

  **Acceptance Criteria**:
  - [ ] Build completes successfully (exit code 0)
  - [ ] No TypeScript errors
  - [ ] No critical warnings
  - [ ] Build log saved to `.sisyphus/evidence/verification/build.log`

  **QA Scenarios**:
  ```
  Scenario: Build succeeds without errors
    Tool: Bash
    Preconditions: Clean working directory, all dependencies installed
    Steps:
      1. cd /Users/dukedai/Dev/findec/.worktrees/findec-dev
      2. npm run build > .sisyphus/evidence/verification/build.log 2>&1
      3. Check exit code: echo $? (expected: 0)
      4. grep -i "error" .sisyphus/evidence/verification/build.log (expected: no matches)
    Expected Result: Exit code 0, no "error" in build log
    Failure Indicators: Exit code ≠ 0, "Type error" or "Failed to compile" in log
    Evidence: .sisyphus/evidence/verification/build.log
  ```

  **Evidence to Capture**:
  - [ ] Build log file with complete output
  - [ ] Exit code confirmation

---

### Wave 2: Dev Server Verification

- [x] 2. Verify dev server starts

  **What to do**:
  - Run `npm run dev` and capture startup logs
  - Wait for "Ready in" message
  - Verify server accessible at localhost:3000
  - Save startup log to evidence file

  **Must NOT do**:
  - Not waiting for full startup
  - Skipping accessibility check

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple server startup verification
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (Sequential)
  - **Blocks**: Tasks 3-7 (API tests)
  - **Blocked By**: Task 1 (build verification)

  **References**:
  - Dev command: `npm run dev`
  - Expected startup message: "Ready in" or "Local: http://localhost:3000"

  **Acceptance Criteria**:
  - [ ] Server starts without errors
  - [ ] "Ready" message appears in logs
  - [ ] localhost:3000 accessible
  - [ ] Startup log saved to `.sisyphus/evidence/verification/dev-startup.log`

  **QA Scenarios**:
  ```
  Scenario: Dev server starts successfully
    Tool: Bash
    Preconditions: Build succeeded
    Steps:
      1. npm run dev > .sisyphus/evidence/verification/dev-startup.log 2>&1 &
      2. sleep 5 (wait for startup)
      3. curl -s http://localhost:3000 > /dev/null && echo "Server accessible" || echo "Server not accessible"
      4. grep -i "ready" .sisyphus/evidence/verification/dev-startup.log
    Expected Result: "Server accessible", "Ready" message in log
    Failure Indicators: "Server not accessible", no "Ready" message, error in log
    Evidence: .sisyphus/evidence/verification/dev-startup.log
  ```

  **Evidence to Capture**:
  - [ ] Dev startup log
  - [ ] curl accessibility check result

---

### Wave 3: API Verification

- [x] 3. Test quotes API

- [x] 4. Test history API (first request)

- [x] 5. Test history API (second request - cache verification)

- [x] 6. Test search API

- [x] 7. Test indicators API

  **What to do**:
  - Test `/api/indicators?symbol=AAPL&indicators=ma20,rsi`
  - Verify JSON response structure
  - Check response contains requested indicator calculations
  - Validate indicator values are numeric
  - Save response to evidence file

  **Must NOT do**:
  - Not validating indicator calculation structure
  - Accepting missing requested indicators

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Indicator calculation API testing
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 3-6)
  - **Blocks**: Task 10 (indicator display verification)
  - **Blocked By**: Task 2 (dev server)

  **References**:
  - API endpoint: `http://localhost:3000/api/indicators?symbol=AAPL&indicators=ma20,rsi`
  - Expected: Object with indicator keys (ma20, rsi) containing calculated values

  **Acceptance Criteria**:
  - [ ] API returns HTTP 200
  - [ ] Response contains `ma20` and `rsi` keys
  - [ ] Indicator values are numeric arrays
  - [ ] Response saved to `.sisyphus/evidence/verification/api-indicators.json`

  **QA Scenarios**:
  ```
  Scenario: Indicators API returns calculated values
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. curl -s "http://localhost:3000/api/indicators?symbol=AAPL&indicators=ma20,rsi" > .sisyphus/evidence/verification/api-indicators.json
      2. jq '.ma20 | length' .sisyphus/evidence/verification/api-indicators.json (expected: > 0)
      3. jq '.rsi | length' .sisyphus/evidence/verification/api-indicators.json (expected: > 0)
      4. jq '.ma20[0]' .sisyphus/evidence/verification/api-indicators.json (expected: numeric)
    Expected Result: JSON with ma20 and rsi arrays containing numeric values
    Failure Indicators: Missing indicator keys, empty arrays, non-numeric values
    Evidence: .sisyphus/evidence/verification/api-indicators.json
  ```

  **Evidence to Capture**:
  - [ ] API response JSON
  - [ ] Indicator value validation

---

### Wave 4: UI Verification

- [x] 8. Verify dashboard page renders

- [x] 9. Verify chart page renders

- [x] 10. Verify technical indicators display

  **What to do**:
  - Access `/chart/AAPL` page with indicators enabled
  - Verify MA, EMA, RSI, MACD indicators display on chart
  - Check indicator toggle controls exist
  - Capture screenshot showing indicator overlays
  - Save to evidence file

  **Must NOT do**:
  - Not verifying indicator overlays visible
  - Accepting chart without indicator lines

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Indicator overlay verification
  - **Skills**: [`playwright`] (for screenshot verification)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 8-9)
  - **Blocks**: Task F1 (evidence compilation)
  - **Blocked By**: Task 7 (indicators API must work), Tasks 3-7 (chart data)

  **References**:
  - Page URL: `http://localhost:3000/chart/AAPL`
  - Expected: Multiple line overlays on chart (MA5, MA10, MA20, MA60, EMA lines, RSI/MACD sub-charts)

  **Acceptance Criteria**:
  - [ ] Indicator toggle controls visible (checkboxes/buttons)
  - [ ] Chart shows multiple indicator line overlays
  - [ ] Indicator legend/labels visible
  - [ ] Screenshot saved to `.sisyphus/evidence/verification/chart-indicators.png`

  **QA Scenarios**:
  ```
  Scenario: Technical indicators display on chart
    Tool: Playwright (screenshot required for visual verification)
    Preconditions: Dev server running, indicators API working, chart page loaded
    Steps:
      1. Navigate to http://localhost:3000/chart/AAPL
      2. Wait for chart to render (timeout: 10s)
      3. Verify indicator toggle controls exist (checkboxes for MA, EMA, RSI, MACD)
      4. Enable all indicators (click checkboxes if needed)
      5. Screenshot: .sisyphus/evidence/verification/chart-indicators.png
      6. Verify screenshot shows multiple colored lines on chart
    Expected Result: Chart with multiple indicator line overlays, toggle controls visible
    Failure Indicators: No indicator lines, missing toggle controls, chart empty
    Evidence: .sisyphus/evidence/verification/chart-indicators.png
  ```

  **Evidence to Capture**:
  - [ ] Chart screenshot with indicators
  - [ ] Indicator toggle control verification

---

### Wave FINAL: Evidence Compilation

- [x] F1. Compile verification report

  **What to do**:
  - Review all evidence files collected
  - Create verification summary report
  - Confirm all acceptance criteria met
  - List any issues or warnings found
  - Save final report to `.sisyphus/evidence/verification/VERIFICATION_REPORT.md`

  **Must NOT do**:
  - Not reviewing all evidence files
  - Skipping issues or warnings

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Evidence compilation and report writing
  - **Skills**: [] (none needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave FINAL (Sequential)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1-10 (all verification tasks must complete)

  **References**:
  - Evidence directory: `.sisyphus/evidence/verification/`
  - All evidence files from previous tasks

  **Acceptance Criteria**:
  - [ ] All evidence files reviewed
  - [ ] Verification report created
  - [ ] Clear status: PASS/FAIL per feature
  - [ ] Any issues documented with severity
  - [ ] Report saved to `.sisyphus/evidence/verification/VERIFICATION_REPORT.md`

  **QA Scenarios**:
  ```
  Scenario: Verification report compiled successfully
    Tool: Bash (read files, create report)
    Preconditions: All verification tasks completed, evidence files exist
    Steps:
      1. ls .sisyphus/evidence/verification/ (verify all evidence files present)
      2. Read each evidence file, extract key results
      3. Create VERIFICATION_REPORT.md with sections:
         - Build Verification: PASS/FAIL
         - API Verification: PASS/FAIL per endpoint
         - UI Verification: PASS/FAIL per page
         - Cache Verification: PASS/FAIL with timing comparison
         - Issues Found: List any warnings/errors
      4. Save report to .sisyphus/evidence/verification/VERIFICATION_REPORT.md
    Expected Result: Complete verification report with all sections filled
    Failure Indicators: Missing evidence files, incomplete report sections
    Evidence: .sisyphus/evidence/verification/VERIFICATION_REPORT.md
  ```

  **Evidence to Capture**:
  - [ ] Final verification report markdown file
  - [ ] Summary of all verification results

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Verification Report Review** — User Review
  Read the verification report. Confirm all features verified successfully. If issues found, decide on action plan.

---

## Success Criteria

### Verification Commands
```bash
npm run build  # Expected: success, no errors
npm run dev    # Expected: server starts, localhost:3000 accessible
curl "http://localhost:3000/api/quotes?symbol=AAPL"  # Expected: JSON with quote data
curl "http://localhost:3000/api/history?symbol=MSFT&range=1y"  # Expected: JSON with cached:false first, cached:true second
curl "http://localhost:3000/api/search?q=apple"  # Expected: JSON with search results
curl "http://localhost:3000/api/indicators?symbol=AAPL&indicators=ma20,rsi"  # Expected: JSON with indicator calculations
curl "http://localhost:3000/dashboard"  # Expected: HTML with dashboard components
curl "http://localhost:3000/chart/AAPL"  # Expected: HTML with chart container
```

### Final Checklist
- [ ] Build succeeds without errors
- [ ] Dev server starts and accessible
- [ ] All API endpoints return valid responses
- [ ] Dashboard page renders correctly
- [ ] Chart page renders K-line chart
- [ ] Technical indicators display on chart
- [ ] Data caching reduces response time on second request
- [ ] All evidence files captured
- [ ] Verification report compiled

---

## Commit Strategy

No commits needed - verification only, no code changes.

---

## Notes

**Evidence Directory Structure:**
```
.sisyphus/evidence/verification/
├── build.log
├── dev-startup.log
├── api-quotes.json
├── api-history-first.json
├── api-history-second.json
├── api-search.json
├── api-indicators.json
├── dashboard.html (or dashboard.png)
├── chart-aapl.html (or chart-aapl.png)
├── chart-indicators.png
└── VERIFICATION_REPORT.md
```

**Timing Expectations:**
- First history API request: ~1500ms (fetch from Yahoo Finance or generate mock)
- Second history API request: <100ms (read from SQLite cache)
- Cache speedup: >90% reduction

**Known Issues:**
- Yahoo Finance API may return 403 (rate limiting) → system uses mock data fallback
- This is acceptable - mock data generation + SQLite caching is working correctly