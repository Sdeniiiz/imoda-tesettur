const { spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=====================================================');
console.log('🚀 i-moda Tesettür - Preflight Kalite & Test Süreci');
console.log('=====================================================\n');

function step(title, fn) {
  process.stdout.write(`⏳ ${title}... `);
  const start = Date.now();
  try {
    fn();
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✅ BAŞARILI (${duration}s)`);
    return true;
  } catch (err) {
    console.log(`❌ BAŞARISIZ!`);
    console.error(err.message || err);
    return false;
  }
}

let allOk = true;

// 1. Syntax / Lint Check
allOk = step('1. JavaScript Sözdizimi (Syntax Check)', () => {
  execSync('node --check server.js', { stdio: 'pipe' });
  execSync('node --check public/js/app.js', { stdio: 'pipe' });
  execSync('node --check public/js/admin.js', { stdio: 'pipe' });
}) && allOk;

// 2. Production Dependencies Security Audit
allOk = step('2. Bağımlılık Güvenlik Taraması (Production Audit)', () => {
  execSync('npm audit --omit=dev', { stdio: 'pipe' });
}) && allOk;

// 3. SEO & Internal Link Health Audit
allOk = step('3. Dahili Rota & SEO Bağlantı Denetimi', () => {
  execSync('node scripts/audit_links.js', { stdio: 'pipe' });
}) && allOk;

// 4. Playwright End-to-End, Responsive (8 Cihaz) & axe-core A11y
allOk = step('4. Playwright E2E, Responsive (8 Ekran) & axe-core', () => {
  execSync('npx playwright test --project=chromium', { stdio: 'inherit' });
}) && allOk;

// 5. Lighthouse Audit (Core Web Vitals)
allOk = step('5. Lighthouse Programatik Denetimi (CWV & SEO)', () => {
  execSync('node scripts/run_lighthouse.js', { stdio: 'inherit' });
}) && allOk;

console.log('\n=====================================================');
if (allOk) {
  console.log('🎉 TEBRİKLER! Tüm preflight kontrolleri başarıyla tamamlandı.');
  console.log('Durum: YAYINA HAZIR (Production Ready)');
  console.log('=====================================================\n');
  process.exit(0);
} else {
  console.log('⚠️ Bazı kontroller başarısız oldu. Lütfen yukarıdaki hataları inceleyin.');
  console.log('=====================================================\n');
  process.exit(1);
}
