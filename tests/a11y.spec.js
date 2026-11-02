const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Erişilebilirlik Denetimi (axe-core WCAG 2.1 AA)', () => {
  test('Ana sayfa erişilebilirlik taraması', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Analyze page accessibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // We verify contrast separately
      .analyze();

    // Log violations if any
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Axe Violations:', JSON.stringify(accessibilityScanResults.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.length })), null, 2));
    }

    expect(accessibilityScanResults.violations.filter(v => v.impact === 'critical')).toEqual([]);
  });

  test('Mağaza rehberi sayfası erişilebilirlik taraması', async ({ page }) => {
    await page.goto('/samsun-tesettur-giyim', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations.filter(v => v.impact === 'critical')).toEqual([]);
  });
});
