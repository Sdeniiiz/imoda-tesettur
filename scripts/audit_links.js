const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

async function fetchUrl(urlPath) {
  return new Promise((resolve) => {
    http.get(`${BASE_URL}${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', (err) => resolve({ status: 500, error: err.message }));
  });
}

async function run() {
  console.log('Testing internal routes...');
  const routes = [
    '/',
    '/samsun-tesettur-giyim',
    '/bafra-tesettur-giyim',
    '/samsun-tesettur-magazalari',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.json',
    '/api/catalog',
    '/api/categories',
    '/api/products',
    '/api/seo/audit'
  ];

  // Read products to get real slugs
  const products = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'products.json'), 'utf-8')).products;
  if (products.length > 0) {
    routes.push(`/urun/${products[0].slug}`);
  }
  const categories = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'products.json'), 'utf-8')).categories;
  if (categories.length > 0) {
    routes.push(`/kategori/${categories[0].slug || categories[0].id}`);
  }

  let failures = 0;
  for (const r of routes) {
    const res = await fetchUrl(r);
    const ok = res.status >= 200 && res.status < 400;
    console.log(`${ok ? '✅' : '❌'} ${r} -> Status ${res.status}`);
    if (!ok) failures++;
  }

  console.log(`\nLink Audit Completed: ${routes.length - failures}/${routes.length} routes healthy.`);
  process.exit(failures > 0 ? 1 : 0);
}

run();
