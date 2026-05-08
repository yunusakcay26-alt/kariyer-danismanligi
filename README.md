# Kariyer İnşa Görüşmesi (CCI) — Web Uygulaması

Mark L. Savickas'ın **Career Construction Interview** protokolünü temel alan, 5 soruluk yansıtma uygulaması.

## Mimari

```
cci-app/
├── public/
│   ├── index.html     # Sayfa iskelesi, sorular, onam kutusu
│   ├── styles.css     # Tema değişkenleri, layout, light/dark mod
│   └── app.js         # Sayfa geçişleri, kelime sayımı, API çağrısı
├── server/
│   └── index.js       # Express API proxy + statik dosya servisi
├── .env.example       # Ortam değişkeni şablonu
└── package.json
```

**API anahtarı sunucu tarafında** `.env` dosyasında saklanır, tarayıcıya hiç gönderilmez. Frontend sadece `/api/reflect` endpoint'ine POST atar, backend Anthropic API'ye proxy yapar.

## Kurulum

```bash
cd cci-app
npm install

# .env dosyasını oluştur
cp .env.example .env
# .env içine API anahtarını yaz:
# ANTHROPIC_API_KEY=sk-ant-...

# Çalıştır
node server/index.js
# → http://localhost:3000
```

## Hosting

**Basit VPS (DigitalOcean, Hetzner, Railway):**
```bash
git clone <repo> && cd cci-app
npm install
export ANTHROPIC_API_KEY=sk-ant-...
node server/index.js
```

**Vercel / Render / Railway:** `server/index.js` dosyasını entry point olarak ayarla, `ANTHROPIC_API_KEY` ortam değişkenini dashboard'dan ekle.

## Özelleştirme

- **Renkler**: `public/styles.css` → `:root` ve `[data-theme="dark"]`
- **Minimum kelime**: `public/app.js` → `MIN_WORDS`
- **Prompt**: `server/index.js` → `buildPrompt()`
- **Model**: `.env` → `ANTHROPIC_MODEL` (varsayılan: `claude-sonnet-4-5`)

---

**Not**: Üretilen yansıtma, kalifiye bir kariyer danışmanının yapacağı klinik formülasyonun yerine geçmez.
