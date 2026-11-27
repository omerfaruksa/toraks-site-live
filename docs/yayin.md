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

## İki yayın ayrı yürür

Manus adresi ve GitHub Pages artık birbirine bağlı değil. Günlük planlı görev yalnız Manus tarafını günceller; GitHub deposuna dokunmaz. GitHub tarafı yalnız elle eşitlendiğinde yenilenir. Amaç iki yolu ayrı ayrı ölçmek: Manus tarafı günlük otomatik akışı, GitHub tarafı kendi derleme ve sürüm akışını temsil eder.

Manus akışı: planlı görev 12:00'de `pipeline/run_daily.sh` çalıştırır, sayıyı doğrular, `pnpm check` yapar, Manus deposuna iter ve `https://toraks.manus.space/` adresinde duman testi çalıştırır.

GitHub akışı: `bash tools/github-yayin.sh` komutu işlenmiş hâli depoya gönderir. İtme, `Pages` iş akışını tetikler; iş akışı derler ve `gh-pages` dalına yazar, GitHub da siteyi yayımlar. Sürüm paketi bundan bağımsızdır, `Sürüm` iş akışıyla cuma günleri üretilir.

## Manus içerik dosyalarını keşfetme

GitHub Pages'e içerik aktarımı için Manus'taki üretilmiş dosyaların API üzerinden indirilebilir artifact olarak görünmesi gerekir. Manus API'nin `artifact.list` ucu son 20 artifact'i döndürür; bu uç yalnızca okuma yapar, Manus görevi başlatmaz ve model çalıştırmaz. API anahtarı tam hesap erişimi verdiğinden artifact listesi herkese açık GitHub Actions günlüklerine yazılmamalıdır.

Artifact'leri güvenli biçimde yerelde listelemek için Manus API anahtarını `MANUS_API_KEY` ortam değişkeni olarak tanımlayın ve çalıştırın:

```bash
python3 tools/manus_artifacts.py
```

Betik dosya adını, görev başlığını, artifact/görev kimliğini ve indirme URL'si bulunup bulunmadığını gösterir; imzalı indirme URL'sinin kendisini yazdırmaz veya dosya indirmez. Anahtarı sohbete, repoya ya da komut geçmişine eklemeyin.

Sonraki adım, listede günlük literatür görevinin JSON/ZIP çıktısı görünürse yalnız bu içeriği indiren, şemasını doğrulayan ve GitHub'a aktaran bir Actions işi kurmaktır. İçerik artifact'i yoksa Manus görevinin dosyaları dışa aktarma biçimi netleştirilmeden güvenilir senkronizasyon yapılamaz. GitHub Actions standart runner'ları bu herkese açık repoda ücretsizdir; Manus tarafında yeni görev çalıştırılırsa Manus kullanım/credit maliyeti ayrı değerlendirilir.

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
