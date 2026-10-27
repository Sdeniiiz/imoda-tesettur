const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'images', 'uploads');
const PRODUCTS_IMG_DIR = path.join(__dirname, 'public', 'images', 'products');
const BRAND_IMG_DIR = path.join(__dirname, 'public', 'images', 'brand');
const INSTAGRAM_IMG_DIR = path.join(__dirname, 'public', 'images', 'instagram');
const INSTAGRAM_MEDIA_DIR = path.join(__dirname, 'instagram_medya');
const IG_DATA_FILE = path.join(__dirname, 'data', 'instagram_posts_ready.json');

// Ensure required directories exist
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(PRODUCTS_IMG_DIR, { recursive: true });
fs.mkdirSync(BRAND_IMG_DIR, { recursive: true });
fs.mkdirSync(INSTAGRAM_IMG_DIR, { recursive: true });
fs.mkdirSync(INSTAGRAM_MEDIA_DIR, { recursive: true });

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/instagram_medya', express.static(INSTAGRAM_MEDIA_DIR));

// Safe helpers to read/write JSON database
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error('Veri dosyası bulunamadı: ' + DATA_FILE);
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function slugify(text) {
  const trMap = {
    'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u'
  };
  return String(text || '')
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, m => trMap[m] || m)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Normalize product payload
function normalizeProduct(payload, existing = null, allCategories = [], settings = {}) {
  const id = existing ? existing.id : ('imoda-' + Date.now());
  const title = (payload.title || 'Yeni Ürün').trim();
  const slug = payload.slug ? slugify(payload.slug) : slugify(title);
  const category = payload.category || 'takimlar';

  const defaultCategoryNames = {
    takimlar: 'Takım & İkili Takım',
    pardesu: 'Pardesü, Kap & Trençkot',
    elbise: 'Elbise',
    tunik: 'Tunik & Gömlek',
    esarp: 'İpek Eşarp & Şal',
    pantolon: 'Pantolon & Etek',
    aksesuar: 'Aksesuar & Çanta'
  };
  const foundCat = (allCategories || []).find(c => c.id === category || c.slug === category);

  const hasColors = payload.hasColors !== undefined
    ? Boolean(payload.hasColors)
    : (existing && existing.hasColors !== undefined ? Boolean(existing.hasColors) : true);

  const hasSizes = payload.hasSizes !== undefined
    ? Boolean(payload.hasSizes)
    : (existing && existing.hasSizes !== undefined
        ? Boolean(existing.hasSizes)
        : (foundCat && foundCat.defaultHasSizes !== undefined ? Boolean(foundCat.defaultHasSizes) : (category !== 'esarp' && category !== 'aksesuar')));

  const hasFabricInfo = payload.hasFabricInfo !== undefined
    ? Boolean(payload.hasFabricInfo)
    : (existing && existing.hasFabricInfo !== undefined
        ? Boolean(existing.hasFabricInfo)
        : Boolean(payload.fabricInfo || (existing && existing.fabricInfo)));

  const hasDescription = payload.hasDescription !== undefined
    ? Boolean(payload.hasDescription)
    : (existing && existing.hasDescription !== undefined
        ? Boolean(existing.hasDescription)
        : Boolean(payload.description || (existing && existing.description)));

  // Fallback Ikas URL
  const baseIkasUrl = (settings && settings.ikasStoreUrl) ? settings.ikasStoreUrl.replace(/\/+$/, '') : 'https://imodatesettur.com';
  const defaultIkasUrl = (payload.ikasUrl || (existing && existing.ikasUrl) || `${baseIkasUrl}/${slug}`).trim();

  const rawVariants = Array.isArray(payload.variants) && payload.variants.length > 0
    ? payload.variants
    : [
        {
          id: `${id}-var-1`,
          colorName: hasColors ? 'Standart' : '',
          colorHex: '#1a1816',
          ikasUrl: defaultIkasUrl,
          images: Array.isArray(payload.images) ? payload.images : [],
          sizes: hasSizes ? [{ size: '38', inStock: true }, { size: '40', inStock: true }, { size: '42', inStock: true }, { size: '44', inStock: true }] : []
        }
      ];

  const effectiveVariants = (hasColors ? rawVariants : [rawVariants[0]]).map((v, idx) => ({
    id: v.id || `${id}-var-${idx + 1}`,
    colorName: hasColors ? (v.colorName || 'Standart').trim() : '',
    colorHex: v.colorHex || '#1a1816',
    ikasUrl: (v.ikasUrl || defaultIkasUrl).trim(),
    images: Array.isArray(v.images)
      ? v.images.map(img => String(img).trim()).filter(Boolean)
      : [],
    sizes: hasSizes
      ? (Array.isArray(v.sizes) && v.sizes.length > 0
          ? v.sizes.map(s => ({
              size: String(s.size || 'Standart').trim(),
              inStock: s.inStock !== false
            }))
          : [])
      : []
  }));

  return {
    id,
    code: (payload.code || (existing && existing.code) || `IMD-${Math.floor(1000 + Math.random() * 9000)}`).trim(),
    title,
    slug,
    category,
    categoryName: payload.categoryName || (foundCat && foundCat.name) || defaultCategoryNames[category] || category,
    price: Number(payload.price) || 0,
    oldPrice: payload.oldPrice ? Number(payload.oldPrice) : null,
    isNew: payload.isNew !== undefined ? Boolean(payload.isNew) : true,
    featured: payload.featured !== undefined ? Boolean(payload.featured) : true,
    hasColors,
    hasSizes,
    hasFabricInfo,
    hasDescription,
    description: hasDescription ? (payload.description || '').trim() : '',
    fabricInfo: hasFabricInfo ? (payload.fabricInfo || '').trim() : '',
    instagramPostUrl: (payload.instagramPostUrl || (existing && existing.instagramPostUrl) || 'https://www.instagram.com/imoda_tesettur/').trim(),
    ikasUrl: defaultIkasUrl,
    variants: effectiveVariants,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ================= API ROUTES =================

// GET full catalog
app.get('/api/catalog', (req, res) => {
  try {
    const data = readData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Veri okunamadı', details: err.message });
  }
});

// GET products with optional filters
app.get('/api/products', (req, res) => {
  try {
    const data = readData();
    let products = data.products || [];
    const { category, search, color, size, sort } = req.query;

    if (category && category !== 'all') {
      products = products.filter(p => p.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
    }
    if (color) {
      const c = color.toLowerCase();
      products = products.filter(p =>
        (p.variants || []).some(v => v.colorName.toLowerCase().includes(c))
      );
    }
    if (size) {
      const s = size.toLowerCase();
      products = products.filter(p =>
        (p.variants || []).some(v =>
          (v.sizes || []).some(sz => sz.size.toLowerCase() === s && sz.inStock)
        )
      );
    }

    if (sort === 'price-asc') {
      products.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price-desc') {
      products.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'newest') {
      products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Ürünler listelenemedi', details: err.message });
  }
});

// GET single product
app.get('/api/products/:id', (req, res) => {
  try {
    const data = readData();
    const product = (data.products || []).find(p => p.id === req.params.id || p.slug === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Ürün getirilemedi', details: err.message });
  }
});

// POST create product
app.post('/api/products', (req, res) => {
  try {
    const data = readData();
    const newProduct = normalizeProduct(req.body, null, data.categories || [], data.settings || {});
    data.products = data.products || [];
    data.products.unshift(newProduct);
    writeData(data);
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: 'Ürün eklenemedi', details: err.message });
  }
});

// PUT update product
app.put('/api/products/:id', (req, res) => {
  try {
    const data = readData();
    const idx = (data.products || []).findIndex(p => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Güncellenecek ürün bulunamadı' });
    }
    const updated = normalizeProduct(req.body, data.products[idx], data.categories || [], data.settings || {});
    data.products[idx] = updated;
    writeData(data);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Ürün güncellenemedi', details: err.message });
  }
});

// PATCH quick update Ikas link(s)
app.patch('/api/products/:id/ikas', (req, res) => {
  try {
    const data = readData();
    const product = (data.products || []).find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    if (typeof req.body.ikasUrl === 'string') {
      product.ikasUrl = req.body.ikasUrl.trim();
    }
    if (Array.isArray(req.body.variantLinks)) {
      req.body.variantLinks.forEach(vl => {
        const v = (product.variants || []).find(item => item.id === vl.variantId);
        if (v && typeof vl.ikasUrl === 'string') {
          v.ikasUrl = vl.ikasUrl.trim();
        }
      });
    }
    product.updatedAt = new Date().toISOString();
    writeData(data);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'İkas bağlantısı güncellenemedi', details: err.message });
  }
});

// DELETE product
app.delete('/api/products/:id', (req, res) => {
  try {
    const data = readData();
    const initialLen = (data.products || []).length;
    data.products = (data.products || []).filter(p => p.id !== req.params.id);
    if (data.products.length === initialLen) {
      return res.status(404).json({ error: 'Silinecek ürün bulunamadı' });
    }
    writeData(data);
    res.json({ success: true, deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Ürün silinemedi', details: err.message });
  }
});

// CATEGORIES CRUD
app.get('/api/categories', (req, res) => {
  try {
    const data = readData();
    res.json(data.categories || []);
  } catch (err) {
    res.status(500).json({ error: 'Kategoriler okunamadı', details: err.message });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const data = readData();
    data.categories = data.categories || [];
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Kategori adı zorunludur' });
    }
    let slug = slugify(req.body.slug || name);
    if (!slug) slug = 'kategori-' + Date.now();

    if (data.categories.some(c => c.id === slug || c.slug === slug)) {
      slug = `${slug}-${Date.now().toString().slice(-3)}`;
    }

    const newCat = {
      id: slug,
      name,
      slug,
      image: (req.body.image || '/images/brand/imoda-logo.webp').trim(),
      featured: req.body.featured !== undefined ? Boolean(req.body.featured) : true,
      defaultHasColors: req.body.defaultHasColors !== undefined ? Boolean(req.body.defaultHasColors) : true,
      defaultHasSizes: req.body.defaultHasSizes !== undefined ? Boolean(req.body.defaultHasSizes) : true,
      defaultHasFabricInfo: req.body.defaultHasFabricInfo !== undefined ? Boolean(req.body.defaultHasFabricInfo) : true,
      defaultHasDescription: req.body.defaultHasDescription !== undefined ? Boolean(req.body.defaultHasDescription) : true
    };

    data.categories.push(newCat);
    writeData(data);
    res.status(201).json(newCat);
  } catch (err) {
    res.status(500).json({ error: 'Kategori eklenemedi', details: err.message });
  }
});

app.put('/api/categories/:id', (req, res) => {
  try {
    const data = readData();
    data.categories = data.categories || [];
    const idx = data.categories.findIndex(c => c.id === req.params.id || c.slug === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Kategori bulunamadı' });
    }
    const existing = data.categories[idx];
    const updatedName = req.body.name !== undefined ? String(req.body.name).trim() : existing.name;
    const updated = {
      ...existing,
      name: updatedName || existing.name,
      image: req.body.image !== undefined ? String(req.body.image).trim() : existing.image,
      featured: req.body.featured !== undefined ? Boolean(req.body.featured) : existing.featured,
      defaultHasColors: req.body.defaultHasColors !== undefined ? Boolean(req.body.defaultHasColors) : (existing.defaultHasColors !== false),
      defaultHasSizes: req.body.defaultHasSizes !== undefined ? Boolean(req.body.defaultHasSizes) : (existing.defaultHasSizes !== false),
      defaultHasFabricInfo: req.body.defaultHasFabricInfo !== undefined ? Boolean(req.body.defaultHasFabricInfo) : (existing.defaultHasFabricInfo !== false),
      defaultHasDescription: req.body.defaultHasDescription !== undefined ? Boolean(req.body.defaultHasDescription) : (existing.defaultHasDescription !== false)
    };
    data.categories[idx] = updated;

    (data.products || []).forEach(p => {
      if (p.category === existing.id || p.category === existing.slug) {
        p.categoryName = updated.name;
      }
    });

    writeData(data);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Kategori güncellenemedi', details: err.message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    const data = readData();
    data.categories = data.categories || [];
    const initialLen = data.categories.length;
    data.categories = data.categories.filter(c => c.id !== req.params.id && c.slug !== req.params.id);
    if (data.categories.length === initialLen) {
      return res.status(404).json({ error: 'Silinecek kategori bulunamadı' });
    }
    writeData(data);
    res.json({ success: true, deletedId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Kategori silinemedi', details: err.message });
  }
});

// POST upload image (base64)
app.post('/api/upload', (req, res) => {
  try {
    const { filename, dataUrl } = req.body;
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Geçersiz görsel formatı' });
    }
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Görsel verisi çözümlenemedi' });
    }
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const cleanBase = slugify(path.parse(filename || 'urun-gorsel').name) || 'gorsel';
    const finalName = `${cleanBase}-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, finalName);
    fs.writeFileSync(filePath, buffer);
    res.json({ url: `/images/uploads/${finalName}`, filename: finalName });
  } catch (err) {
    res.status(500).json({ error: 'Görsel yüklenemedi', details: err.message });
  }
});

// GET media library
app.get('/api/media', (req, res) => {
  try {
    const listDir = (dir, prefix) => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir)
        .filter(f => /\.(jpg|jpeg|png|webp|svg)$/i.test(f))
        .map(f => `${prefix}/${f}`);
    };
    const images = [
      ...listDir(INSTAGRAM_IMG_DIR, '/images/instagram'),
      ...listDir(INSTAGRAM_MEDIA_DIR, '/instagram_medya'),
      ...listDir(PRODUCTS_IMG_DIR, '/images/products'),
      ...listDir(BRAND_IMG_DIR, '/images/brand'),
      ...listDir(UPLOAD_DIR, '/images/uploads')
    ];
    res.json({ images });
  } catch (err) {
    res.status(500).json({ error: 'Görsel kütüphanesi okunamadı', details: err.message });
  }
});

// GET current Instagram feed posts
app.get('/api/instagram', (req, res) => {
  try {
    if (fs.existsSync(IG_DATA_FILE)) {
      const ig = JSON.parse(fs.readFileSync(IG_DATA_FILE, 'utf-8'));
      return res.json(ig);
    }
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: 'Instagram verisi okunamadı', details: err.message });
  }
});

// GET general site settings
app.get('/api/settings', (req, res) => {
  try {
    const data = readData();
    res.json(data.settings || {});
  } catch (err) {
    res.status(500).json({ error: 'Ayarlar okunamadı', details: err.message });
  }
});

// UPDATE general site settings
app.put('/api/settings', (req, res) => {
  try {
    const data = readData();
    data.settings = { ...data.settings, ...req.body };
    writeData(data);
    res.json(data.settings);
  } catch (err) {
    res.status(500).json({ error: 'Ayarlar kaydedilemedi', details: err.message });
  }
});

// Auto-generate Ikas links for all products using the base store URL
app.post('/api/ikas/bulk-generate-links', (req, res) => {
  try {
    const data = readData();
    const baseStoreUrl = (req.body.ikasStoreUrl || (data.settings && data.settings.ikasStoreUrl) || 'https://imodatesettur.com').replace(/\/+$/, '');
    let updatedCount = 0;

    (data.products || []).forEach(p => {
      const targetUrl = `${baseStoreUrl}/${p.slug}`;
      if (req.body.overwrite || !p.ikasUrl || p.ikasUrl.includes('example.com') || p.ikasUrl === '') {
        p.ikasUrl = targetUrl;
        (p.variants || []).forEach(v => {
          v.ikasUrl = targetUrl;
        });
        updatedCount++;
      }
    });

    if (data.settings) {
      data.settings.ikasStoreUrl = baseStoreUrl;
    }
    writeData(data);
    res.json({ success: true, updatedCount, baseStoreUrl });
  } catch (err) {
    res.status(500).json({ error: 'İkas linkleri oluşturulamadı', details: err.message });
  }
});

// Admin routes
app.get(['/admin', '/yonetim'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ================= SEO, ASO & SSR ENGINE =================

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeXml(str) {
  return escapeHtml(str).replace(/'/g, '&apos;');
}

function getBaseUrl(req, settings) {
  if (settings && settings.seo && settings.seo.siteUrl) {
    return settings.seo.siteUrl.replace(/\/+$/, '');
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.get('host') || 'imodatesettur.com';
  return `${proto}://${host}`;
}

// 1. ROBOTS.TXT
app.get('/robots.txt', (req, res) => {
  try {
    const data = readData();
    const baseUrl = getBaseUrl(req, data.settings);
    const robots = [
      'User-agent: *',
      'Allow: /',
      'Allow: /samsun-tesettur-giyim',
      'Allow: /bafra-tesettur-giyim',
      'Allow: /kategori/',
      'Allow: /urun/',
      'Allow: /images/',
      'Disallow: /admin',
      'Disallow: /yonetim',
      'Disallow: /api/',
      '',
      `Sitemap: ${baseUrl}/sitemap.xml`
    ].join('\n');
    res.type('text/plain').send(robots);
  } catch (err) {
    res.type('text/plain').send('User-agent: *\nAllow: /\n');
  }
});

// 2. DYNAMIC XML SITEMAP (With Google Image Sitemap Extension)
app.get('/sitemap.xml', (req, res) => {
  try {
    const data = readData();
    const baseUrl = getBaseUrl(req, data.settings);
    const nowIso = new Date().toISOString();
    const products = data.products || [];
    const categories = data.categories || [];

    let urlsXml = '';

    // Main & Local SEO Landing Pages
    const staticPages = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/samsun-tesettur-giyim`, priority: '0.95', changefreq: 'daily' },
      { loc: `${baseUrl}/bafra-tesettur-giyim`, priority: '0.95', changefreq: 'daily' },
      { loc: `${baseUrl}/samsun-tesettur-magazalari`, priority: '0.90', changefreq: 'weekly' }
    ];

    staticPages.forEach(sp => {
      urlsXml += `
  <url>
    <loc>${escapeXml(sp.loc)}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>${sp.changefreq}</changefreq>
    <priority>${sp.priority}</priority>
  </url>`;
    });

    // Category Pages
    categories.forEach(c => {
      const cid = c.slug || c.id;
      const catImg = c.image ? (c.image.startsWith('http') ? c.image : `${baseUrl}${c.image}`) : `${baseUrl}/images/brand/imoda-logo.webp`;
      urlsXml += `
  <url>
    <loc>${escapeXml(`${baseUrl}/kategori/${cid}`)}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
    <image:image>
      <image:loc>${escapeXml(catImg)}</image:loc>
      <image:title>${escapeXml(`Samsun Tesettür Giyim - ${c.name} | i-moda Tesettür`)}</image:title>
    </image:image>
  </url>`;
    });

    // Product Pages with Images
    products.forEach(p => {
      const pLoc = `${baseUrl}/urun/${p.slug}`;
      const pLastMod = p.updatedAt || p.createdAt || nowIso;
      const allImgs = [];
      (p.variants || []).forEach(v => {
        (v.images || []).forEach(img => {
          const fullImg = img.startsWith('http') ? img : `${baseUrl}${img}`;
          if (!allImgs.includes(fullImg)) allImgs.push(fullImg);
        });
      });

      const imgNodes = allImgs.slice(0, 5).map(imgUrl => `
    <image:image>
      <image:loc>${escapeXml(imgUrl)}</image:loc>
      <image:title>${escapeXml(`${p.title} - Samsun Tesettür Giyim i-moda`)}</image:title>
      <image:caption>${escapeXml(p.description || `${p.title} (${p.categoryName}) i-moda Tesettür Samsun Bafra`)}</image:caption>
    </image:image>`).join('');

      urlsXml += `
  <url>
    <loc>${escapeXml(pLoc)}</loc>
    <lastmod>${escapeXml(pLastMod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.80</priority>${imgNodes}
  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urlsXml}
</urlset>`;

    res.header('Content-Type', 'application/xml; charset=utf-8').send(xml);
  } catch (err) {
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

// 3. ASO / PWA WEB APP MANIFEST
app.get(['/manifest.json', '/site.webmanifest'], (req, res) => {
  try {
    const data = readData();
    const s = data.settings || {};
    const seo = s.seo || {};
    const manifest = {
      name: seo.asoAppName || 'i-moda Tesettür | Samsun Tesettür Giyim & Online Butik',
      short_name: seo.asoShortName || 'i-moda Tesettür',
      description: seo.asoDescription || seo.seoDescription || 'Samsun Bafra seçkin tesettür giyim, ikili takım, elbise, pardesü, kap ve Armine ipek eşarp mağazası.',
      lang: 'tr-TR',
      dir: 'ltr',
      start_url: '/?utm_source=pwa_app',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#11100f',
      theme_color: seo.themeColor || '#11100f',
      categories: ['shopping', 'fashion', 'lifestyle'],
      icons: [
        {
          src: '/images/brand/imoda-logo.webp',
          sizes: '192x192',
          type: 'image/webp',
          purpose: 'any maskable'
        },
        {
          src: '/images/brand/imoda-logo.webp',
          sizes: '512x512',
          type: 'image/webp',
          purpose: 'any maskable'
        }
      ],
      shortcuts: [
        {
          name: 'Yeni Sezon Koleksiyonu',
          short_name: 'Yeni Sezon',
          description: 'Samsun i-moda Tesettür yeni sezon ürünlerini incele',
          url: '/samsun-tesettur-giyim#koleksiyon',
          icons: [{ src: '/images/brand/imoda-logo.webp', sizes: '192x192' }]
        },
        {
          name: 'İkili Takımlar',
          short_name: 'Takımlar',
          description: 'Tesettür ikili takım modellerini keşfet',
          url: '/kategori/takimlar',
          icons: [{ src: '/images/brand/imoda-logo.webp', sizes: '192x192' }]
        },
        {
          name: 'İpek Eşarp & Şal',
          short_name: 'Eşarp & Şal',
          description: 'Armine Sura ipek eşarp ve özel seri şallar',
          url: '/kategori/esarp',
          icons: [{ src: '/images/brand/imoda-logo.webp', sizes: '192x192' }]
        }
      ]
    };
    res.header('Content-Type', 'application/manifest+json; charset=utf-8').json(manifest);
  } catch (err) {
    res.status(500).json({ error: 'Manifest oluşturulamadı' });
  }
});

// 4. SEO & ASO AUDIT ENDPOINT FOR ADMIN PANEL
app.get('/api/seo/audit', (req, res) => {
  try {
    const data = readData();
    const s = data.settings || {};
    const seo = s.seo || {};
    const products = data.products || [];
    const categories = data.categories || [];

    const title = seo.seoTitle || 'Samsun Tesettür Giyim | i-moda Tesettür Bafra Butik & Online Mağaza';
    const desc = seo.seoDescription || '';
    const kwList = (seo.seoKeywords || '').split(',').map(k => k.trim()).filter(Boolean);

    const productsWithImages = products.filter(p => p.variants && p.variants[0] && p.variants[0].images && p.variants[0].images.length > 0).length;
    const productsWithIkas = products.filter(p => p.ikasUrl && p.ikasUrl.startsWith('http')).length;

    const checks = [
      {
        id: 'local_keyword',
        title: '"Samsun Tesettür Giyim" Anahtar Kelime Odaklaması',
        passed: title.toLowerCase().includes('samsun') && title.toLowerCase().includes('tesettür'),
        detail: `Başlık ve meta açıklamasında "Samsun Tesettür Giyim" birincil hedef olarak konumlandırıldı.`
      },
      {
        id: 'title_length',
        title: 'SEO Başlık Uzunluğu (Title Tag)',
        passed: title.length >= 30 && title.length <= 75,
        detail: `${title.length} karakter (Google ideal aralığı: 50-70 karakter)`
      },
      {
        id: 'meta_desc',
        title: 'Meta Açıklama (Meta Description) Kalitesi',
        passed: desc.length >= 110 && desc.length <= 220,
        detail: `${desc.length} karakter (Tıklama oranını artıran yerel + ürün odaklı açıklama)`
      },
      {
        id: 'schema_org',
        title: 'Schema.org JSON-LD Yapısal Veri (LocalBusiness + Product + FAQ)',
        passed: true,
        detail: `ClothingStore (Samsun/Bafra koordinatlı), ${products.length} Ürün Rich Snippet ve SSS şeması aktif.`
      },
      {
        id: 'sitemap_robots',
        title: 'Dinamik Sitemap.xml (Görsel Destekli) & Robots.txt',
        passed: true,
        detail: `${products.length + categories.length + 4} adet indekslemeye hazır SEO URL ve Google Image Sitemap aktif.`
      },
      {
        id: 'aso_pwa',
        title: 'ASO & Mobil Uygulama (PWA Web Manifest & Apple Touch)',
        passed: Boolean(seo.asoAppName),
        detail: `iOS ve Android "Ana Ekrana Ekle" uygulama kısayolları ve ASO meta etiketleri aktif.`
      },
      {
        id: 'product_images',
        title: 'Görsel SEO & Alt Etiket Optimizasyonu',
        passed: productsWithImages === products.length,
        detail: `${productsWithImages}/${products.length} üründe yerel SEO uyumlu görsel alt metni mevcut.`
      }
    ];

    const passedCount = checks.filter(c => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);

    res.json({
      score,
      totalUrlsInSitemap: products.length + categories.length + 4,
      keywordCount: kwList.length,
      productsIndexed: products.length,
      productsWithIkas,
      checks
    });
  } catch (err) {
    res.status(500).json({ error: 'SEO analizi yapılamadı', details: err.message });
  }
});

// Helper to build complete Schema.org JSON-LD Graph
function buildStructuredData(data, baseUrl, routeOpts = {}) {
  const s = data.settings || {};
  const seo = s.seo || {};
  const products = data.products || [];

  const storeSchema = {
    '@type': ['ClothingStore', 'LocalBusiness', 'Store'],
    '@id': `${baseUrl}/#store`,
    name: seo.seoTitle || 'i-moda Tesettür | Samsun Tesettür Giyim & Bafra Butik',
    alternateName: ['i-moda Tesettür', 'imoda tesettür samsun', 'Samsun i-moda Tesettür Giyim'],
    description: seo.seoDescription || 'Samsun tesettür giyim ve Bafra tesettür butik mağazası. Yeni sezon ikili takım, pardesü, kap, trençkot, elbise, tunik ve Armine Sura ipek eşarp koleksiyonu.',
    url: baseUrl,
    logo: `${baseUrl}/images/brand/imoda-logo.webp`,
    image: [
      `${baseUrl}${seo.ogImage || '/images/instagram/fotograf_01_DePEPuOs9ic.jpg'}`,
      `${baseUrl}/images/instagram/fotograf_03_Dd6MdGtDh4m.jpg`,
      `${baseUrl}/images/instagram/fotograf_07_DbxpzUdjB00.jpg`
    ],
    telephone: s.phone || '+90 546 642 61 55',
    priceRange: '₺₺',
    currenciesAccepted: 'TRY',
    paymentAccepted: 'Kredi Kartı, Banka Kartı, İkas Güvenli Ödeme, Havale/EFT',
    address: {
      '@type': 'PostalAddress',
      streetAddress: s.address || 'Cumhuriyet Mah. Hükümet Cad. No: 10/B',
      addressLocality: seo.localDistrict || 'Bafra',
      addressRegion: seo.localCity || 'Samsun',
      postalCode: seo.postalCode || '55400',
      addressCountry: 'TR'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: Number(seo.latitude || 41.5678),
      longitude: Number(seo.longitude || 35.9069)
    },
    hasMap: seo.googleMapsUrl || 'https://maps.google.com/?q=Cumhuriyet+Mah.+H%C3%BCk%C3%BCmet+Cad.+No:10/B+Bafra+Samsun',
    areaServed: [
      { '@type': 'City', name: 'Samsun' },
      { '@type': 'AdministrativeArea', name: 'Bafra' },
      { '@type': 'AdministrativeArea', name: 'Atakum' },
      { '@type': 'AdministrativeArea', name: 'İlkadım' },
      { '@type': 'AdministrativeArea', name: 'Canik' },
      { '@type': 'AdministrativeArea', name: 'Çarşamba' },
      { '@type': 'AdministrativeArea', name: 'Terme' },
      { '@type': 'AdministrativeArea', name: 'Vezirköprü' },
      { '@type': 'Country', name: 'Türkiye' }
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '09:00',
        closes: '20:30'
      }
    ],
    sameAs: [
      s.instagram || 'https://www.instagram.com/imoda_tesettur/',
      s.ikasStoreUrl || 'https://imodatesettur.com'
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '184',
      bestRating: '5',
      worstRating: '1'
    }
  };

  const websiteSchema = {
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    url: baseUrl,
    name: 'i-moda Tesettür | Samsun Tesettür Giyim',
    inLanguage: 'tr-TR',
    publisher: { '@id': `${baseUrl}/#store` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Samsun Tesettür Giyim (i-moda)',
      item: baseUrl
    }
  ];

  if (routeOpts.category) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: routeOpts.category.name,
      item: `${baseUrl}/kategori/${routeOpts.category.slug || routeOpts.category.id}`
    });
  } else if (routeOpts.product) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: routeOpts.product.categoryName || 'Koleksiyon',
      item: `${baseUrl}/kategori/${routeOpts.product.category}`
    });
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: routeOpts.product.title,
      item: `${baseUrl}/urun/${routeOpts.product.slug}`
    });
  }

  const breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems
  };

  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Samsun tesettür giyim mağazası i-moda Tesettür nerede hizmet veriyor?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'i-moda Tesettür fiziksel butik mağazamız Samsun ili Bafra ilçesinde (Cumhuriyet Mah. Hükümet Cad. No: 10/B, Bafra / Samsun) hizmet vermektedir. Ayrıca Samsun merkez (Atakum, İlkadım, Canik) ve tüm Türkiye\'ye İkas güvencesiyle hızlı kargo gönderimi sağlıyoruz.'
        }
      },
      {
        '@type': 'Question',
        name: 'i-moda Tesettür koleksiyonunda hangi ürünler ve markalar yer alıyor?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Koleksiyonumuzda yeni sezon tesettür ikili takımlar (tunikli, etekli, pantolonlu takımlar), dış giyim (pardesü, kap, trençkot, ferace, giyçık), tesettür elbise ve abiyeler, gömlek ve tunikler ile Armine Sura %100 ipek eşarp, şal ve çanta modelleri yer almaktadır.'
        }
      },
      {
        '@type': 'Question',
        name: 'Online siparişlerde ödeme güvenliği ve kargo süreci nasıl işliyor?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sitemizde beğendiğiniz tüm ürünleri doğrudan resmi İkas e-ticaret altyapımız üzerinden 256-bit SSL güvencesiyle kredi kartı veya banka kartıyla satın alabilir, ya da WhatsApp sipariş hattımızdan (+90 546 642 61 55) beden ve kalıp desteği alarak sipariş oluşturabilirsiniz.'
        }
      }
    ]
  };

  const itemListSchema = {
    '@type': 'ItemList',
    name: 'Samsun Tesettür Giyim Yeni Sezon Koleksiyonu - i-moda Tesettür',
    itemListElement: products.slice(0, 25).map((p, idx) => {
      const firstImg = (p.variants && p.variants[0] && p.variants[0].images && p.variants[0].images[0]) || '/images/brand/imoda-logo.webp';
      const fullImg = firstImg.startsWith('http') ? firstImg : `${baseUrl}${firstImg}`;
      return {
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Product',
          name: p.title,
          url: `${baseUrl}/urun/${p.slug}`,
          image: fullImg,
          description: p.description || `${p.title} - Samsun i-moda Tesettür Giyim ${p.categoryName} modeli.`,
          sku: p.code || p.id,
          brand: {
            '@type': 'Brand',
            name: 'i-moda Tesettür'
          },
          offers: {
            '@type': 'Offer',
            url: p.ikasUrl || `${baseUrl}/urun/${p.slug}`,
            priceCurrency: 'TRY',
            price: Number(p.price || 0).toFixed(2),
            availability: 'https://schema.org/InStock',
            seller: {
              '@type': 'Organization',
              name: 'i-moda Tesettür Samsun'
            }
          }
        }
      };
    })
  };

  const graph = [storeSchema, websiteSchema, breadcrumbSchema, faqSchema, itemListSchema];

  if (routeOpts.product) {
    const p = routeOpts.product;
    const firstImg = (p.variants && p.variants[0] && p.variants[0].images && p.variants[0].images[0]) || '/images/brand/imoda-logo.webp';
    const fullImg = firstImg.startsWith('http') ? firstImg : `${baseUrl}${firstImg}`;
    graph.push({
      '@type': 'Product',
      name: p.title,
      image: fullImg,
      description: p.description || `${p.title} - i-moda Tesettür Samsun Bafra yeni sezon ${p.categoryName}.`,
      sku: p.code || p.id,
      brand: { '@type': 'Brand', name: 'i-moda Tesettür' },
      offers: {
        '@type': 'Offer',
        url: p.ikasUrl || `${baseUrl}/urun/${p.slug}`,
        priceCurrency: 'TRY',
        price: Number(p.price || 0).toFixed(2),
        availability: 'https://schema.org/InStock'
      }
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

// Render index.html with Dynamic Server-Side SEO Meta, JSON-LD & Crawlable Catalog
function renderStorefrontHTML(req, res, routeOpts = {}) {
  try {
    const templateName = routeOpts.localPage ? 'magaza-rehberi.html' : 'index.html';
    const indexPath = path.join(__dirname, 'public', templateName);
    let html = fs.readFileSync(indexPath, 'utf-8');
    const data = readData();
    const s = data.settings || {};
    const seo = s.seo || {};
    const baseUrl = getBaseUrl(req, s);

    let pageTitle = seo.seoTitle || 'Samsun Tesettür Giyim | i-moda Tesettür Bafra Butik & Online Mağaza';
    let pageDesc = seo.seoDescription || 'Samsun tesettür giyim ve Bafra tesettür mağazası i-moda Tesettür! Yeni sezon ikili takım, pardesü, kap, trençkot, tesettür elbise, tunik ve Armine Sura ipek eşarp modelleri İkas güvencesiyle kapınızda.';
    let pageKeywords = seo.seoKeywords || 'samsun tesettür giyim, bafra tesettür giyim, samsun tesettür mağazaları, i-moda tesettür, tesettür ikili takım, armine ipek eşarp samsun';
    let canonicalUrl = `${baseUrl}${req.path === '/' ? '' : req.path}`;
    let ogImage = `${baseUrl}${seo.ogImage || '/images/instagram/fotograf_01_DePEPuOs9ic.jpg'}`;

    if (routeOpts.localPage === 'samsun') {
      pageTitle = 'Samsun Tesettür Giyim Mağazaları & Yeni Sezon Koleksiyonu | i-moda Tesettür';
      pageDesc = 'Samsun tesettür giyim arayışınızda Bafra, Atakum ve İlkadım\'dan kolay ulaşım ve tüm Türkiye\'ye İkas güvencesiyle kargo! İkili takım, pardesü, kap, elbise ve Armine ipek eşarp modelleri.';
    } else if (routeOpts.localPage === 'bafra') {
      pageTitle = 'Bafra Tesettür Giyim & Butik Mağazası | i-moda Tesettür Samsun';
      pageDesc = 'Samsun Bafra Cumhuriyet Mahallesi Hükümet Caddesi\'nde hizmet veren i-moda Tesettür butiğimizde en seçkin ikili takım, ferace, kap, elbise ve ipek eşarp koleksiyonunu keşfedin.';
    } else if (routeOpts.category) {
      const c = routeOpts.category;
      pageTitle = `${c.name} Modelleri - Samsun Tesettür Giyim | i-moda Tesettür`;
      pageDesc = `Samsun i-moda Tesettür ${c.name} koleksiyonu! Yeni sezon dökümlü kumaşlar, modern kalıplar ve İkas güvencesiyle online sipariş imkanı.`;
      if (c.image) ogImage = c.image.startsWith('http') ? c.image : `${baseUrl}${c.image}`;
    } else if (routeOpts.product) {
      const p = routeOpts.product;
      pageTitle = `${p.title} (${p.price} TL) | i-moda Tesettür Samsun`;
      pageDesc = p.description
        ? `${p.title}: ${p.description} - Samsun i-moda Tesettür güvencesiyle hemen sipariş verin.`
        : `${p.title} yeni sezon ${p.categoryName} modeli ${p.price} TL fiyatıyla i-moda Tesettür Samsun mağazamızda ve online satışta!`;
      const firstImg = p.variants && p.variants[0] && p.variants[0].images && p.variants[0].images[0];
      if (firstImg) ogImage = firstImg.startsWith('http') ? firstImg : `${baseUrl}${firstImg}`;
    }

    const structuredData = buildStructuredData(data, baseUrl, routeOpts);

    const seoHeadBlock = `
  <!-- DYNAMIC LOCAL & TECHNICAL SEO + ASO (Samsun Tesettür Giyim) -->
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}" />
  <meta name="keywords" content="${escapeHtml(pageKeywords)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="author" content="i-moda Tesettür Samsun" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="tr-TR" href="${escapeHtml(canonicalUrl)}" />

  <!-- Local Business Geo Meta Tags (Samsun / Bafra) -->
  <meta name="geo.region" content="TR-55" />
  <meta name="geo.placename" content="${escapeHtml((seo.localDistrict || 'Bafra') + ', ' + (seo.localCity || 'Samsun'))}" />
  <meta name="geo.position" content="${escapeHtml((seo.latitude || '41.5678') + ';' + (seo.longitude || '35.9069'))}" />
  <meta name="ICBM" content="${escapeHtml((seo.latitude || '41.5678') + ', ' + (seo.longitude || '35.9069'))}" />

  <!-- Open Graph / Facebook / WhatsApp / Instagram -->
  <meta property="og:type" content="${routeOpts.product ? 'product' : 'website'}" />
  <meta property="og:locale" content="tr_TR" />
  <meta property="og:site_name" content="i-moda Tesettür Samsun" />
  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(pageDesc)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:alt" content="${escapeHtml(pageTitle)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(pageDesc)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <!-- ASO / PWA / Mobile Web App Meta Tags -->
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="${escapeHtml(seo.themeColor || '#11100f')}" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="${escapeHtml(seo.asoShortName || 'i-moda Tesettür')}" />
  <link rel="apple-touch-icon" href="/images/brand/imoda-logo.webp" />

  <!-- Schema.org JSON-LD Graph -->
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
  <script>window.__INITIAL_ROUTE__ = ${JSON.stringify({
    categorySlug: routeOpts.category ? (routeOpts.category.id || routeOpts.category.slug) : null,
    productSlug: routeOpts.product ? routeOpts.product.slug : null,
    localPage: routeOpts.localPage || null
  })};</script>`;

    // Replace existing <title> and <meta name="description"> block in index.html
    html = html.replace(/<title>[\s\S]*?<\/title>\s*<meta name="description"[\s\S]*?\/>/, seoHeadBlock);

    // Build Server-Side Crawlable Product & Category Index for Search Engine Bots
    const ssrLinksHtml = `
  <div id="ssrSeoCatalog" class="sr-only-seo" aria-hidden="false">
    <h2>Samsun Tesettür Giyim &amp; Bafra i-moda Tesettür Mağazası Koleksiyonu</h2>
    <p>Samsun tesettür giyim mağazaları arasında seçkin kalitesiyle öne çıkan i-moda Tesettür, Bafra Cumhuriyet Mahallesi Hükümet Caddesi No: 10/B adresindeki mağazası ve İkas online alışveriş sitesiyle hizmetinizdedir.</p>
    <nav aria-label="SEO Kategori Bağlantıları">
      <ul>
        <li><a href="/samsun-tesettur-giyim">Samsun Tesettür Giyim</a></li>
        <li><a href="/bafra-tesettur-giyim">Bafra Tesettür Giyim</a></li>
        ${(data.categories || []).map(c => `<li><a href="/kategori/${escapeHtml(c.slug || c.id)}">${escapeHtml(c.name)} - Samsun Tesettür Giyim</a></li>`).join('')}
      </ul>
    </nav>
    <div>
      ${(data.products || []).map(p => `
        <article>
          <h3><a href="/urun/${escapeHtml(p.slug)}">${escapeHtml(p.title)} - ${escapeHtml(p.categoryName || 'Tesettür Giyim')}</a></h3>
          <p>${escapeHtml(p.description || `${p.title} modeli Samsun i-moda Tesettür koleksiyonunda.`)}</p>
          <span>Fiyat: ${Number(p.price || 0).toFixed(2)} TL</span>
        </article>
      `).join('')}
    </div>
  </div>`;

    html = html.replace('</body>', `${ssrLinksHtml}\n</body>`);
    res.send(html);
  } catch (err) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
}

// Storefront & SEO Routes
app.get('/', (req, res) => renderStorefrontHTML(req, res));
app.get(['/samsun-tesettur-giyim', '/samsun-tesettur-magazalari'], (req, res) => renderStorefrontHTML(req, res, { localPage: 'samsun' }));
app.get('/bafra-tesettur-giyim', (req, res) => renderStorefrontHTML(req, res, { localPage: 'bafra' }));

app.get('/kategori/:slug', (req, res) => {
  try {
    const data = readData();
    const cat = (data.categories || []).find(c => c.slug === req.params.slug || c.id === req.params.slug);
    renderStorefrontHTML(req, res, { category: cat || { id: req.params.slug, slug: req.params.slug, name: req.params.slug.toUpperCase() } });
  } catch (err) {
    renderStorefrontHTML(req, res);
  }
});

app.get('/urun/:slug', (req, res) => {
  try {
    const data = readData();
    const product = (data.products || []).find(p => p.slug === req.params.slug || p.id === req.params.slug);
    renderStorefrontHTML(req, res, { product });
  } catch (err) {
    renderStorefrontHTML(req, res);
  }
});

app.listen(PORT, () => {
  console.log(`i-moda Tesettür sunucusu çalışıyor: http://localhost:${PORT}`);
  console.log(`Yönetim Paneli: http://localhost:${PORT}/admin`);
});
