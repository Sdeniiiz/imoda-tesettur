const { test, expect } = require('@playwright/test');

test.describe('Teknik SEO ve Yapılandırılmış Veri Kontrolleri', () => {
  test('Ana sayfa title, meta description ve canonical etiketleri', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const title = await page.title();
    expect(title).toContain('Samsun Tesettür Giyim');
    expect(title.length).toBeGreaterThan(20);
    expect(title.length).toBeLessThan(75);

    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc.length).toBeGreaterThan(50);
    expect(desc.length).toBeLessThan(180);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    expect(canonical).toMatch(/^https?:\/\//);

    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('index');
    expect(robots).toContain('follow');
  });

  test('Open Graph ve Twitter Card etiketleri', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();

    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(ogDesc).toBeTruthy();

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBeTruthy();
    expect(ogImage).toMatch(/^https?:\/\//);

    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(twitterCard).toBe('summary_large_image');
  });

  test('Schema.org JSON-LD yapılandırılmış veri geçerliliği', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const scripts = await page.locator('script[type="application/ld+json"]').all();
    expect(scripts.length).toBeGreaterThan(0);

    let hasClothingStore = false;
    let hasWebSite = false;

    for (const s of scripts) {
      const content = await s.textContent();
      const json = JSON.parse(content);
      const graph = json['@graph'] || [json];
      for (const item of graph) {
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (types.includes('ClothingStore') || types.includes('LocalBusiness')) {
          hasClothingStore = true;
          expect(item.name).toBeTruthy();
          expect(item.address).toBeTruthy();
          expect(item.address.addressLocality).toBe('Bafra');
          expect(item.address.addressRegion).toBe('Samsun');
        }
        if (types.includes('WebSite')) {
          hasWebSite = true;
          expect(item.url).toBeTruthy();
        }
      }
    }

    expect(hasClothingStore).toBe(true);
    expect(hasWebSite).toBe(true);
  });

  test('H1 ve H2 başlık hiyerarşisi', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test('robots.txt ve sitemap.xml içerik doğrulaması', async ({ request }) => {
    const robotsRes = await request.get('/robots.txt');
    expect(robotsRes.status()).toBe(200);
    const robotsText = await robotsRes.text();
    expect(robotsText).toContain('User-agent: *');
    expect(robotsText).toContain('Allow: /');
    expect(robotsText).toContain('Disallow: /admin');
    expect(robotsText).toContain('Sitemap:');

    const sitemapRes = await request.get('/sitemap.xml');
    expect(sitemapRes.status()).toBe(200);
    const sitemapText = await sitemapRes.text();
    expect(sitemapText).toContain('<urlset');
    expect(sitemapText).toContain('samsun-tesettur-giyim');
    expect(sitemapText).toContain('/urun/');
  });

  test('404 sayfası HTTP 404 kodu ve kullanıcı dostu arayüz', async ({ page }) => {
    const response = await page.goto('/olmayan-test-sayfasi-404', { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(404);

    const title = await page.title();
    expect(title).toContain('404');

    const homeLink = page.locator('a:has-text("Ana Sayfaya Dön")');
    await expect(homeLink).toBeVisible();
  });
});
