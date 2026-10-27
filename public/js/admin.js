(function () {
  let catalog = { settings: {}, categories: [], products: [] };
  let mediaLibrary = [];
  let editingVariants = [];
  let editingFeatures = {
    hasColors: true,
    hasSizes: true,
    hasFabricInfo: true,
    hasDescription: true
  };

  const STANDARD_SIZES = ['36', '38', '40', '42', '44', '46', '48', 'Standart', 'S', 'M', 'L', 'XL'];

  function showToast(msg) {
    const t = document.getElementById('adminToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
  }

  function formatPrice(num) {
    return Number(num || 0).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' TL';
  }

  async function loadAdminData() {
    try {
      const [catRes, mediaRes] = await Promise.all([
        fetch('/api/catalog'),
        fetch('/api/media')
      ]);
      catalog = await catRes.json();
      const mediaData = await mediaRes.json();
      mediaLibrary = mediaData.images || [];

      renderStats();
      populateCategorySelects();
      renderProductsTable();
      renderCategoriesTable();
      renderNavMenuEditor();
      renderIkasLinksTable();
      renderAdminInstagram();
      renderSettings();
      renderMediaLibrary();
    } catch (err) {
      console.error('Veri yüklenemedi:', err);
      showToast('Veriler yüklenirken hata oluştu.');
    }
  }

  function renderStats() {
    const products = catalog.products || [];
    let totalVariants = 0;
    let totalImages = 0;
    let ikasLinked = 0;

    products.forEach(p => {
      if (p.ikasUrl && (p.ikasUrl.includes('imodatesettur.com') || p.ikasUrl.includes('myikas.com') || p.ikasUrl.startsWith('http'))) {
        ikasLinked++;
      }
      (p.variants || []).forEach(v => {
        totalVariants++;
        totalImages += (v.images || []).length;
      });
    });

    document.getElementById('statTotalProducts').textContent = products.length;
    document.getElementById('statTotalVariants').textContent = totalVariants;
    document.getElementById('statTotalImages').textContent = totalImages;
    document.getElementById('statIkasLinked').textContent = `${ikasLinked} / ${products.length}`;
  }

  function populateCategorySelects() {
    const sel = document.getElementById('editCategory');
    const filterSel = document.getElementById('adminCatFilter');
    const cats = catalog.categories || [];

    if (sel) {
      const currentVal = sel.value;
      sel.innerHTML = cats.map(c => `
        <option value="${c.id || c.slug}">${c.name}</option>
      `).join('');
      if (currentVal && cats.some(c => (c.id || c.slug) === currentVal)) {
        sel.value = currentVal;
      }
    }

    if (filterSel) {
      const cur = filterSel.value;
      filterSel.innerHTML = '<option value="all">Tüm Kategoriler</option>' + cats.map(c => `
        <option value="${c.id || c.slug}">${c.name}</option>
      `).join('');
      filterSel.value = cur || 'all';
    }
  }

  function renderProductsTable() {
    const tbody = document.getElementById('adminProductsTable');
    if (!tbody) return;

    let products = catalog.products || [];
    const searchVal = (document.getElementById('adminProductSearch')?.value || '').toLowerCase().trim();
    const catVal = document.getElementById('adminCatFilter')?.value || 'all';

    if (catVal !== 'all') {
      products = products.filter(p => p.category === catVal || p.slug === catVal);
    }
    if (searchVal) {
      products = products.filter(p =>
        p.title.toLowerCase().includes(searchVal) ||
        (p.code && p.code.toLowerCase().includes(searchVal)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(searchVal))
      );
    }

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 32px; color: var(--parla-muted);">Ürün bulunamadı.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const firstVar = (p.variants && p.variants[0]) || { images: [] };
      const thumb = (firstVar.images && firstVar.images[0]) || '/images/brand/imoda-logo.webp';

      const hasColors = p.hasColors !== false;
      const hasSizes = p.hasSizes !== false;

      let variantMeta = '';
      if (!hasColors && !hasSizes) {
        variantMeta = '<span style="color:var(--parla-muted); font-size:11px;">Tek Model / Standart</span>';
      } else {
        const parts = [];
        if (hasColors) parts.push(`<strong>${(p.variants || []).length}</strong> renk`);
        if (hasSizes) {
          const totalSizes = (p.variants || []).reduce((acc, v) => acc + (v.sizes || []).length, 0);
          parts.push(`<strong>${totalSizes}</strong> beden`);
        }
        variantMeta = parts.join(', ');
      }

      const ikasUrlVal = p.ikasUrl || '';

      return `
        <tr>
          <td>
            <img src="${thumb}" alt="${p.title}" class="table-thumb" />
          </td>
          <td>
            <div style="font-weight: 600; color: var(--parla-black); font-size: 13.5px;">${p.title}</div>
            <div style="font-size: 11.5px; color: var(--parla-muted); margin-top: 3px;">
              <span class="cat-badge">${p.categoryName || p.category}</span>
              <span>Kod: ${p.code || '-'}</span>
            </div>
          </td>
          <td>
            <div style="font-size: 12px;">${variantMeta}</div>
            <div style="font-size: 10.5px; color: var(--parla-muted); margin-top: 2px;">
              ${p.isNew ? '<span style="color:#0d9488; font-weight:600;">● Yeni Sezon</span>' : ''}
            </div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--parla-black);">${formatPrice(p.price)}</div>
            ${p.oldPrice ? `<div style="font-size: 11px; color: var(--parla-muted); text-decoration: line-through;">${formatPrice(p.oldPrice)}</div>` : ''}
          </td>
          <td style="min-width: 250px;">
            <div style="display: flex; gap: 6px;">
              <input type="url" class="form-input" style="font-size: 11.5px; padding: 6px 8px;" id="quickIkas-${p.id}" value="${ikasUrlVal}" placeholder="https://imodatesettur.com/..." />
              <button type="button" class="btn-gold" style="padding: 6px 10px; font-size: 11px;" data-quick-save="${p.id}">Kaydet</button>
            </div>
          </td>
          <td style="white-space: nowrap;">
            <button type="button" class="btn-text" data-edit-product="${p.id}">Düzenle</button>
            <button type="button" class="btn-text danger" data-delete-product="${p.id}">Sil</button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind quick save Ikas URL
    tbody.querySelectorAll('[data-quick-save]').forEach(btn => {
      btn.onclick = async () => {
        const pid = btn.getAttribute('data-quick-save');
        const input = document.getElementById(`quickIkas-${pid}`);
        const newUrl = input ? input.value.trim() : '';

        try {
          const res = await fetch(`/api/products/${pid}/ikas`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ikasUrl: newUrl })
          });
          if (!res.ok) throw new Error('Hata oluştu');
          const updated = await res.json();
          const target = (catalog.products || []).find(p => p.id === pid);
          if (target) target.ikasUrl = updated.ikasUrl;
          renderStats();
          renderIkasLinksTable();
          showToast('İkas bağlantısı güncellendi!');
        } catch (err) {
          alert('İkas linki kaydedilemedi: ' + err.message);
        }
      };
    });

    // Bind Edit product
    tbody.querySelectorAll('[data-edit-product]').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.getAttribute('data-edit-product');
        openProductEditModal(pid);
      };
    });

    // Bind Delete product
    tbody.querySelectorAll('[data-delete-product]').forEach(btn => {
      btn.onclick = async () => {
        const pid = btn.getAttribute('data-delete-product');
        const p = (catalog.products || []).find(item => item.id === pid);
        if (!confirm(`"${p ? p.title : 'Bu ürünü'}" silmek istediğinize emin misiniz?`)) return;

        try {
          const res = await fetch(`/api/products/${pid}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Silinemedi');
          catalog.products = (catalog.products || []).filter(item => item.id !== pid);
          renderStats();
          renderProductsTable();
          renderIkasLinksTable();
          showToast('Ürün başarıyla silindi.');
        } catch (err) {
          alert('Silme hatası: ' + err.message);
        }
      };
    });
  }

  // CATEGORY TABLE
  function renderCategoriesTable() {
    const tbody = document.getElementById('adminCategoriesTable');
    if (!tbody) return;
    const cats = catalog.categories || [];

    if (cats.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px;">Henüz kategori bulunmuyor.</td></tr>`;
      return;
    }

    tbody.innerHTML = cats.map(c => `
      <tr>
        <td>
          <img src="${c.image || '/images/brand/imoda-logo.webp'}" alt="${c.name}" class="table-thumb" style="width: 44px; height: 44px; object-fit: cover;" />
        </td>
        <td style="font-weight: 600;">${c.name}</td>
        <td><code>${c.slug || c.id}</code></td>
        <td style="font-size: 11.5px; color: var(--parla-muted);">
          ${c.defaultHasSizes !== false ? '✓ Beden ' : ''}
          ${c.defaultHasColors !== false ? '✓ Renk ' : ''}
          ${c.defaultHasFabricInfo !== false ? '✓ Kumaş' : ''}
        </td>
        <td>${c.featured !== false ? '✓ Evet' : '—'}</td>
        <td>
          <button type="button" class="btn-text" data-edit-category="${c.id}">Düzenle</button>
          <button type="button" class="btn-text danger" data-delete-category="${c.id}">Sil</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit-category]').forEach(btn => {
      btn.onclick = () => {
        const cid = btn.getAttribute('data-edit-category');
        openCategoryEditModal(cid);
      };
    });

    tbody.querySelectorAll('[data-delete-category]').forEach(btn => {
      btn.onclick = async () => {
        const cid = btn.getAttribute('data-delete-category');
        if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
        try {
          const res = await fetch(`/api/categories/${cid}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Silinemedi');
          catalog.categories = (catalog.categories || []).filter(item => item.id !== cid && item.slug !== cid);
          populateCategorySelects();
          renderCategoriesTable();
          showToast('Kategori silindi.');
        } catch (err) {
          alert('Kategori silinemedi: ' + err.message);
        }
      };
    });
  }

  // IKAS TAB TABLE
  function renderIkasLinksTable() {
    const tbody = document.getElementById('adminIkasLinksTable');
    if (!tbody) return;
    const products = catalog.products || [];
    const baseStoreUrl = (catalog.settings && catalog.settings.ikasStoreUrl) || 'https://imodatesettur.com';

    const domainDisplay = document.getElementById('currentIkasDomain');
    if (domainDisplay) domainDisplay.textContent = baseStoreUrl;
    const storeInput = document.getElementById('ikasStoreUrlInput');
    if (storeInput && !storeInput.value) storeInput.value = baseStoreUrl;

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px;">Ürün bulunmuyor.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const hasLink = Boolean(p.ikasUrl && (p.ikasUrl.startsWith('http') || p.ikasUrl.startsWith('/')));
      const badge = hasLink
        ? '<span class="ikas-badge active">✓ Bağlı</span>'
        : '<span class="ikas-badge">Eksik</span>';

      return `
        <tr>
          <td style="font-weight: 600;">${p.title}</td>
          <td style="font-size: 11.5px; color: var(--parla-muted);">${p.code || '-'} · ${p.categoryName}</td>
          <td style="min-width: 300px;">
            <input type="url" class="form-input" id="ikasTabUrl-${p.id}" value="${p.ikasUrl || ''}" placeholder="${baseStoreUrl}/${p.slug}" style="font-size: 12px; padding: 6px 10px;" />
          </td>
          <td>${badge}</td>
          <td>
            <button type="button" class="btn-gold" style="padding: 6px 12px; font-size: 11.5px;" data-save-ikas-tab="${p.id}">Kaydet</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-save-ikas-tab]').forEach(btn => {
      btn.onclick = async () => {
        const pid = btn.getAttribute('data-save-ikas-tab');
        const input = document.getElementById(`ikasTabUrl-${pid}`);
        const newUrl = input ? input.value.trim() : '';

        try {
          const res = await fetch(`/api/products/${pid}/ikas`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ikasUrl: newUrl })
          });
          if (!res.ok) throw new Error('Hata oluştu');
          const updated = await res.json();
          const target = (catalog.products || []).find(p => p.id === pid);
          if (target) target.ikasUrl = updated.ikasUrl;
          renderStats();
          renderIkasLinksTable();
          renderProductsTable();
          showToast('İkas bağlantısı güncellendi!');
        } catch (err) {
          alert('İkas linki kaydedilemedi: ' + err.message);
        }
      };
    });
  }

  // NAVBAR & DROPDOWN MENU EDITOR
  function renderNavMenuEditor() {
    const container = document.getElementById('navMenuEditorContainer');
    if (!container) return;
    const s = catalog.settings || {};
    const navMenu = Array.isArray(s.navMenu) ? s.navMenu : [];
    const cats = catalog.categories || [];

    if (navMenu.length === 0) {
      container.innerHTML = '<div style="padding: 20px; color: var(--parla-muted);">Menü yapılandırması bulunamadı.</div>';
      return;
    }

    const catSelectOptions = (selected) => {
      return cats.map(c => {
        const cid = c.id || c.slug;
        return `<option value="${cid}" ${cid === selected ? 'selected' : ''}>${c.name}</option>`;
      }).join('');
    };

    container.innerHTML = navMenu.map((group, gIdx) => {
      const feat = group.featureCard || {};
      const cols = Array.isArray(group.columns) ? group.columns : [];

      return `
        <div class="nav-menu-group-card" data-group-index="${gIdx}" style="border: 1px solid var(--parla-border); border-radius: var(--radius-custom); padding: 20px; margin-bottom: 24px; background: #faf9f6;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--parla-border); padding-bottom: 12px; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-weight: 700; font-size: 14.5px; color: var(--parla-black);">${gIdx + 1}. Ana Menü Başlığı:</span>
              <input type="text" class="form-input group-title-input" value="${group.title || ''}" style="width: 160px; font-weight: 700; font-size: 13px; padding: 6px 10px;" />
              <input type="hidden" class="group-id-input" value="${group.id || ('menu-' + gIdx)}" />
            </div>
            <span style="font-size: 11px; color: var(--parla-gold-dark); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">Açılır Mega-Menü</span>
          </div>

          <!-- Feature Card Settings -->
          <div style="background: var(--parla-white); border: 1px solid var(--parla-border); border-radius: 4px; padding: 12px 16px; margin-bottom: 16px;">
            <div style="font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--parla-gold-dark); margin-bottom: 8px;">
              Açılır Menüdeki Tanıtım Görseli &amp; Etiketi
            </div>
            <div style="display: grid; grid-template-columns: 50px 1fr 1fr; gap: 12px; align-items: center;">
              <img src="${feat.image || '/images/brand/imoda-logo.webp'}" class="feature-card-prev" alt="Önizleme" style="width: 48px; height: 58px; object-fit: cover; border-radius: 3px; border: 1px solid var(--parla-border);" />
              <div>
                <label class="field-label" style="font-size: 10.5px;">Görsel URL</label>
                <input type="text" class="form-input feat-img-input" value="${feat.image || ''}" style="font-size: 11.5px; padding: 6px 8px;" placeholder="/images/instagram/..." />
              </div>
              <div>
                <label class="field-label" style="font-size: 10.5px;">Görsel Üzerindeki Yazı / Etiket</label>
                <input type="text" class="form-input feat-tag-input" value="${feat.tag || ''}" style="font-size: 11.5px; padding: 6px 8px;" placeholder="Örn: Yeni Sezon Giyim" />
              </div>
            </div>
          </div>

          <!-- Columns & Sublinks -->
          <div style="margin-bottom: 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;">
            Alt Kategori Sütunları &amp; Linkler
          </div>
          <div class="group-columns-wrap" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            ${cols.map((col, cIdx) => `
              <div class="nav-col-box" data-col-index="${cIdx}" style="background: var(--parla-white); border: 1px solid var(--parla-border); border-radius: 4px; padding: 14px;">
                <div style="margin-bottom: 10px;">
                  <label class="field-label" style="font-size: 10.5px;">Sütun Başlığı</label>
                  <input type="text" class="form-input col-header-input" value="${col.header || ''}" style="font-size: 12px; font-weight: 600; padding: 5px 8px;" />
                </div>
                <div class="col-links-wrap" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;">
                  ${(col.links || []).map((link, lIdx) => `
                    <div class="col-link-row" style="display: flex; gap: 6px; align-items: center;">
                      <input type="text" class="form-input link-label-input" value="${link.label || ''}" style="flex: 2; font-size: 11.5px; padding: 4px 6px;" placeholder="Görünecek İsim" />
                      <select class="form-select link-cat-select" style="flex: 1.5; font-size: 11px; padding: 4px 6px;">
                        ${catSelectOptions(link.category)}
                      </select>
                      <input type="text" class="form-input link-kw-input" value="${link.kw || ''}" style="flex: 1; font-size: 10.5px; padding: 4px 6px;" placeholder="Kelime" title="Arama anahtar kelimesi (opsiyonel)" />
                      <button type="button" class="btn-text danger btn-remove-link" style="padding: 2px 4px; font-size: 12px;" title="Sil">✕</button>
                    </div>
                  `).join('')}
                </div>
                <button type="button" class="btn-text btn-add-sublink" style="font-size: 11.5px; padding: 2px 0;">+ Alt Link Ekle</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Attach dynamic listeners
    container.querySelectorAll('.feat-img-input').forEach(inp => {
      inp.addEventListener('input', () => {
        const prev = inp.closest('.nav-menu-group-card').querySelector('.feature-card-prev');
        if (prev) prev.src = inp.value.trim() || '/images/brand/imoda-logo.webp';
      });
    });

    container.querySelectorAll('.btn-remove-link').forEach(btn => {
      btn.onclick = () => {
        btn.closest('.col-link-row').remove();
      };
    });

    container.querySelectorAll('.btn-add-sublink').forEach(btn => {
      btn.onclick = () => {
        const wrap = btn.closest('.nav-col-box').querySelector('.col-links-wrap');
        const row = document.createElement('div');
        row.className = 'col-link-row';
        row.style.cssText = 'display: flex; gap: 6px; align-items: center;';
        row.innerHTML = `
          <input type="text" class="form-input link-label-input" value="Yeni Alt Kategori" style="flex: 2; font-size: 11.5px; padding: 4px 6px;" />
          <select class="form-select link-cat-select" style="flex: 1.5; font-size: 11px; padding: 4px 6px;">
            ${catSelectOptions('')}
          </select>
          <input type="text" class="form-input link-kw-input" value="" style="flex: 1; font-size: 10.5px; padding: 4px 6px;" placeholder="Kelime" />
          <button type="button" class="btn-text danger btn-remove-link" style="padding: 2px 4px; font-size: 12px;" title="Sil">✕</button>
        `;
        row.querySelector('.btn-remove-link').onclick = () => row.remove();
        wrap.appendChild(row);
      };
    });
  }

  // SETTINGS TAB
  function renderSettings() {
    const s = catalog.settings || {};
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('settingBrandName', s.brandName || 'i-moda Tesettür');
    setVal('settingSubtitle', s.subtitle || 'Samsun · Bafra · Özel Tasarım Koleksiyonu');
    setVal('settingPhone', s.phone || '+90 546 642 61 55');
    setVal('settingWhatsapp', s.whatsapp || '905466426155');
    setVal('settingInstagram', s.instagram || 'https://www.instagram.com/imoda_tesettur/');
    setVal('settingInstagramHandle', s.instagramHandle || '@imoda_tesettur');
    setVal('settingAddress', s.address || 'Cumhuriyet Mah. Hükümet Cad. No: 10/B, Bafra / Samsun');
    setVal('settingAnnouncement', s.announcement || 'YENİ SEZON KOLEKSİYONUMUZ YAYINDA | TÜM SİPARİŞLERDE ÜCRETSİZ HIZLI KARGO');

    // Populate Hero Product Options
    const products = catalog.products || [];
    const prodOptionsHtml = '<option value="">-- Herhangi Bir Ürüne Bağlama --</option>' + products.map(p => `
      <option value="${p.slug}">${p.title} (${formatPrice(p.price)})</option>
    `).join('');

    [1, 2, 3].forEach(idx => {
      const sel = document.getElementById(`settingHeroProduct${idx}`);
      if (sel) sel.innerHTML = prodOptionsHtml;
    });

    // Populate Hero Fields
    const heroList = (Array.isArray(s.heroImages) && s.heroImages.length > 0) ? s.heroImages : [
      { image: '/images/instagram/fotograf_01_DePEPuOs9ic.jpg', title: 'Yeni Sezon Eşarp & Pelerin Kombini', slug: '' },
      { image: '/images/instagram/fotograf_03_Dd6MdGtDh4m.jpg', title: 'İkili Takım & Yeni Sezon Stili', slug: '' },
      { image: '/images/instagram/fotograf_04_Dd6MFXjjldy.jpg', title: 'Zarif Ceketli Pantolon Takım', slug: '' }
    ];

    [1, 2, 3].forEach(idx => {
      const item = heroList[idx - 1] || {};
      setVal(`settingHeroImg${idx}`, item.image || '');
      setVal(`settingHeroTitle${idx}`, item.title || '');
      const prodSel = document.getElementById(`settingHeroProduct${idx}`);
      if (prodSel && item.slug) prodSel.value = item.slug;
      
      const prev = document.getElementById(`previewHero${idx}`);
      if (prev) {
        prev.src = item.image || '/images/brand/imoda-logo.webp';
      }

      const input = document.getElementById(`settingHeroImg${idx}`);
      if (input && !input._hasInputListener) {
        input._hasInputListener = true;
        input.addEventListener('input', () => {
          if (prev) prev.src = input.value.trim() || '/images/brand/imoda-logo.webp';
        });
      }
    });

    // Populate Dual Banner Categories
    const cats = catalog.categories || [];
    const catOptionsHtml = cats.map(c => `<option value="${c.id || c.slug}">${c.name}</option>`).join('');
    [1, 2].forEach(idx => {
      const sel = document.getElementById(`settingDualCat${idx}`);
      if (sel) sel.innerHTML = catOptionsHtml;
    });

    const banners = (Array.isArray(s.dualBanners) && s.dualBanners.length > 0) ? s.dualBanners : [
      { title: 'İkili & Etekli Takımlar', image: '/images/instagram/fotograf_07_DbxpzUdjB00.jpg', category: 'takimlar' },
      { title: 'Pardesü, Kap & Giyçık', image: '/images/instagram/fotograf_05_DdEEHfeu29L.jpg', category: 'pardesu' }
    ];

    [1, 2].forEach(idx => {
      const b = banners[idx - 1] || {};
      setVal(`settingDualImg${idx}`, b.image || '');
      setVal(`settingDualTitle${idx}`, b.title || '');
      const catSel = document.getElementById(`settingDualCat${idx}`);
      if (catSel && b.category) catSel.value = b.category;

      const prev = document.getElementById(`previewDual${idx}`);
      if (prev) prev.src = b.image || '/images/brand/imoda-logo.webp';

      const input = document.getElementById(`settingDualImg${idx}`);
      if (input && !input._hasInputListener) {
        input._hasInputListener = true;
        input.addEventListener('input', () => {
          if (prev) prev.src = input.value.trim() || '/images/brand/imoda-logo.webp';
        });
      }
    });

    // Populate SEO & ASO Settings
    const seo = s.seo || {};
    setVal('settingSeoTitle', seo.seoTitle || 'Samsun Tesettür Giyim | i-moda Tesettür (Bafra & Samsun Tesettür Mağazası)');
    setVal('settingSeoDesc', seo.seoDescription || 'Samsun tesettür giyim ve Bafra tesettür mağazası i-moda Tesettür! Yeni sezon ikili takım, pardesü, kap, ferace, tesettür elbise, tunik ve ipek eşarp modelleri.');
    setVal('settingSeoKeywords', seo.seoKeywords || 'samsun tesettür giyim, bafra tesettür giyim, samsun tesettür mağazaları, i-moda tesettür, samsun tesettür elbise, samsun ferace, samsun ikili takım, samsun ipek eşarp');
    setVal('settingAsoAppName', seo.asoAppName || 'i-moda Tesettür | Samsun Tesettür Giyim');
    setVal('settingAsoShortName', seo.asoShortName || 'i-moda Tesettür');
    setVal('settingSiteUrl', seo.siteUrl || s.ikasStoreUrl || 'https://imodatesettur.com');
    setVal('settingGoogleMapsUrl', seo.googleMapsUrl || 'https://www.google.com/maps/search/?api=1&query=Cumhuriyet+Mah.+H%C3%BCk%C3%BCmet+Cad.+No%3A10%2FB+Bafra+Samsun');

    const updateSerpPreview = () => {
      const t = document.getElementById('settingSeoTitle')?.value || 'Samsun Tesettür Giyim | i-moda Tesettür';
      const d = document.getElementById('settingSeoDesc')?.value || '';
      const u = (document.getElementById('settingSiteUrl')?.value || 'https://imodatesettur.com').replace(/\/+$/, '');
      const pt = document.getElementById('serpPreviewTitle');
      const pd = document.getElementById('serpPreviewDesc');
      const pu = document.getElementById('serpPreviewUrl');
      if (pt) pt.textContent = t;
      if (pd) pd.textContent = d;
      if (pu) pu.textContent = `${u} › samsun-tesettur-giyim`;
    };
    updateSerpPreview();

    ['settingSeoTitle', 'settingSeoDesc', 'settingSiteUrl'].forEach(id => {
      const inp = document.getElementById(id);
      if (inp && !inp._hasSerpListener) {
        inp._hasSerpListener = true;
        inp.addEventListener('input', updateSerpPreview);
      }
    });

    // Fetch live SEO & ASO audit status
    fetch('/api/seo/audit')
      .then(r => r.json())
      .then(audit => {
        const badge = document.getElementById('seoAuditScoreBadge');
        if (badge && audit.score !== undefined) {
          badge.textContent = `SEO & ASO Skoru: ${audit.score}/100`;
        }
        const list = document.getElementById('seoAuditChecklist');
        if (list && Array.isArray(audit.checks)) {
          list.innerHTML = audit.checks.map(c => `
            <div title="${c.detail || ''}">${(c.passed ?? c.ok) ? '✅' : '⚠️'} ${c.title || c.label}</div>
          `).join('');
        }
      })
      .catch(() => {});
  }

  // INSTAGRAM TAB
  async function renderAdminInstagram() {
    const grid = document.getElementById('adminInstagramGrid');
    if (!grid) return;
    try {
      const res = await fetch('/api/instagram');
      const posts = await res.json();
      if (!Array.isArray(posts) || posts.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; padding:32px; text-align:center; color:var(--parla-muted);">Instagram verisi bulunamadı.</div>';
        return;
      }
      grid.innerHTML = posts.map(p => `
        <div class="media-card" style="padding:10px;">
          <img src="${p.localUrl}" alt="${p.title}" style="height:220px; object-fit:cover; border-radius:4px;" />
          <div style="font-weight:600; font-size:12px; margin-top:4px; color:var(--parla-black);">${p.title}</div>
          <div style="font-size:11px; color:var(--parla-muted); margin-top:2px;">Kod: ${p.code}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <button type="button" class="btn-text" style="font-size:11.5px; padding:0;" data-copy-ig="${p.localUrl}">URL Kopyala</button>
            <a href="${p.postUrl}" target="_blank" rel="noopener noreferrer" class="btn-text" style="font-size:11.5px; padding:0; color:var(--parla-gold-dark);">Gönderi ↗</a>
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('[data-copy-ig]').forEach(btn => {
        btn.onclick = () => {
          const u = btn.getAttribute('data-copy-ig');
          navigator.clipboard.writeText(u);
          showToast('Instagram görsel URL kopyalandı: ' + u);
        };
      });
    } catch (err) {
      console.warn('Instagram tab verisi yüklenemedi:', err);
    }
  }

  // MEDIA LIBRARY TAB
  function renderMediaLibrary() {
    const grid = document.getElementById('mediaLibraryGrid');
    if (!grid) return;

    if (mediaLibrary.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; padding: 32px; text-align: center; color: var(--parla-muted);">Henüz yüklenmiş görsel bulunmuyor.</div>`;
      return;
    }

    grid.innerHTML = mediaLibrary.map(url => `
      <div class="media-card">
        <img src="${url}" alt="Görsel" loading="lazy" />
        <div class="media-card-title">${url.split('/').pop()}</div>
        <button type="button" class="btn-text" style="font-size: 11px; padding: 2px;" data-copy-url="${url}">URL Kopyala</button>
      </div>
    `).join('');

    grid.querySelectorAll('[data-copy-url]').forEach(btn => {
      btn.onclick = () => {
        const u = btn.getAttribute('data-copy-url');
        navigator.clipboard.writeText(u);
        showToast('Görsel URL kopyalandı: ' + u);
      };
    });
  }

  // PRODUCT EDIT / MODAL
  function openProductEditModal(productId = null) {
    const modal = document.getElementById('productEditModal');
    const titleEl = document.getElementById('productModalTitle');
    const idInput = document.getElementById('editProductId');

    if (productId) {
      titleEl.textContent = 'Ürün Düzenle';
      idInput.value = productId;
      const product = (catalog.products || []).find(p => p.id === productId);
      if (!product) return;

      document.getElementById('editTitle').value = product.title || '';
      document.getElementById('editCode').value = product.code || '';
      document.getElementById('editCategory').value = product.category || 'takimlar';
      document.getElementById('editIkasUrl').value = product.ikasUrl || '';
      document.getElementById('editPrice').value = product.price || '';
      document.getElementById('editOldPrice').value = product.oldPrice || '';
      document.getElementById('editInstagramPost').value = product.instagramPostUrl || '';
      document.getElementById('editDescription').value = product.description || '';
      document.getElementById('editFabricInfo').value = product.fabricInfo || '';

      editingFeatures = {
        hasColors: product.hasColors !== false,
        hasSizes: product.hasSizes !== false,
        hasFabricInfo: product.hasFabricInfo !== false,
        hasDescription: product.hasDescription !== false
      };

      editingVariants = JSON.parse(JSON.stringify(product.variants || []));
      if (editingVariants.length === 0) {
        editingVariants = [{
          id: `var-${Date.now()}`,
          colorName: 'Standart',
          colorHex: '#1a1816',
          ikasUrl: product.ikasUrl || '',
          images: [],
          sizes: STANDARD_SIZES.slice(0, 5).map(s => ({ size: s, inStock: true }))
        }];
      }
    } else {
      titleEl.textContent = 'Yeni Ürün Ekle';
      idInput.value = '';
      document.getElementById('editTitle').value = '';
      document.getElementById('editCode').value = `IMD-${Math.floor(1000 + Math.random() * 9000)}`;
      document.getElementById('editCategory').value = (catalog.categories[0] && catalog.categories[0].id) || 'takimlar';
      document.getElementById('editIkasUrl').value = '';
      document.getElementById('editPrice').value = '';
      document.getElementById('editOldPrice').value = '';
      document.getElementById('editInstagramPost').value = 'https://www.instagram.com/imoda_tesettur/';
      document.getElementById('editDescription').value = '';
      document.getElementById('editFabricInfo').value = '1. Sınıf dökümlü kumaş. Terletme ve kırışma yapmaz.';

      editingFeatures = {
        hasColors: true,
        hasSizes: true,
        hasFabricInfo: true,
        hasDescription: true
      };

      editingVariants = [{
        id: `var-${Date.now()}`,
        colorName: 'Standart',
        colorHex: '#1a1816',
        ikasUrl: '',
        images: [],
        sizes: ['38', '40', '42', '44'].map(s => ({ size: s, inStock: true }))
      }];
    }

    applyFeatureTogglesToUI();
    renderVariantEditors();
    modal.classList.add('open');
  }

  function applyFeatureTogglesToUI() {
    const updateBtn = (btnId, checkId, isActive) => {
      const btn = document.getElementById(btnId);
      const chk = document.getElementById(checkId);
      if (btn && chk) {
        chk.checked = isActive;
        btn.classList.toggle('active', isActive);
      }
    };

    updateBtn('toggleColorsBtn', 'checkHasColors', editingFeatures.hasColors);
    updateBtn('toggleSizesBtn', 'checkHasSizes', editingFeatures.hasSizes);
    updateBtn('toggleFabricBtn', 'checkHasFabric', editingFeatures.hasFabricInfo);
    updateBtn('toggleDescBtn', 'checkHasDesc', editingFeatures.hasDescription);

    const descGroup = document.getElementById('descFieldGroup');
    if (descGroup) descGroup.style.display = editingFeatures.hasDescription ? 'block' : 'none';

    const fabricGroup = document.getElementById('fabricFieldGroup');
    if (fabricGroup) fabricGroup.style.display = editingFeatures.hasFabricInfo ? 'block' : 'none';

    const addVarBtn = document.getElementById('addVariantBtn');
    if (addVarBtn) addVarBtn.style.display = editingFeatures.hasColors ? 'inline-block' : 'none';

    const vHeader = document.getElementById('variantsHeaderTitle');
    if (vHeader) {
      vHeader.textContent = editingFeatures.hasColors ? 'Renk Varyantları & Görseller' : 'Ürün Görselleri & Bedenler';
    }
  }

  function renderVariantEditors() {
    const list = document.getElementById('variantEditorsList');
    if (!list) return;

    if (!editingFeatures.hasColors && editingVariants.length > 1) {
      editingVariants = [editingVariants[0]];
    }

    list.innerHTML = editingVariants.map((v, vIdx) => {
      const images = v.images || [];
      const sizes = v.sizes || [];

      return `
        <div class="variant-editor-box" data-variant-idx="${vIdx}">
          <div class="variant-editor-header">
            ${editingFeatures.hasColors ? `
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <input type="color" class="form-input" style="width: 42px; height: 38px; padding: 2px;" data-var-field="colorHex" value="${v.colorHex || '#1a1816'}" />
                <input type="text" class="form-input" style="width: 160px;" data-var-field="colorName" value="${v.colorName || ''}" placeholder="Renk Adı (örn: Siyah)" required />
                <input type="url" class="form-input" style="width: 250px; font-size: 11.5px;" data-var-field="ikasUrl" value="${v.ikasUrl || ''}" placeholder="Bu renge özel İkas Linki (isteğe bağlı)" />
              </div>
            ` : `
              <div style="font-weight: 600; font-size: 13px;">Ürün Görselleri ve Stok Bilgisi</div>
            `}

            ${editingFeatures.hasColors && editingVariants.length > 1 ? `
              <button type="button" class="btn-text danger" data-remove-var="${vIdx}">Varyantı Kaldır</button>
            ` : ''}
          </div>

          <!-- IMAGES -->
          <div>
            <label class="field-label">Görseller (${images.length})</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" class="form-input" id="newImgUrl-${vIdx}" placeholder="Görsel URL yapıştırın (https://... veya /images/...)" />
              <button type="button" class="btn-gold" style="white-space: nowrap; padding: 8px 14px;" data-add-img-url="${vIdx}">Ekle</button>
            </div>

            <div class="variant-images-list">
              ${images.map((img, imgIdx) => `
                <div class="variant-img-item">
                  <img src="${img}" alt="Foto" />
                  <div class="variant-img-actions">
                    <span>#${imgIdx + 1}</span>
                    <button type="button" class="btn-text danger" style="padding:0;" data-remove-img="${vIdx}-${imgIdx}">Sil</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- SIZES MATRIX (Only if hasSizes is TRUE) -->
          ${editingFeatures.hasSizes ? `
            <div style="margin-top: 16px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <label class="field-label" style="margin:0;">Bedenler &amp; Stok Durumu</label>
                <div style="display:flex; gap:6px;">
                  <input type="text" id="customSizeInput-${vIdx}" class="form-input" style="width: 70px; padding: 4px 6px; font-size: 11px;" placeholder="38 vb." />
                  <button type="button" class="btn-text" data-add-custom-size="${vIdx}">+ Beden Ekle</button>
                </div>
              </div>

              <div class="sizes-matrix">
                ${sizes.map((sz, szIdx) => `
                  <label class="size-chip">
                    <input type="checkbox" data-sz-check="${vIdx}-${szIdx}" ${sz.inStock ? 'checked' : ''} />
                    <strong>${sz.size}</strong>
                    <button type="button" class="btn-text danger" style="padding:0; font-size:11px;" data-del-size="${vIdx}-${szIdx}">&times;</button>
                  </label>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Bind color/name inputs
    list.querySelectorAll('[data-var-field]').forEach(inp => {
      inp.onchange = (e) => {
        const box = inp.closest('.variant-editor-box');
        const vIdx = Number(box.getAttribute('data-variant-idx'));
        const field = inp.getAttribute('data-var-field');
        if (editingVariants[vIdx]) {
          editingVariants[vIdx][field] = e.target.value;
        }
      };
    });

    // Bind remove variant
    list.querySelectorAll('[data-remove-var]').forEach(btn => {
      btn.onclick = () => {
        const vIdx = Number(btn.getAttribute('data-remove-var'));
        editingVariants.splice(vIdx, 1);
        renderVariantEditors();
      };
    });

    // Bind add image URL
    list.querySelectorAll('[data-add-img-url]').forEach(btn => {
      btn.onclick = () => {
        const vIdx = Number(btn.getAttribute('data-add-img-url'));
        const inp = document.getElementById(`newImgUrl-${vIdx}`);
        const val = inp ? inp.value.trim() : '';
        if (!val) return;
        editingVariants[vIdx].images = editingVariants[vIdx].images || [];
        editingVariants[vIdx].images.push(val);
        inp.value = '';
        renderVariantEditors();
      };
    });

    // Bind remove image
    list.querySelectorAll('[data-remove-img]').forEach(btn => {
      btn.onclick = () => {
        const [vIdx, imgIdx] = btn.getAttribute('data-remove-img').split('-').map(Number);
        if (editingVariants[vIdx] && editingVariants[vIdx].images) {
          editingVariants[vIdx].images.splice(imgIdx, 1);
          renderVariantEditors();
        }
      };
    });

    // Bind size checkbox (inStock toggle)
    list.querySelectorAll('[data-sz-check]').forEach(chk => {
      chk.onchange = () => {
        const [vIdx, szIdx] = chk.getAttribute('data-sz-check').split('-').map(Number);
        if (editingVariants[vIdx] && editingVariants[vIdx].sizes && editingVariants[vIdx].sizes[szIdx]) {
          editingVariants[vIdx].sizes[szIdx].inStock = chk.checked;
        }
      };
    });

    // Bind remove size
    list.querySelectorAll('[data-del-size]').forEach(btn => {
      btn.onclick = () => {
        const [vIdx, szIdx] = btn.getAttribute('data-del-size').split('-').map(Number);
        if (editingVariants[vIdx] && editingVariants[vIdx].sizes) {
          editingVariants[vIdx].sizes.splice(szIdx, 1);
          renderVariantEditors();
        }
      };
    });

    // Bind add custom size
    list.querySelectorAll('[data-add-custom-size]').forEach(btn => {
      btn.onclick = () => {
        const vIdx = Number(btn.getAttribute('data-add-custom-size'));
        const inp = document.getElementById(`customSizeInput-${vIdx}`);
        const sz = inp ? inp.value.trim() : '';
        if (!sz) return;
        editingVariants[vIdx].sizes = editingVariants[vIdx].sizes || [];
        if (!editingVariants[vIdx].sizes.some(s => s.size.toLowerCase() === sz.toLowerCase())) {
          editingVariants[vIdx].sizes.push({ size: sz, inStock: true });
        }
        inp.value = '';
        renderVariantEditors();
      };
    });
  }

  // CATEGORY MODAL
  function openCategoryEditModal(categoryId = null) {
    const modal = document.getElementById('categoryEditModal');
    const titleEl = document.getElementById('categoryModalTitle');
    const idInput = document.getElementById('editCategoryId');

    if (categoryId) {
      titleEl.textContent = 'Kategori Düzenle';
      idInput.value = categoryId;
      const cat = (catalog.categories || []).find(c => c.id === categoryId || c.slug === categoryId);
      if (!cat) return;
      document.getElementById('editCategoryName').value = cat.name || '';
      document.getElementById('editCategoryImage').value = cat.image || '';
      document.getElementById('editCategoryFeatured').value = cat.featured !== false ? 'true' : 'false';
      document.getElementById('catDefaultSizes').checked = cat.defaultHasSizes !== false;
      document.getElementById('catDefaultColors').checked = cat.defaultHasColors !== false;
      document.getElementById('catDefaultFabric').checked = cat.defaultHasFabricInfo !== false;
    } else {
      titleEl.textContent = 'Yeni Kategori Ekle';
      idInput.value = '';
      document.getElementById('editCategoryName').value = '';
      document.getElementById('editCategoryImage').value = '/images/brand/imoda-logo.webp';
      document.getElementById('editCategoryFeatured').value = 'true';
      document.getElementById('catDefaultSizes').checked = true;
      document.getElementById('catDefaultColors').checked = true;
      document.getElementById('catDefaultFabric').checked = true;
    }

    modal.classList.add('open');
  }

  // DOM LOAD & EVENT BINDINGS
  document.addEventListener('DOMContentLoaded', () => {
    loadAdminData();

    // Tab Switching
    document.querySelectorAll('[data-admin-tab]').forEach(btn => {
      btn.onclick = () => {
        const tab = btn.getAttribute('data-admin-tab');
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.getElementById('tabProducts').style.display = tab === 'products' ? 'block' : 'none';
        document.getElementById('tabCategories').style.display = tab === 'categories' ? 'block' : 'none';
        document.getElementById('tabIkas').style.display = tab === 'ikas' ? 'block' : 'none';
        document.getElementById('tabInstagram').style.display = tab === 'instagram' ? 'block' : 'none';
        document.getElementById('tabSettings').style.display = tab === 'settings' ? 'block' : 'none';
        document.getElementById('tabMedia').style.display = tab === 'media' ? 'block' : 'none';
      };
    });

    // Product search & filter
    document.getElementById('adminProductSearch')?.addEventListener('input', renderProductsTable);
    document.getElementById('adminCatFilter')?.addEventListener('change', renderProductsTable);

    // New Product Button
    document.getElementById('newProductBtn')?.addEventListener('click', () => {
      openProductEditModal(null);
    });

    // Close Product Modal
    document.getElementById('closeProductEditBtn')?.addEventListener('click', () => {
      document.getElementById('productEditModal').classList.remove('open');
    });
    document.getElementById('cancelProductEditBtn')?.addEventListener('click', () => {
      document.getElementById('productEditModal').classList.remove('open');
    });

    // Feature Toggles in Product Modal
    const bindToggle = (btnId, checkId, key) => {
      const btn = document.getElementById(btnId);
      const chk = document.getElementById(checkId);
      if (btn && chk) {
        btn.onclick = () => {
          chk.checked = !chk.checked;
          editingFeatures[key] = chk.checked;
          applyFeatureTogglesToUI();
          renderVariantEditors();
        };
      }
    };
    bindToggle('toggleColorsBtn', 'checkHasColors', 'hasColors');
    bindToggle('toggleSizesBtn', 'checkHasSizes', 'hasSizes');
    bindToggle('toggleFabricBtn', 'checkHasFabric', 'hasFabricInfo');
    bindToggle('toggleDescBtn', 'checkHasDesc', 'hasDescription');

    // Add Variant Button
    document.getElementById('addVariantBtn')?.addEventListener('click', () => {
      editingVariants.push({
        id: `var-${Date.now()}`,
        colorName: `Renk ${editingVariants.length + 1}`,
        colorHex: '#1a1816',
        ikasUrl: document.getElementById('editIkasUrl').value || '',
        images: [],
        sizes: ['38', '40', '42', '44'].map(s => ({ size: s, inStock: true }))
      });
      renderVariantEditors();
    });

    // Save Product
    document.getElementById('saveProductBtn')?.addEventListener('click', async () => {
      const pid = document.getElementById('editProductId').value;
      const title = document.getElementById('editTitle').value.trim();
      const code = document.getElementById('editCode').value.trim();
      const category = document.getElementById('editCategory').value;
      const ikasUrl = document.getElementById('editIkasUrl').value.trim();
      const price = parseFloat(document.getElementById('editPrice').value) || 0;
      const oldPrice = parseFloat(document.getElementById('editOldPrice').value) || null;
      const instagramPostUrl = document.getElementById('editInstagramPost').value.trim();
      const description = document.getElementById('editDescription').value.trim();
      const fabricInfo = document.getElementById('editFabricInfo').value.trim();

      if (!title) {
        alert('Lütfen ürün başlığını giriniz.');
        return;
      }
      if (price <= 0) {
        alert('Lütfen geçerli bir fiyat giriniz.');
        return;
      }

      const payload = {
        title,
        code,
        category,
        ikasUrl,
        price,
        oldPrice,
        instagramPostUrl,
        hasColors: editingFeatures.hasColors,
        hasSizes: editingFeatures.hasSizes,
        hasFabricInfo: editingFeatures.hasFabricInfo,
        hasDescription: editingFeatures.hasDescription,
        description: editingFeatures.hasDescription ? description : '',
        fabricInfo: editingFeatures.hasFabricInfo ? fabricInfo : '',
        variants: editingVariants
      };

      try {
        const url = pid ? `/api/products/${pid}` : '/api/products';
        const method = pid ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Kaydedilemedi');
        const saved = await res.json();

        if (pid) {
          const idx = (catalog.products || []).findIndex(p => p.id === pid);
          if (idx !== -1) catalog.products[idx] = saved;
        } else {
          catalog.products = catalog.products || [];
          catalog.products.unshift(saved);
        }

        document.getElementById('productEditModal').classList.remove('open');
        renderStats();
        renderProductsTable();
        renderIkasLinksTable();
        showToast('Ürün başarıyla kaydedildi!');
      } catch (err) {
        alert('Hata: ' + err.message);
      }
    });

    // Category modal triggers
    document.getElementById('newCategoryBtn')?.addEventListener('click', () => {
      openCategoryEditModal(null);
    });
    document.getElementById('closeCategoryEditBtn')?.addEventListener('click', () => {
      document.getElementById('categoryEditModal').classList.remove('open');
    });
    document.getElementById('cancelCategoryEditBtn')?.addEventListener('click', () => {
      document.getElementById('categoryEditModal').classList.remove('open');
    });

    // Save Category
    document.getElementById('saveCategoryBtn')?.addEventListener('click', async () => {
      const cid = document.getElementById('editCategoryId').value;
      const name = document.getElementById('editCategoryName').value.trim();
      const image = document.getElementById('editCategoryImage').value.trim();
      const featured = document.getElementById('editCategoryFeatured').value === 'true';
      const defaultHasSizes = document.getElementById('catDefaultSizes').checked;
      const defaultHasColors = document.getElementById('catDefaultColors').checked;
      const defaultHasFabricInfo = document.getElementById('catDefaultFabric').checked;

      if (!name) {
        alert('Lütfen kategori adını giriniz.');
        return;
      }

      const payload = {
        name,
        image,
        featured,
        defaultHasSizes,
        defaultHasColors,
        defaultHasFabricInfo
      };

      try {
        const url = cid ? `/api/categories/${cid}` : '/api/categories';
        const method = cid ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Kaydedilemedi');
        const saved = await res.json();

        if (cid) {
          const idx = (catalog.categories || []).findIndex(c => c.id === cid || c.slug === cid);
          if (idx !== -1) catalog.categories[idx] = saved;
        } else {
          catalog.categories = catalog.categories || [];
          catalog.categories.push(saved);
        }

        document.getElementById('categoryEditModal').classList.remove('open');
        populateCategorySelects();
        renderCategoriesTable();
        showToast('Kategori başarıyla kaydedildi!');
      } catch (err) {
        alert('Hata: ' + err.message);
      }
    });

    // Save Nav Menu Settings
    document.getElementById('btnSaveNavMenu')?.addEventListener('click', async () => {
      const container = document.getElementById('navMenuEditorContainer');
      if (!container) return;

      const groupCards = container.querySelectorAll('.nav-menu-group-card');
      const navMenu = [];

      groupCards.forEach(card => {
        const id = (card.querySelector('.group-id-input')?.value || '').trim();
        const title = (card.querySelector('.group-title-input')?.value || '').trim();
        const featImg = (card.querySelector('.feat-img-input')?.value || '').trim();
        const featTag = (card.querySelector('.feat-tag-input')?.value || '').trim();

        const columns = [];
        card.querySelectorAll('.nav-col-box').forEach(colBox => {
          const header = (colBox.querySelector('.col-header-input')?.value || '').trim();
          const links = [];
          colBox.querySelectorAll('.col-link-row').forEach(row => {
            const label = (row.querySelector('.link-label-input')?.value || '').trim();
            const category = (row.querySelector('.link-cat-select')?.value || '').trim();
            const kw = (row.querySelector('.link-kw-input')?.value || '').trim();
            if (label) {
              links.push({ label, category, kw });
            }
          });
          columns.push({ header, links });
        });

        navMenu.push({
          id,
          title,
          featureCard: {
            image: featImg || '/images/brand/imoda-logo.webp',
            tag: featTag || title,
            cta: 'Tümünü Keşfet →'
          },
          columns
        });
      });

      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ navMenu })
        });
        if (!res.ok) throw new Error('Kaydedilemedi');
        catalog.settings = await res.json();
        renderNavMenuEditor();
        showToast('Navbar açılır menü ayarları kaydedildi!');
      } catch (err) {
        alert('Menü kaydedilemedi: ' + err.message);
      }
    });

    // Save Settings
    document.getElementById('btnSaveSettings')?.addEventListener('click', async () => {
      const heroImages = [1, 2, 3].map(idx => ({
        image: (document.getElementById(`settingHeroImg${idx}`)?.value || '').trim(),
        title: (document.getElementById(`settingHeroTitle${idx}`)?.value || '').trim(),
        slug: (document.getElementById(`settingHeroProduct${idx}`)?.value || '').trim()
      })).filter(h => h.image);

      const dualBanners = [1, 2].map(idx => ({
        image: (document.getElementById(`settingDualImg${idx}`)?.value || '').trim(),
        title: (document.getElementById(`settingDualTitle${idx}`)?.value || '').trim(),
        category: (document.getElementById(`settingDualCat${idx}`)?.value || '').trim()
      })).filter(b => b.image);

      const seo = {
        ...(catalog.settings?.seo || {}),
        seoTitle: (document.getElementById('settingSeoTitle')?.value || '').trim(),
        seoDescription: (document.getElementById('settingSeoDesc')?.value || '').trim(),
        seoKeywords: (document.getElementById('settingSeoKeywords')?.value || '').trim(),
        asoAppName: (document.getElementById('settingAsoAppName')?.value || '').trim(),
        asoShortName: (document.getElementById('settingAsoShortName')?.value || '').trim(),
        siteUrl: (document.getElementById('settingSiteUrl')?.value || '').trim(),
        googleMapsUrl: (document.getElementById('settingGoogleMapsUrl')?.value || '').trim()
      };

      const payload = {
        brandName: document.getElementById('settingBrandName').value.trim(),
        subtitle: document.getElementById('settingSubtitle').value.trim(),
        phone: document.getElementById('settingPhone').value.trim(),
        whatsapp: document.getElementById('settingWhatsapp').value.trim(),
        instagram: document.getElementById('settingInstagram').value.trim(),
        instagramHandle: document.getElementById('settingInstagramHandle').value.trim(),
        address: document.getElementById('settingAddress').value.trim(),
        announcement: document.getElementById('settingAnnouncement').value.trim(),
        heroImages,
        dualBanners,
        seo
      };

      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Kaydedilemedi');
        catalog.settings = await res.json();
        renderSettings();
        showToast('Site ve vitrin ayarları güncellendi!');
      } catch (err) {
        alert('Ayarlar kaydedilemedi: ' + err.message);
      }
    });

    // Save Ikas Domain
    document.getElementById('btnSaveIkasDomain')?.addEventListener('click', async () => {
      const url = document.getElementById('ikasStoreUrlInput').value.trim();
      if (!url) {
        alert('Lütfen geçerli bir İkas mağaza URL giriniz.');
        return;
      }
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ikasStoreUrl: url })
        });
        if (!res.ok) throw new Error('Kaydedilemedi');
        catalog.settings = await res.json();
        document.getElementById('currentIkasDomain').textContent = url;
        showToast('İkas mağaza adresi kaydedildi!');
      } catch (err) {
        alert('Kaydedilemedi: ' + err.message);
      }
    });

    // Auto-generate Ikas links for all products
    document.getElementById('btnAutoGenerateIkasLinks')?.addEventListener('click', async () => {
      const storeUrl = document.getElementById('ikasStoreUrlInput').value.trim() || 'https://imodatesettur.com';
      if (!confirm(`Tüm ürünlerin İkas linkleri "${storeUrl}/[urun-slug]" formatında oluşturulacak. Onaylıyor musunuz?`)) return;

      try {
        const res = await fetch('/api/ikas/bulk-generate-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ikasStoreUrl: storeUrl, overwrite: true })
        });
        if (!res.ok) throw new Error('İşlem başarısız');
        const data = await res.json();

        // Refresh catalog
        const catRes = await fetch('/api/catalog');
        catalog = await catRes.json();
        renderStats();
        renderProductsTable();
        renderIkasLinksTable();
        showToast(`${data.updatedCount} ürün için İkas linki başarıyla oluşturuldu!`);
      } catch (err) {
        alert('Hata: ' + err.message);
      }
    });

    // Media upload trigger
    const fileInput = document.getElementById('mediaUploadInput');
    const uploadBtn = document.getElementById('btnUploadImageTrigger');
    if (uploadBtn && fileInput) {
      uploadBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
          const dataUrl = evt.target.result;
          try {
            showToast('Görsel yükleniyor...');
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename: file.name, dataUrl })
            });
            if (!res.ok) throw new Error('Yüklenemedi');
            const data = await res.json();
            mediaLibrary.unshift(data.url);
            renderMediaLibrary();
            showToast('Görsel yüklendi: ' + data.url);
          } catch (err) {
            alert('Görsel yükleme hatası: ' + err.message);
          }
        };
        reader.readAsDataURL(file);
      };
    }
  });
})();
