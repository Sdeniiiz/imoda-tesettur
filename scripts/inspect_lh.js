const fs = require('fs');

async function inspectLighthouse() {
  const lighthouseModule = await import('lighthouse');
  const lighthouse = lighthouseModule.default || lighthouseModule;
  const chromeLauncher = await import('chrome-launcher');

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
  });

  const runnerResult = await lighthouse('http://localhost:3001', {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance', 'best-practices', 'accessibility'],
    port: chrome.port
  });
  await chrome.kill();

  const report = JSON.parse(runnerResult.report);
  
  console.log('--- CLS ELEMENTS ---');
  if (report.audits['layout-shift-elements']) {
    console.log(JSON.stringify(report.audits['layout-shift-elements'].details?.items, null, 2));
  }

  console.log('--- LCP ELEMENT ---');
  if (report.audits['largest-contentful-paint-element']) {
    console.log(JSON.stringify(report.audits['largest-contentful-paint-element'].details?.items, null, 2));
  }

  console.log('--- BEST PRACTICES ISSUES ---');
  for (const [id, audit] of Object.entries(report.audits)) {
    if (report.categories['best-practices'].auditRefs.some(r => r.id === id) && audit.score !== null && audit.score < 1) {
      console.log(`- ${id}: ${audit.title} (score: ${audit.score})`);
      if (audit.description) console.log(`  ${audit.description}`);
    }
  }

  console.log('--- ACCESSIBILITY ISSUES ---');
  for (const [id, audit] of Object.entries(report.audits)) {
    if (report.categories.accessibility.auditRefs.some(r => r.id === id) && audit.score !== null && audit.score < 1) {
      console.log(`- ${id}: ${audit.title} (score: ${audit.score})`);
      if (audit.explanation) console.log(`  ${audit.explanation}`);
    }
  }
}

inspectLighthouse().catch(console.error);
