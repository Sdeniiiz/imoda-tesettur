const fs = require('fs');

async function findA11y() {
  const lighthouseModule = await import('lighthouse');
  const lh = lighthouseModule.default || lighthouseModule;
  const chromeLauncher = await import('chrome-launcher');
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const res = await lh('http://localhost:3001', { port: chrome.port, onlyCategories: ['accessibility'] });
  await chrome.kill();

  const audits = JSON.parse(res.report).audits;
  console.log('--- COLOR CONTRAST ITEMS ---');
  if (audits['color-contrast']?.details?.items) {
    console.log(audits['color-contrast'].details.items.map(i => ({
      node: i.node?.snippet,
      selector: i.node?.selector,
      explanation: i.node?.explanation
    })));
  }

  console.log('--- TARGET SIZE ITEMS ---');
  if (audits['target-size']?.details?.items) {
    console.log(audits['target-size'].details.items.map(i => ({
      node: i.node?.snippet,
      selector: i.node?.selector
    })));
  }
}

findA11y().catch(console.error);
