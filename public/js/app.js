(function () {
  const splashStartTime = performance.now();
  let splashDismissed = false;
  if (document.body) {
    document.body.classList.add('is-loading');
  }

  function dismissSplash() {
    if (splashDismissed) return;
    splashDismissed = true;
    const loader = document.getElementById('siteSplashLoader');
    if (loader) {
      loader.classList.add('loaded');
    }
    if (document.body) {
      document.body.classList.remove('is-loading');
    }
  }

  // Safety fallback to prevent staying on splash if network delays
  setTimeout(dismissSplash, 2400);

  let catalog = { settings: {}, categories: [], products: [] };
  let activeCategory = 'all';
  let activeSize = '';
  let searchQuery = '';

  // Active variant state per product card so color selection persists on cards
  const cardVariantState = {};

  function formatPrice(num) {
    if (!num && num !== 0) return '';
    return Number(num).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' TL';
  }

  async function loadCatalog() {
    const minSplashDuration = 850; // 850ms zarif logo gösterim süresi
    try {
      const [catRes] = await Promise.all([
        fetch('/api/catalog'),
        renderInstagramFeed()
      ]);
      catalog = await catRes.json();
      applySettings();
      renderNavbarMenu();
      renderHeroShowcase();
      renderDualBanners();
      renderDynamicCategoryNavs();
      renderFeaturedCategories();
      renderNewProducts();
      renderCollectionProducts();

      // Handle server-injected SEO routes (/kategori/:slug, /urun/:slug)
      if (window.__INITIAL_ROUTE__) {
        const route = window.__INITIAL_ROUTE__;
        if (route.categorySlug) {
          setCategoryFilter(route.categorySlug, true);
        } else if (route.productSlug) {
          setTimeout(() => openProductModal(route.productSlug), 150);
        }
      }
    } catch (err) {
      console.error('Katalog yüklenemedi:', err);
    } finally {
      const elapsed = performance.now() - splashStartTime;
      const remaining = Math.max(0, minSplashDuration - elapsed);
      setTimeout(dismissSplash, remaining);
    }
  }

  function renderNavbarMenu() {
    const mainNav = document.getElementById('mainNav');
    const mobileList = document.querySelector('#mobileDrawer .mobile-nav-list');
    const s = catalog.settings || {};
    const navMenu = Array.isArray(s.navMenu) && s.navMenu.length > 0 ? s.navMenu : null;
    if (!navMenu) return;

    // 1. Desktop Mega-Menu
    if (mainNav) {
      const allActive = activeCategory === 'all' ? 'active' : '';
      let html = `<button type="button" class="nav-link ${allActive}" data-filter-cat="all">TÜM ÜRÜNLER</button>`;

      navMenu.forEach(group => {
        const feat = group.featureCard || {};
        const cols = Array.isArray(group.columns) ? group.columns : [];
        const isCompact = cols.length <= 2 ? 'dropdown-inner-compact' : '';
        const isGroupActive = (activeCategory === 'group-' + group.id || activeCategory === group.id) ? 'active' : '';

        html += `
          <div class="nav-item has-dropdown">
            <button type="button" class="nav-link nav-dropdown-btn ${isGroupActive}" data-filter-group="${group.id}">
              <span>${group.title}</span>
              <svg class="dropdown-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            <div class="nav-dropdown">
              <div class="dropdown-inner ${isCompact}">
                ${cols.map(col => `
                  <div class="dropdown-col">
                    <div class="dropdown-header">${col.header}</div>
                    ${(col.links || []).map(l => `
                      <a href="#koleksiyon" class="dropdown-link" data-filter-cat="${l.category || 'all'}" data-search-kw="${l.kw || ''}">
                        ${l.label}
                      </a>
                    `).join('')}
                  </div>
                `).join('')}
                <div class="dropdown-feature-col">
                  <div class="dropdown-feature-card sheen-wrap" data-filter-group="${group.id}">
                    <img src="${feat.image || '/images/brand/imoda-logo.webp'}" alt="${group.title}" />
                    <div class="dropdown-feature-label">
                      <span>${feat.tag || group.title}</span>
                      <strong>${feat.cta || 'Tümünü Keşfet →'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      });

      mainNav.innerHTML = html;
    }

    // 2. Mobile Drawer Accordions
    if (mobileList) {
      const allActive = activeCategory === 'all' ? 'active' : '';
      let mHtml = `<button type="button" class="mobile-nav-link ${allActive}" data-filter-cat="all">TÜM ÜRÜNLER</button>`;

      navMenu.forEach(group => {
        const cols = Array.isArray(group.columns) ? group.columns : [];
        const allLinks = cols.flatMap(c => c.links || []);

        mHtml += `
          <div class="mobile-acc-item">
            <button type="button" class="mobile-acc-trigger">
              <span>${group.title}</span>
              <svg class="acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            <div class="mobile-acc-content">
              <button type="button" class="mobile-sublink" data-filter-group="${group.id}">● Tüm ${group.title} Koleksiyonu</button>
              ${allLinks.map(l => `
                <button type="button" class="mobile-sublink" data-filter-cat="${l.category || 'all'}" data-search-kw="${l.kw || ''}">
                  ${l.label}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      });

      mHtml += `<a href="/admin" class="mobile-nav-link" style="color:var(--parla-gold-dark); margin-top:16px;">⚙️ Yönetim Paneli</a>`;
      mobileList.innerHTML = mHtml;
    }

    bindCategoryFilterLinks();
  }

  function renderHeroShowcase() {
    const col = document.getElementById('heroVisualCol');
    if (!col) return;
    const s = catalog.settings || {};
    let cards = [];

    if (Array.isArray(s.heroImages) && s.heroImages.length > 0) {
      cards = s.heroImages.filter(h => h && h.image);
    }

    // Dynamic fallback: If no hero images in settings, take from the top active products
    if (cards.length === 0) {
      const activeProductsWithImg = (catalog.products || []).filter(p => {
        const v = (p.variants || [])[0];
        return v && v.images && v.images.length > 0;
      });
      cards = activeProductsWithImg.slice(0, 3).map(p => ({
        image: p.variants[0].images[0],
        title: p.title,
        slug: p.slug
      }));
    }

    if (cards.length === 0) {
      col.innerHTML = '';
      return;
    }

    col.innerHTML = cards.map(c => `
      <div class="hero-img-card sheen-wrap" data-open-slug="${c.slug || ''}" style="cursor:pointer" title="${c.title || 'Vitrin Ürünü'}">
        <img src="${c.image}" alt="${c.title || 'Vitrin Ürünü'}" loading="eager" />
      </div>
    `).join('');

    col.querySelectorAll('[data-open-slug]').forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.getAttribute('data-open-slug');
        if (slug) openProductModal(slug);
      });
    });
  }

  function renderDualBanners() {
    const grid = document.getElementById('dualBannerGrid');
    if (!grid) return;
    const s = catalog.settings || {};
    const banners = (Array.isArray(s.dualBanners) && s.dualBanners.length > 0)
      ? s.dualBanners
      : [
          { title: 'İkili & Etekli Takımlar', image: '/images/instagram/fotograf_07_DbxpzUdjB00.jpg', category: 'takimlar' },
          { title: 'Pardesü, Kap & Giyçık', image: '/images/instagram/fotograf_05_DdEEHfeu29L.jpg', category: 'pardesu' }
        ];

    grid.innerHTML = banners.map(b => `
      <div class="dual-banner-item sheen-wrap" data-filter-cat="${b.category || 'all'}">
        <img src="${b.image}" alt="${b.title}" loading="lazy" />
        <div class="dual-banner-overlay">
          <div class="dual-banner-title">${b.title}</div>
          <span class="dual-banner-link">Koleksiyonu Gör</span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-filter-cat]').forEach(item => {
      item.addEventListener('click', () => {
        const cat = item.getAttribute('data-filter-cat');
        filterCategory(cat);
        const section = document.getElementById('koleksiyon');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  async function renderInstagramFeed() {
    const grid = document.getElementById('instagramGrid');
    if (!grid) return;
    try {
      const res = await fetch('/api/instagram');
      const posts = await res.json();
      if (!Array.isArray(posts) || posts.length === 0) {
        return;
      }
      grid.innerHTML = posts.slice(0, 6).map(p => `
        <div class="instagram-item sheen-wrap" onclick="window.open('${p.postUrl}', '_blank')" title="${p.title || 'Instagram Paylaşımı'}">
          <img src="${p.localUrl}" alt="${p.title || 'Instagram Paylaşımı'}" loading="lazy" />
          <div class="instagram-overlay">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
            <span>Instagram'da Gör ↗</span>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.warn('Instagram feed yüklenemedi:', e);
    }
  }

  function applySettings() {
    const s = catalog.settings || {};
    if (s.announcement) {
      const el = document.getElementById('announcementText');
      if (el) el.textContent = s.announcement;
    }
    if (s.brandName) {
      const t = document.getElementById('headerBrandTitle');
      if (t) t.textContent = s.brandName.toUpperCase();
    }
    if (s.subtitle) {
      const sub = document.getElementById('headerBrandSub');
      if (sub) sub.textContent = s.subtitle;
    }
    if (s.instagram) {
      const topInsta = document.getElementById('topInstagramLink');
      if (topInsta) {
        topInsta.href = s.instagram;
        if (s.instagramHandle) topInsta.textContent = s.instagramHandle;
      }
      const headInsta = document.getElementById('headerInstagramAction');
      if (headInsta) headInsta.href = s.instagram;
      const footInsta = document.getElementById('footerInstagramLink');
      if (footInsta) footInsta.href = s.instagram;
    }
    if (s.whatsapp || s.phone) {
      const num = s.whatsapp || s.phone.replace(/[^0-9]/g, '');
      const topPhone = document.getElementById('topPhoneLink');
      if (topPhone) {
        topPhone.href = `https://wa.me/${num}`;
        topPhone.textContent = s.phone || `+${num}`;
      }
      const headWa = document.getElementById('headerWhatsappAction');
      if (headWa) headWa.href = `https://wa.me/${num}`;
      const footWa = document.getElementById('footerWhatsappLink');
      if (footWa) footWa.href = `https://wa.me/${num}`;
      const footPhone = document.getElementById('footerPhoneLink');
      if (footPhone) {
        footPhone.href = `tel:${s.phone || '+' + num}`;
        footPhone.textContent = `📞 ${s.phone || '+' + num}`;
      }
    }
    if (s.ikasStoreUrl) {
      const footIkas = document.getElementById('footerIkasLink');
      if (footIkas) footIkas.href = s.ikasStoreUrl;
      const heroIkas = document.getElementById('heroIkasDirectBtn');
      if (heroIkas) heroIkas.href = s.ikasStoreUrl;
    }
    if (s.address) {
      const addr = document.getElementById('footerAddressText');
      if (addr) addr.textContent = `📍 ${s.address}`;
    }
  }

  // Populate Collection Filter Tabs and Footer from catalog.categories
  function renderDynamicCategoryNavs() {
    const cats = catalog.categories || [];

    // 1. Collection Tabs
    const collectionTabs = document.getElementById('collectionTabs');
    if (collectionTabs) {
      const allBtn = `<button type="button" class="filter-tab ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">Tümü</button>`;
      const catTabs = cats.map(c => {
        const cid = c.id || c.slug;
        const isActive = activeCategory === cid;
        return `<button type="button" class="filter-tab ${isActive ? 'active' : ''}" data-cat="${cid}">${c.name}</button>`;
      }).join('');
      collectionTabs.innerHTML = allBtn + catTabs;
    }

    // 2. Footer Category Links
    const footerCats = document.getElementById('footerCategoryLinks');
    if (footerCats) {
      footerCats.innerHTML = cats.map(c => {
        const cid = c.id || c.slug;
        return `<a href="#koleksiyon" data-filter-cat="${cid}">${c.name}</a>`;
      }).join('');
    }

    bindCategoryFilterLinks();
  }

  function bindCategoryFilterLinks() {
    // Direct category filter links
    document.querySelectorAll('[data-filter-cat]').forEach(el => {
      el.onclick = (e) => {
        e.preventDefault();
        const kw = el.getAttribute('data-search-kw') || '';
        setCategoryFilter(el.getAttribute('data-filter-cat'), true, kw);
      };
    });

    // Group filter links (Giyim, Başörtüsü, Aksesuar)
    document.querySelectorAll('[data-filter-group]').forEach(el => {
      el.onclick = (e) => {
        e.preventDefault();
        const group = el.getAttribute('data-filter-group');
        setCategoryFilter('group-' + group, true);
      };
    });

    // Collection filter tabs
    document.querySelectorAll('#collectionTabs .filter-tab').forEach(tab => {
      tab.onclick = () => {
        setCategoryFilter(tab.getAttribute('data-cat'), false);
      };
    });

    // Mobile drawer accordion triggers
    document.querySelectorAll('.mobile-acc-trigger').forEach(btn => {
      btn.onclick = () => {
        const item = btn.closest('.mobile-acc-item');
        if (item) item.classList.toggle('open');
      };
    });
  }

  function renderFeaturedCategories() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    const featuredCats = (catalog.categories || []).filter(c => c.featured !== false).slice(0, 6);
    grid.innerHTML = featuredCats.map(cat => `
      <div class="category-card" data-cat-card="${cat.id || cat.slug}">
        <div class="category-img-wrap sheen-wrap">
          <img src="${cat.image || '/images/brand/imoda-logo.webp'}" alt="${cat.name}" loading="lazy" />
        </div>
        <div class="category-label">${cat.name}</div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-cat-card]').forEach(card => {
      card.addEventListener('click', () => {
        setCategoryFilter(card.getAttribute('data-cat-card'), true);
      });
    });
  }

  function getIkasProductUrl(product, variant) {
    if (variant && variant.ikasUrl && variant.ikasUrl.trim()) {
      return variant.ikasUrl.trim();
    }
    if (product && product.ikasUrl && product.ikasUrl.trim()) {
      return product.ikasUrl.trim();
    }
    const base = (catalog.settings && catalog.settings.ikasStoreUrl)
      ? catalog.settings.ikasStoreUrl.replace(/\/+$/, '')
      : 'https://imodatesettur.com';
    return `${base}/${product.slug || product.id}`;
  }

  function createProductCardHTML(product, sectionPrefix) {
    const variants = product.variants && product.variants.length > 0
      ? product.variants
      : [{ id: 'default', colorName: 'Standart', colorHex: '#1a1816', images: [], sizes: [], ikasUrl: product.ikasUrl }];

    const stateKey = `${sectionPrefix}-${product.id}`;
    const activeVarIdx = cardVariantState[stateKey] || 0;
    const activeVariant = variants[activeVarIdx] || variants[0];

    const primaryImg = (activeVariant.images && activeVariant.images[0]) || '/images/brand/imoda-logo.webp';
    const hoverImg = (activeVariant.images && activeVariant.images[1]) || primaryImg;
    const targetIkasUrl = getIkasProductUrl(product, activeVariant);

    const hasColors = product.hasColors !== false;
    const hasSizes = product.hasSizes !== false;

    let sizesHTML = '';
    if (hasSizes) {
      sizesHTML = (activeVariant.sizes || [])
        .map(s => `<span class="${s.inStock ? '' : 'out'}">${s.size}</span>`)
        .join(' · ');
    }

    let colorDotsHTML = '';
    if (hasColors && variants.length > 1) {
      colorDotsHTML = variants.map((v, idx) => `
        <button
          type="button"
          class="color-dot ${idx === activeVarIdx ? 'active' : ''}"
          style="background-color: ${v.colorHex || '#1a1816'};"
          title="${v.colorName || 'Renk'}"
          data-card-color-idx="${idx}"
          data-state-key="${stateKey}"
          data-product-id="${product.id}"
          aria-label="${v.colorName || 'Renk'}"
        ></button>
      `).join('');
    }

    return `
      <article class="product-card" data-card-key="${stateKey}" data-product-id="${product.id}">
        <div class="product-media sheen-wrap" data-open-product="${product.id}" data-primary-img="${primaryImg}" data-hover-img="${hoverImg}">
          <img src="${primaryImg}" alt="${product.title}${hasColors && activeVariant.colorName ? ' - ' + activeVariant.colorName : ''} | Samsun Tesettür Giyim i-moda" loading="lazy" />
          ${product.isNew ? '<span class="product-subtle-tag">Yeni</span>' : ''}
        </div>

        <div class="product-info">
          ${colorDotsHTML ? `<div class="product-colors-bar">${colorDotsHTML}</div>` : ''}

          <h3 class="product-title" data-open-product="${product.id}">${product.title}</h3>

          ${sizesHTML ? `<div class="product-sizes-bar">${sizesHTML}</div>` : ''}

          <div class="product-bottom-row">
            <div class="product-price-wrap">
              <span class="product-price">${formatPrice(product.price)}</span>
              ${product.oldPrice ? `<span class="product-old-price">${formatPrice(product.oldPrice)}</span>` : ''}
            </div>
            <a href="${targetIkasUrl}" target="_blank" rel="noopener noreferrer" class="product-ikas-link" title="İkas Mağazasında Satın Al">
              <span>İkas'ta Satın Al</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M7 17L17 7M7 7h10v10"/>
              </svg>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  function attachCardInteractions(container, sectionPrefix) {
    if (!container) return;

    // Hover image swap when a variant has 2+ photos
    container.querySelectorAll('.product-media').forEach(media => {
      const img = media.querySelector('img');
      const primary = media.getAttribute('data-primary-img');
      const hover = media.getAttribute('data-hover-img');
      if (primary && hover && primary !== hover) {
        media.addEventListener('mouseenter', () => { img.src = hover; });
        media.addEventListener('mouseleave', () => { img.src = primary; });
      }
    });

    // Open modal on image or title click
    container.querySelectorAll('[data-open-product]').forEach(el => {
      el.addEventListener('click', () => {
        const pid = el.getAttribute('data-open-product');
        const card = el.closest('.product-card');
        const stateKey = card ? card.getAttribute('data-card-key') : null;
        const initialVarIdx = stateKey && cardVariantState[stateKey] ? cardVariantState[stateKey] : 0;
        openProductModal(pid, initialVarIdx);
      });
    });

    // Interactive color dot click
    container.querySelectorAll('[data-card-color-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-card-color-idx'));
        const stateKey = btn.getAttribute('data-state-key');
        const pid = btn.getAttribute('data-product-id');
        cardVariantState[stateKey] = idx;

        const product = (catalog.products || []).find(p => p.id === pid);
        const cardEl = btn.closest('.product-card');
        if (product && cardEl) {
          const temp = document.createElement('div');
          temp.innerHTML = createProductCardHTML(product, sectionPrefix).trim();
          const newCard = temp.firstElementChild;
          cardEl.replaceWith(newCard);
          attachCardInteractions(container, sectionPrefix);
        }
      });
    });
  }

  function renderNewProducts() {
    const grid = document.getElementById('newProductsGrid');
    if (!grid) return;
    const newItems = (catalog.products || []).filter(p => p.isNew).slice(0, 4);
    grid.innerHTML = newItems.map(p => createProductCardHTML(p, 'new')).join('');
    attachCardInteractions(grid, 'new');
  }

  function renderCollectionProducts() {
    const grid = document.getElementById('allProductsGrid');
    const countEl = document.getElementById('productCountText');
    const headingEl = document.getElementById('collectionHeading');
    if (!grid) return;

    let list = catalog.products || [];

    // Filter by category or group
    if (activeCategory !== 'all') {
      if (activeCategory === 'group-giyim' || activeCategory === 'giyim') {
        const giyimCats = ['takimlar', 'pardesu', 'elbise', 'tunik', 'pantolon', 'ceket'];
        list = list.filter(p => giyimCats.includes(p.category) || giyimCats.some(c => (p.categoryName || '').toLowerCase().includes(c)));
        if (headingEl) headingEl.textContent = 'Giyim Koleksiyonu';
      } else if (activeCategory === 'group-basortusu' || activeCategory === 'basortusu') {
        const basortuCats = ['esarp', 'ipek-esarp', 'sal', 'ozel-seri-esarp', 'guz-esarp'];
        list = list.filter(p => basortuCats.includes(p.category) || (p.title || '').toLowerCase().includes('eşarp') || (p.title || '').toLowerCase().includes('şal'));
        if (headingEl) headingEl.textContent = 'Başörtüsü Koleksiyonu';
      } else if (activeCategory === 'group-aksesuar' || activeCategory === 'aksesuar') {
        const aksCats = ['aksesuar', 'canta'];
        list = list.filter(p => aksCats.includes(p.category) || (p.title || '').toLowerCase().includes('çanta') || (p.title || '').toLowerCase().includes('iğne') || (p.title || '').toLowerCase().includes('broş'));
        if (headingEl) headingEl.textContent = 'Aksesuar Koleksiyonu';
      } else {
        list = list.filter(p => p.category === activeCategory || p.slug === activeCategory);
        const foundCat = (catalog.categories || []).find(c => c.id === activeCategory || c.slug === activeCategory);
        if (headingEl && foundCat) {
          headingEl.textContent = `${foundCat.name} Koleksiyonu`;
        }
      }
    } else {
      if (headingEl) headingEl.textContent = 'Öne Çıkan Koleksiyon';
    }

    // Filter by size
    if (activeSize) {
      list = list.filter(p =>
        (p.variants || []).some(v =>
          (v.sizes || []).some(sz => sz.size === activeSize && sz.inStock)
        )
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
    }

    if (countEl) {
      countEl.textContent = `${list.length} model listeleniyor`;
    }

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: var(--parla-muted);">
          <p style="font-size: 15px; margin-bottom: 8px;">Aradığınız kriterlere uygun ürün bulunamadı.</p>
          <button type="button" class="editorial-link" id="resetFiltersBtn" style="margin: 0 auto; background: none; border: none; cursor: pointer;">
            Tüm Koleksiyonu Göster
          </button>
        </div>
      `;
      const resetBtn = document.getElementById('resetFiltersBtn');
      if (resetBtn) {
        resetBtn.onclick = () => {
          activeCategory = 'all';
          activeSize = '';
          searchQuery = '';
          const sInput = document.getElementById('searchInput');
          if (sInput) sInput.value = '';
          renderDynamicCategoryNavs();
          renderCollectionProducts();
        };
      }
      return;
    }

    grid.innerHTML = list.map(p => createProductCardHTML(p, 'col')).join('');
    attachCardInteractions(grid, 'col');
  }

  function setCategoryFilter(catId, shouldScroll = false, kw = '') {
    activeCategory = catId || 'all';

    if (kw) {
      searchQuery = kw;
      const sInput = document.getElementById('searchInput');
      if (sInput) sInput.value = kw;
    } else {
      searchQuery = '';
      const sInput = document.getElementById('searchInput');
      if (sInput) sInput.value = '';
    }

    // Update Header links
    document.querySelectorAll('#mainNav .nav-link').forEach(btn => {
      const bCat = btn.getAttribute('data-filter-cat');
      const bGroup = btn.getAttribute('data-filter-group');
      let isActive = false;
      if (activeCategory === 'all' && bCat === 'all') {
        isActive = true;
      } else if (bGroup && (activeCategory === 'group-' + bGroup || activeCategory === bGroup)) {
        isActive = true;
      } else if (bCat && bCat === activeCategory) {
        isActive = true;
      }
      btn.classList.toggle('active', isActive);
    });

    // Update Drawer links
    document.querySelectorAll('#mobileDrawer .mobile-nav-link').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter-cat') === activeCategory);
    });

    // Update collection filter tabs
    document.querySelectorAll('#collectionTabs .filter-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-cat') === activeCategory);
    });

    // Close mobile drawer if open
    const drawer = document.getElementById('mobileDrawer');
    if (drawer && drawer.classList.contains('open')) {
      drawer.classList.remove('open');
    }

    renderCollectionProducts();

    if (shouldScroll) {
      const el = document.getElementById('koleksiyon');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  // PRODUCT DETAIL MODAL LOGIC
  function openProductModal(productIdOrSlug, initialVariantIdx = 0) {
    const product = (catalog.products || []).find(p => p.id === productIdOrSlug || p.slug === productIdOrSlug);
    if (!product) return;

    const modalBackdrop = document.getElementById('productModalBackdrop');
    const modalBody = document.getElementById('modalBody');
    if (!modalBackdrop || !modalBody) return;

    const hasColors = product.hasColors !== false;
    const hasSizes = product.hasSizes !== false;
    const hasFabricInfo = product.hasFabricInfo !== false && Boolean(product.fabricInfo);
    const hasDescription = product.hasDescription !== false && Boolean(product.description);

    const variants = product.variants && product.variants.length > 0
      ? product.variants
      : [{ id: 'default', colorName: '', colorHex: '#141210', images: [], sizes: [], ikasUrl: product.ikasUrl }];

    let selectedVarIdx = initialVariantIdx < variants.length ? initialVariantIdx : 0;
    let selectedImgIdx = 0;
    let selectedSize = '';

    function syncDefaultSize() {
      if (!hasSizes) {
        selectedSize = '';
        return;
      }
      const v = variants[selectedVarIdx];
      const firstAvail = (v.sizes || []).find(s => s.inStock);
      selectedSize = firstAvail ? firstAvail.size : ((v.sizes && v.sizes[0] && v.sizes[0].size) || 'Standart');
    }
    syncDefaultSize();

    function renderModalInner() {
      const v = variants[selectedVarIdx];
      const images = v.images && v.images.length > 0 ? v.images : ['/images/brand/imoda-logo.webp'];
      const currentImg = images[selectedImgIdx] || images[0];
      const ikasTarget = getIkasProductUrl(product, v);

      // Build personalized WhatsApp message
      const detailsList = [];
      if (hasColors && v.colorName) detailsList.push(`Renk: ${v.colorName}`);
      if (hasSizes && selectedSize) detailsList.push(`Beden: ${selectedSize}`);
      if (product.code) detailsList.push(`Kod: ${product.code}`);
      const detailsStr = detailsList.length > 0 ? ` (${detailsList.join(', ')})` : '';
      const whatsappText = encodeURIComponent(
        `Merhaba i-moda Tesettür, "${product.title}"${detailsStr} ürünü hakkında bilgi almak ve sipariş vermek istiyorum.`
      );

      const phoneNum = (catalog.settings && (catalog.settings.whatsapp || catalog.settings.phone))
        ? String(catalog.settings.whatsapp || catalog.settings.phone).replace(/[^0-9]/g, '')
        : '905466426155';

      modalBody.innerHTML = `
        <div class="modal-gallery">
          <div class="modal-main-img">
            <img src="${currentImg}" alt="${product.title}${hasColors && v.colorName ? ' - ' + v.colorName : ''}" />
          </div>
          ${images.length > 1 ? `
            <div class="modal-thumbs">
              ${images.map((imgUrl, idx) => `
                <div class="modal-thumb ${idx === selectedImgIdx ? 'active' : ''}" data-thumb-idx="${idx}">
                  <img src="${imgUrl}" alt="Görsel ${idx + 1}" />
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <div class="modal-details">
          <div>
            <div class="modal-code">${product.categoryName || 'Koleksiyon'} · ${product.code || ''}</div>
            <h2 class="modal-title">${product.title}</h2>
          </div>

          <div class="modal-price-row">
            <span class="modal-price">${formatPrice(product.price)}</span>
            ${product.oldPrice ? `<span class="modal-old-price">${formatPrice(product.oldPrice)}</span>` : ''}
          </div>

          <!-- Color Variant Selector -->
          ${hasColors && variants.length > 1 ? `
            <div class="variant-group">
              <div class="variant-label">Renk Seçenekleri: <strong>${v.colorName || 'Standart'}</strong></div>
              <div class="modal-color-list">
                ${variants.map((varItem, idx) => `
                  <button type="button" class="modal-color-option ${idx === selectedVarIdx ? 'active' : ''}" data-modal-var="${idx}">
                    <span class="color-dot ${idx === selectedVarIdx ? 'active' : ''}" style="background-color: ${varItem.colorHex || '#141210'};"></span>
                    <span>${varItem.colorName || 'Renk ' + (idx + 1)}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Size Selector -->
          ${hasSizes && (v.sizes || []).length > 0 ? `
            <div class="variant-group">
              <div class="variant-label">Beden Seçimi: <strong>${selectedSize || 'Lütfen Seçiniz'}</strong></div>
              <div class="modal-size-list">
                ${(v.sizes || []).map(sz => `
                  <button
                    type="button"
                    class="modal-size-item ${sz.size === selectedSize ? 'active' : ''}"
                    data-modal-size="${sz.size}"
                    ${sz.inStock ? '' : 'disabled title="Stokta Yok"'}
                  >
                    ${sz.size}${sz.inStock ? '' : ' (Tükendi)'}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Description -->
          ${hasDescription ? `<p class="modal-desc">${product.description}</p>` : ''}

          <!-- Fabric Info -->
          ${hasFabricInfo ? `<div class="modal-fabric"><strong>Kumaş &amp; Kalıp:</strong> ${product.fabricInfo}</div>` : ''}

          <!-- Primary Conversion Action: İkas Checkout -->
          <a href="${ikasTarget}" target="_blank" rel="noopener noreferrer" class="ikas-primary-cta">
            <span>İkas'ta Satın Al</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 17L17 7M7 7h10v10"/>
            </svg>
          </a>

          <!-- Secondary Conversion Action: WhatsApp -->
          <a href="https://wa.me/${phoneNum}?text=${whatsappText}" target="_blank" rel="noopener noreferrer" class="whatsapp-secondary-cta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            <span>WhatsApp ile Sipariş &amp; Danışma</span>
          </a>

          <div class="modal-secondary-links">
            <span style="font-size:11.5px; color:var(--parla-muted);">Güvenli Ödeme &amp; Hızlı Teslimat</span>
            ${product.instagramPostUrl ? `
              <a href="${product.instagramPostUrl}" target="_blank" rel="noopener noreferrer">
                Instagram'da İncele ↗
              </a>
            ` : ''}
          </div>
        </div>
      `;

      // Bind thumbnail clicks
      modalBody.querySelectorAll('[data-thumb-idx]').forEach(t => {
        t.addEventListener('click', () => {
          selectedImgIdx = Number(t.getAttribute('data-thumb-idx'));
          renderModalInner();
        });
      });

      // Bind color variant clicks
      modalBody.querySelectorAll('[data-modal-var]').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedVarIdx = Number(btn.getAttribute('data-modal-var'));
          selectedImgIdx = 0;
          syncDefaultSize();
          renderModalInner();
        });
      });

      // Bind size clicks
      modalBody.querySelectorAll('[data-modal-size]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.hasAttribute('disabled')) return;
          selectedSize = btn.getAttribute('data-modal-size');
          modalBody.querySelectorAll('[data-modal-size]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const lbl = modalBody.querySelector('.variant-group strong');
          if (lbl) lbl.textContent = selectedSize;
        });
      });
    }

    renderModalInner();
    modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    document.title = `${product.title} | Samsun Tesettür Giyim - i-moda Tesettür`;
  }

  function closeModal() {
    const modalBackdrop = document.getElementById('productModalBackdrop');
    if (modalBackdrop) modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
    const seoTitle = (catalog.settings && catalog.settings.seo && catalog.settings.seo.seoTitle)
      || 'Samsun Tesettür Giyim | i-moda Tesettür (Bafra & Samsun Tesettür Mağazası)';
    document.title = seoTitle;
  }

  // Global event listeners
  document.addEventListener('DOMContentLoaded', () => {
    loadCatalog();

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const drawer = document.getElementById('mobileDrawer');
    if (mobileBtn && drawer) {
      mobileBtn.addEventListener('click', () => {
        drawer.classList.toggle('open');
      });
    }

    // Modal close buttons & backdrop click
    const closeBtn = document.getElementById('closeModalBtn');
    const backdrop = document.getElementById('productModalBackdrop');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Real-time Search Input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          searchQuery = e.target.value;
          renderCollectionProducts();
        }, 200);
      });
    }

    // Size filter links
    document.querySelectorAll('#sizeFilters .size-filter-link').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#sizeFilters .size-filter-link').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeSize = btn.getAttribute('data-size');
        renderCollectionProducts();
      });
    });

    // Hero cards open modal
    document.querySelectorAll('[data-open-slug]').forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.getAttribute('data-open-slug');
        openProductModal(slug);
      });
    });
  });
})();
