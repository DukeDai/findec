import { test, expect, ConsoleMessage } from '@playwright/test';

/**
 * FinDec P0 Features E2E Tests
 * Tests 5 core features:
 * 1. VWAP Indicator
 * 2. RSI Alert Creation
 * 3. JSON Editor
 * 4. Quarterly Rebalancing
 * 5. Factor Four Classifications
 */

function hasUnexpectedConsoleErrors(messages: ConsoleMessage[]): boolean {
  const unexpectedErrors = messages.filter(msg => {
    if (msg.type() !== 'error') return false;
    const text = msg.text().toLowerCase();
    // Known benign errors to ignore
    if (text.includes('404') || text.includes('not found')) return false;
    if (text.includes('websocket') || text.includes('ws://')) return false;
    if (text.includes('socket')) return false;
    if (text.includes('net::err_') || text.includes('failed to load resource')) return false;
    if (text.includes('failed to fetch') || text.includes('network error')) return false;
    if (text.includes('resizeobserver')) return false;
    return true;
  });
  return unexpectedErrors.length > 0;
}

test.describe('FinDec P0 Features', () => {
  const consoleMessages: ConsoleMessage[] = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages.length = 0;
    page.on('console', (msg) => {
      consoleMessages.push(msg);
    });
  });

  test.describe('Test 1: VWAP Indicator', () => {
    test('should load homepage with chart and toggle VWAP indicator', async ({ page }) => {
      await page.goto('http://localhost:3000');

      await expect(page.locator('h1')).toContainText('股票K线');

      await page.waitForSelector('text=股价走势', { state: 'visible', timeout: 10000 });

      const vwapLabel = page.locator('label', { hasText: 'VWAP' });
      await expect(vwapLabel).toBeVisible();

      const vwapCheckbox = vwapLabel.locator('input[type="checkbox"]');
      await expect(vwapCheckbox).toBeVisible();
      
      await vwapCheckbox.click();

      await expect(vwapCheckbox).toBeChecked();

      await page.waitForTimeout(1000);

      expect(hasUnexpectedConsoleErrors(consoleMessages)).toBe(false);
    });
  });

  test.describe('Test 2: RSI Alert Creation', () => {
    test('should create RSI overbought alert', async ({ page }) => {
      await page.goto('http://localhost:3000/analysis');

      await expect(page.locator('h1')).toContainText('量化分析');

      const alertsTab = page.locator('button', { hasText: '实时监控' });
      await alertsTab.click();

      await page.waitForTimeout(500);

      const newAlertButton = page.locator('button', { hasText: '新建预警' });
      await expect(newAlertButton).toBeVisible();
      await newAlertButton.click();

      await expect(page.locator('h3', { hasText: '新建价格预警' })).toBeVisible();

      const symbolInput = page.locator('input[placeholder="AAPL"]').first();
      await expect(symbolInput).toBeVisible();
      await symbolInput.fill('AAPL');

      const conditionSelect = page.locator('select').first();
      await conditionSelect.selectOption('rsi_overbought');

      const targetValueInput = page.locator('input[type="number"]').first();
      await targetValueInput.fill('70');

      let apiResponse: unknown = null;
      page.on('response', (response) => {
        if (response.url().includes('/api/alerts') && response.request().method() === 'POST') {
          apiResponse = response;
        }
      });

      const createButton = page.locator('button', { hasText: '创建' }).first();
      await createButton.click();

      await page.waitForTimeout(1000);

      await expect(page.locator('text=AAPL').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=RSI 超买').first()).toBeVisible();
      await expect(page.locator('text=70').first()).toBeVisible();

      if (apiResponse) {
        const r = apiResponse as { status(): number };
        expect(r.status()).toBe(201);
      }

      expect(hasUnexpectedConsoleErrors(consoleMessages)).toBe(false);

      try {
        const deleteButton = page.locator('button', { hasText: '删除' }).first();
        await deleteButton.click();
        await page.waitForTimeout(500);
      } catch {}
    });
  });

  test.describe('Test 3: JSON Editor', () => {
    test('should switch between visual and JSON editing modes', async ({ page }) => {
      await page.goto('http://localhost:3000/strategy-editor');

      await expect(page.locator('h1')).toContainText('策略编辑器');

      const newStrategyButton = page.locator('button', { hasText: '新建策略' }).first();
      await expect(newStrategyButton).toBeVisible();
      await newStrategyButton.click();

      await expect(page.locator('[data-slot="card-title"]', { hasText: '新建策略' })).toBeVisible();

      await expect(page.locator('text=条件设置')).toBeVisible();

      const jsonEditButton = page.locator('button', { hasText: 'JSON编辑' });
      await expect(jsonEditButton).toBeVisible();
      await jsonEditButton.click();

      const jsonTextarea = page.locator('textarea');
      await expect(jsonTextarea).toBeVisible();

      const jsonContent = await jsonTextarea.inputValue();
      expect(() => JSON.parse(jsonContent)).not.toThrow();
      
      const parsed = JSON.parse(jsonContent);
      expect(parsed).toHaveProperty('rules');
      expect(parsed).toHaveProperty('actions');

      const backToVisualButton = page.locator('button', { hasText: '返回可视化' });
      await expect(backToVisualButton).toBeVisible();
      await backToVisualButton.click();

      await expect(page.locator('text=条件设置')).toBeVisible();

      expect(hasUnexpectedConsoleErrors(consoleMessages)).toBe(false);

      try {
        const cancelButton = page.locator('button', { hasText: '取消' }).first();
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      } catch {}
    });
  });

  test.describe('Test 4: Quarterly Rebalancing', () => {
    test('should have quarterly rebalancing option in portfolio backtest', async ({ page }) => {
      await page.goto('http://localhost:3000/analysis');

      await expect(page.locator('h1')).toContainText('量化分析');

      const portfolioBacktestTab = page.locator('button', { hasText: '组合回测' });
      await portfolioBacktestTab.click();

      await page.waitForTimeout(500);

      const newBacktestButton = page.locator('button', { hasText: '新建组合回测' });
      await expect(newBacktestButton).toBeVisible({ timeout: 5000 });
      await newBacktestButton.click();

      await expect(page.locator('text=新建组合回测计划')).toBeVisible();

      const rebalanceLabel = page.locator('label', { hasText: /^再平衡$/ });
      await expect(rebalanceLabel).toBeVisible();

      const rebalanceSelect = rebalanceLabel.locator('..').locator('select');
      await expect(rebalanceSelect).toBeVisible();

      const quarterlyOption = rebalanceSelect.locator('option[value="quarterly"]');
      await expect(quarterlyOption).toHaveCount(1);
      await expect(quarterlyOption).toHaveText('每季度');

      const options = await rebalanceSelect.locator('option').allTextContents();
      expect(options).toContain('每季度');

      expect(hasUnexpectedConsoleErrors(consoleMessages)).toBe(false);

      try {
        const cancelButton = page.locator('button', { hasText: /取消|关闭/ }).first();
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      } catch {}
    });
  });

  test.describe('Test 5: Factor Four Classifications', () => {
    test('should display factor screener with preset strategy cards and classifications', async ({ page }) => {
      await page.goto('http://localhost:3000/analysis');

      await expect(page.locator('h1')).toContainText('量化分析');

      const screenerTab = page.locator('button', { hasText: '因子选股' });
      await expect(screenerTab).toBeVisible();

      await page.waitForTimeout(500);

      await expect(page.locator('text=预设策略模板')).toBeVisible();

      const valueInvestingCard = page.locator('[data-slot="card"]', { hasText: '价值投资' }).first();
      await expect(valueInvestingCard).toBeVisible({ timeout: 5000 });

      const valueTag = valueInvestingCard.locator('span', { hasText: '价值' });
      await expect(valueTag).toBeVisible();

      const tags = ['低估值', '高股息', '防御'];
      for (const tag of tags) {
        const tagElement = valueInvestingCard.locator('span', { hasText: tag });
        await expect(tagElement.first()).toBeVisible();
      }

      const applyButton = valueInvestingCard.locator('button', { hasText: /应用|应用到当前/ });
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);
      }

      expect(hasUnexpectedConsoleErrors(consoleMessages)).toBe(false);
    });
  });
});
