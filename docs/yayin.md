# Yayın ve barındırma

Site statik bir paketdir (`pnpm build` → `dist/`). Sunucu, veri tabanı veya ortam anahtarı gerekmez; günlük sayı `content/issues/*.json` dosyasına yazılır ve her itmede yeniden derlenir. Bu yüzden herhangi bir statik barındırma çalışır.

## Öneri

| Ölçüt | GitHub Pages | Cloudflare Pages | Vercel Hobby |
| --- | --- | --- | --- |
| Maliyet | Ücretsiz | Ücretsiz | Ücretsiz, yalnız ticari olmayan kullanım |
| Bant genişliği | 100 GB/ay yumuşak sınır | Sınırsız statik istek | 100 GB/ay |
| Derleme | 10/saat yumuşak sınır | 500/ay (GitHub Actions ile aşılır) | Hobby sınırları içinde |
| Özel depo | Ücretsiz hesapta depo herkese açık olmalı | Özel depo olur | Özel depo olur |
| Ek hesap | Yok (depo zaten GitHub'da) | Cloudflare hesabı | Vercel hesabı |
| Günlük otomasyon | Aynı depoda Actions, ek kurulum yok | Git bağlantısı veya Actions | Git bağlantısı |

**Birinci seçenek: GitHub Pages.** Kod ve günlük içerik zaten GitHub'da; ek hesap, anahtar veya hizmet yok. `.github/workflows/pages.yml` her `main` itmesinde derler ve yayımlar. Bu sitenin trafiği (tek sayfa, ~80 kB gzip) sınırların çok altında kalır.

**İkinci seçenek: Cloudflare Pages.** Sınırsız bant genişliği ve özel depo desteği istenirse. Derleme komutu `pnpm build`, çıktı klasörü `dist`.

**Vercel önerilmez:** Hobby planı ticari olmayan kullanımla sınırlı; bu site için bir avantajı yok.

Not: Manus barındırması (`*.manus.space`) ile Cloudflare Pages aynı CDN ağını kullanır. Bir ağ veya DNS filtresi Cloudflare aralıklarını engelliyorsa ikisi de açılmaz; GitHub Pages ayrı bir ağdadır (`*.github.io`). Erişim sorunu yaşıyorsanız önce GitHub Pages'i deneyin.

## GitHub Pages (kurulu)

Yayın deposu `omerfaruksa/toraks-site-live` (herkese açık). Adres: `https://omerfaruksa.github.io/toraks-site-live/`

Çalışma biçimi: `main` dalına her itmede `.github/workflows/pages.yml` depoyu kurar, `pnpm check` benzeri adımları çalıştırır, `dist` klasörünü derler ve `gh-pages` dalına gönderir. Pages bu depoda **Deploy from a branch: gh-pages** olarak ayarlıdır; dal itildiğinde GitHub kendisi yayımlar. İş akışı `VITE_SITE_URL` değerini kendi adresine çevirir, kanonik bağlantı ve paylaşım görseli bu adresi gösterir.

Yeni bir depoda sıfırdan kurmak gerekirse: depoyu herkese açık yapın, `main` dalını itin, ardından derlenmiş siteyi `gh-pages` dalına bir kez itin. GitHub bu dalda Pages'i kendiliğinden açar (denendi ve doğrulandı). Pages'in kapalı kaldığı durumda Settings > Pages > Source: **Deploy from a branch**, dal: `gh-pages`, klasör: `/ (root)` seçilir. GitHub entegrasyonunun Pages açma izni yoktur; `enablement` bayrağı bu nedenle kullanılmaz.

## Cloudflare Pages kurulumu

Workers & Pages > Create > Pages > Connect to Git > depoyu seçin. Build command: `pnpm build`; Build output directory: `dist`; ortam değişkeni `VITE_SITE_URL` = Pages adresiniz.

## Günlük güncelleme akışı

Veri hattı (`pipeline/`) varsayılan olarak Manus çalışma ortamının LLM geçidini kullanır; kendi OpenAI veya Gemini anahtarınızla da çalışır (`docs/llm-saglayici.md`). Site derlemesinden bağımsızdır. Akış:

1. Planlı görev her gün 12:00'de hattı çalıştırır (`pipeline/run_daily.sh`).
2. Yeni `content/` dosyaları `main` dalına itilir.
3. İtme, Pages iş akışını tetikler; site birkaç dakikada güncellenir.

Hattı kendi bilgisayarınızda çalıştırmak için `docs/llm-saglayici.md` içindeki değişkenleri tanımlamanız yeterlidir.

## Yerel geliştirme (VS Code)

```bash
corepack enable
pnpm install
pnpm dev          # http://localhost:3000
pnpm check        # tür denetimi, arama testleri, Python testleri, derleme
```

Gereksinimler: Node 22, pnpm 10, Python 3.12.

## Sürüm paketi ve dağıtımı

Paket, deponun o günkü hâlini tek zip içinde verir; `node_modules`, `dist`, `.git` ve önbellekler girmez. Üretmek için `bash tools/paket.sh` çalıştırılır; betik dosya sayısını, boyutu ve sha256 özetini yazar. Aynı iş `Sürüm` iş akışıyla her cuma 09:00 UTC'de (12:00 Istanbul) kendiliğinden yapılır ve GitHub Sürümler sayfasına eklenir; etiket biçimi `vYYYY.MM.DD`.

Sürümler: `https://github.com/omerfaruksa/toraks-site-live/releases`. Elle sürüm çıkarmak için Actions > Sürüm > Run workflow, istenirse etiket adı verilir. Paket, site yayınından bağımsızdır: yayın `gh-pages` dalından, paket `main` dalından üretilir.
