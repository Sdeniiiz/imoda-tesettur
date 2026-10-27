# i-moda Tesettür — Yeni Nesil Butik & İkas E-Ticaret Entegrasyonu

Bu proje, **i-moda Tesettür** markası için [Parla Boutique](https://parlaboutique.onrender.com) tarzında tasarlanmış, lüks ve zamansız bir online katalog ve **İkas** e-ticaret yönlendirme platformudur.

## 🌟 Öne Çıkan Özellikler

1. **Lüks Butik Tasarımı (Robin & Parla Stili):**
   - Üst duyuru bandı (özelleştirilebilir)
   - Marka kimliği ve logo entegrasyonu
   - Görsel kartlı popüler kategori vitrini
   - Çoklu fotoğraf ve beden/renk filtreli ürün kartları
   - Detaylı ürün modalı (galeri, beden seçimi, kumaş detayları)

2. **İkas E-Ticaret Entegrasyonu:**
   - **Doğrudan İkas Satın Alma:** Ziyaretçiler "İkas'ta Satın Al" butonuna bastığında doğrudan ilgili ürünün İkas sayfasına gider.
   - **Akıllı Otomatik Link Oluşturucu:** Yönetim panelinden tek tıkla tüm ürünler için İkas ürün URL'leri (`https://imodatesettur.com/[urun-slug]`) otomatik oluşturulabilir.
   - **Hızlı Link Güncelleyici:** Yönetim panelinde tüm ürünlerin İkas linkleri anında düzenlenebilir.
   - **WhatsApp Hibrit Destek:** Ürün modalından ürün adı, kodu, rengi ve bedeni hazır mesaj olarak tek tıkla WhatsApp siparişine yönlendirilebilir.

3. **Gelişmiş Yönetim Paneli (`/admin`):**
   - **Ürün Yönetimi:** Ürün ekleme/düzenleme/silme, renk varyantları, beden matrisi, kumaş ve açıklama yönetimi.
   - **Kategori Yönetimi:** Kategori ekleme, vitrinde öne çıkarma ve varsayılan alan tanımları.
   - **İkas Entegrasyon Merkezi:** Mağaza adresi yönetimi ve toplu link eşleme.
   - **Site & İletişim Ayarları:** Telefon, WhatsApp, Instagram ve adres yönetimi.
   - **Medya Kütüphanesi:** Bilgisayardan tek tıkla fotoğraf yükleme (Base64) ve URL kopyalama.

## 🚀 Başlatma

```bash
# Bağımlılıkları yükleyin
npm install

# Sunucuyu başlatın
npm start
```

Sunucu varsayılan olarak `http://localhost:3000` portunda çalışır.
- **Anasayfa:** [http://localhost:3000](http://localhost:3000)
- **Yönetim Paneli:** [http://localhost:3000/admin](http://localhost:3000/admin)
