# Alan adı, yayın ve e-posta aboneliği

## 1. toraks.manus.space

24 Kasım 2026 ölçümü: `https://toraks.manus.space` ve `https://torakslit-v5xacf3m.manus.space` ikisi de HTTP 200 dönüyor. Yani adres artık bu projeye bağlı ve çalışıyor; daha önce görülen hata, alan adının projeye eklenmesinden önceki duruma ait.

Kendi alan adınızı (ör. `torakslit.org`) bağlamak isterseniz iki yol var:

1. Webdev projesinde özel alan adı tanımı: alan adı sağlayıcısında `CNAME` kaydı yayın adresine yönlendirilir, ardından proje ayarlarında alan adı doğrulanır.
2. Alan adını Vercel ya da Cloudflare Pages üzerinden bağlamak: DNS yönetimi sizde kalır, sertifika otomatik üretilir.

Her iki yolda da DNS yayılımı 5 dakika ile 24 saat arasında sürebilir; bu süre boyunca adres aralıklı olarak hata verebilir.

## 2. GitHub ve Vercel karşılaştırması

| Konu | Manus Webdev (mevcut) | GitHub + Vercel |
|---|---|---|
| Site yayını | Otomatik, her push'ta | Vercel her push'ta derleyip yayınlar |
| Günlük hat | Manus zamanlanmış görevi, yerleşik model köprüsü | GitHub Actions çalıştırabilir ama model köprüsü ve Manus ortamı yok |
| İçerik güncellemesi | Hat `content/issues` yazar, otomatik yayınlar | Hat commit eder, Vercel derler |
| Özel alan adı | Proje ayarlarından | Vercel panelinden, ücretsiz sertifika |
| Önizleme | Preview bağlantısı | Her dal için önizleme |
| Maliyet | Mevcut plan | Ücretsiz katman çoğu statik site için yeterli |

Sonuç: hattın kendisi Manus'a bağlı (yerleşik LLM köprüsü, tarama araçları). Bu yüzden önerilen düzen, hattın Manus'ta kalması ve kodun GitHub'da aynalanması; Vercel ise yalnızca yayın katmanı olarak eklenir. GitHub Actions içinde hattı çalıştırmak için model anahtarlarının depo sırrı olarak tanımlanması ve `pipeline/llm.mjs` içindeki köprü yerine doğrudan API çağrısı yazılması gerekir; bu, mevcut kurulumu ikiye böler.

Vercel'e geçilecekse izlenecek yol:

1. Depoyu Vercel'e bağla, çerçeve olarak Vite seç, derleme komutu `pnpm build`, çıktı klasörü `dist`.
2. `content/issues` depoda tutulduğu için her gün yeni sayı push edildiğinde Vercel kendiliğinden derler.
3. Alan adını Vercel'de tanımla, DNS kayıtlarını güncelle.
4. Manus tarafındaki otomatik yayını kapatma; iki yayın birbirinden bağımsız çalışır, tek adres seçilir.

## 3. E-posta aboneliği

Statik sitede gerçek abonelik için adres toplayan bir arka uç ya da harici bülten servisi gerekir. Üç uygulanabilir yol:

1. **Bülten servisi (önerilen):** Buttondown, MailerLite veya Mailchimp ücretsiz katmanı. Sitedeki form servise gönderir, abone listesi servisde tutulur. Günlük veya haftalık gönderimi Manus zamanlanmış görevi, servisin API'sine raporu ileterek yapar.
2. **Google Form + Google E-Tablolar:** Form bağlantısı siteye konur, yanıtlar e-tabloya düşer. Manus görevi tabloyu okuyup haftalık raporu gönderir. Kurulum en hızlı, ölçek küçük.
3. **Posta bağlantısı (şu an kodda hazır):** `src/site.ts` içindeki `subscribeEmail` doldurulduğunda altbilgide "E-posta ile abone ol" düğmesi görünür ve ziyaretçinin posta uygulamasında hazır ileti açar. Sunucu gerekmez, liste otomatik oluşmaz.

Şu anki durum: `subscribeEmail` boş olduğu için düğme görünmüyor. Bir adres verildiğinde düğme etkinleşir. Otomatik liste ve toplu gönderim isteniyorsa 1. veya 2. yol seçilmeli; ikisi de Manus zamanlanmış göreviyle birleşir.

KVKK notu: abone listesinde yalnız e-posta adresi tutulmalı, amaç ve saklama süresi form metninde belirtilmeli, çıkış bağlantısı her iletide bulunmalı.
