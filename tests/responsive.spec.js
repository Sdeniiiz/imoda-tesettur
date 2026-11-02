const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { name: '320px_small_mobile', width: 320, height: 568 },
  { name: '375px_mobile', width: 375, height: 667 },
  { name: '390px_iphone12_13', width: 390, height: 844 },
  { name: '430px_large_mobile', width: 430, height: 932 },
  { name: '768px_tablet_portrait', width: 768, height: 1024 },
  { name: '1024px_tablet_landscape', width: 1024, height: 768 },
  { name: '1366px_laptop', width: 1366, height: 768 },
  { name: '1920px_desktop', width: 1920, height: 1080 }
];

test.describe('Mobil ve Cihaz Uyumluluğu (320px - 1920px)', () => {
  for (const vp of VIEWPORTS) {
    test(`Ekran genişliği ${vp.width}px (${vp.name}) yatay taşma kontrolü`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const windowWidth = window.innerWidth;
        return {
          docWidth,
          windowWidth,
          hasOverflow: docWidth > windowWidth
        };
      });

      expect(overflow.hasOverflow, `Yatay taşma: docWidth=${overflow.docWidth}px, windowWidth=${overflow.windowWidth}px`).toBe(false);
    });
  }

  test('Mobil cihazlarda hamburger menü etkileşimi', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const menuBtn = page.locator('#mobileMenuBtn');
    await expect(menuBtn).toBeVisible();

    // Click menu button to open
    await menuBtn.click();
    await page.waitForTimeout(300);

    const mobileDrawer = page.locator('#mobileDrawer');
    await expect(mobileDrawer).toHaveClass(/open/);

    // Click again to close
    await menuBtn.click();
    await page.waitForTimeout(300);
    await expect(mobileDrawer).not.toHaveClass(/open/);
  });
});
