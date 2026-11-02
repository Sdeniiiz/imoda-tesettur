const { test, expect } = require('@playwright/test');

test.describe('Fonksiyonel ve Kullanıcı Deneyimi Testleri', () => {
  test('Sayfa yüklenirken kritik JavaScript console hatası olmamalı', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        if (!txt.includes('favicon') && !txt.includes('status of 404')) {
          consoleErrors.push(txt);
        }
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    expect(consoleErrors).toEqual([]);
  });

  test('Arama çubuğu filtreleme fonksiyonu', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#allProductsGrid .product-card');

    const searchInput = page.locator('#searchInput');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('kap');
    await page.waitForTimeout(600);

    const cards = page.locator('#allProductsGrid .product-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const firstTitle = await cards.first().locator('.product-title').textContent();
    expect(firstTitle.toLowerCase()).toContain('kap');
  });

  test('Kategori sekmeleri filtreleme', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#allProductsGrid .product-card');

    const takimlarTab = page.locator('.filter-tab[data-cat="takimlar"]');
    await expect(takimlarTab).toBeVisible();
    await takimlarTab.click();
    await page.waitForTimeout(400);

    expect(await takimlarTab.getAttribute('class')).toContain('active');
  });

  test('Ürün kartı tıklama ve hızlı inceleme modalı', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#allProductsGrid .product-card');

    const firstCard = page.locator('#allProductsGrid .product-card').first();
    const media = firstCard.locator('.product-media');
    await media.click();
    await page.waitForTimeout(400);

    const modalBackdrop = page.locator('#productModalBackdrop');
    await expect(modalBackdrop).toHaveClass(/open/);

    const closeBtn = page.locator('#closeModalBtn');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await page.waitForTimeout(400);
    await expect(modalBackdrop).not.toHaveClass(/open/);
  });

  test('İkas satın al bağlantısı doğru URL formatına sahip olmalı', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.product-ikas-link');

    const ikasLinks = page.locator('.product-ikas-link');
    const firstLink = await ikasLinks.first().getAttribute('href');
    expect(firstLink).toBeTruthy();
    expect(firstLink).toMatch(/^https:\/\/imodatesettur\.com/);
  });
});
