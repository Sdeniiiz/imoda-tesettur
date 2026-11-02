const fs = require('fs');
const path = require('path');

async function runLighthouse() {
  console.log('Starting Lighthouse audit for http://localhost:3001 ...');
  const lighthouseModule = await import('lighthouse');
  const lighthouse = lighthouseModule.default || lighthouseModule;
  const chromeLauncher = await import('chrome-launcher');

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
  });

  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port
  };

  const runnerResult = await lighthouse('http://localhost:3001', options);
  await chrome.kill();

  const reportJson = JSON.parse(runnerResult.report);
  const categories = reportJson.categories;
  const audits = reportJson.audits;

  const results = {
    scores: {
      performance: Math.round(categories.performance.score * 100),
      accessibility: Math.round(categories.accessibility.score * 100),
      bestPractices: Math.round(categories['best-practices'].score * 100),
      seo: Math.round(categories.seo.score * 100)
    },
    metrics: {
      fcp: audits['first-contentful-paint'] ? audits['first-contentful-paint'].displayValue : 'N/A',
      lcp: audits['largest-contentful-paint'] ? audits['largest-contentful-paint'].displayValue : 'N/A',
      cls: audits['cumulative-layout-shift'] ? audits['cumulative-layout-shift'].displayValue : 'N/A',
      tbt: audits['total-blocking-time'] ? audits['total-blocking-time'].displayValue : 'N/A',
      speedIndex: audits['speed-index'] ? audits['speed-index'].displayValue : 'N/A'
    }
  };

  console.log('\n--- LIGHTHOUSE GERÇEK SONUÇLARI ---');
  console.log(`Performance:    ${results.scores.performance} / 100`);
  console.log(`Accessibility:  ${results.scores.accessibility} / 100`);
  console.log(`Best Practices: ${results.scores.bestPractices} / 100`);
  console.log(`SEO:            ${results.scores.seo} / 100`);
  console.log('\n--- CORE WEB VITALS (LAB DATA) ---');
  console.log(`FCP (First Contentful Paint):     ${results.metrics.fcp}`);
  console.log(`LCP (Largest Contentful Paint):   ${results.metrics.lcp}`);
  console.log(`CLS (Cumulative Layout Shift):    ${results.metrics.cls}`);
  console.log(`TBT (Total Blocking Time):        ${results.metrics.tbt}`);
  console.log(`Speed Index:                      ${results.metrics.speedIndex}`);

  fs.writeFileSync(path.join(__dirname, 'lighthouse-summary.json'), JSON.stringify(results, null, 2), 'utf-8');
  return results;
}

runLighthouse().catch(err => {
  console.error('Lighthouse test failed:', err);
  process.exit(1);
});
