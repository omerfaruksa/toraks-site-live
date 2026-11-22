# Zamanlanmış görev: günlük site + cumartesi haftalık rapor

Tek planlı görev vardır ve bu depodaki hattı çağırır; kendi tarama betiklerini taşımaz.
Görev her gün 12:00'de (Europe/Istanbul) koşar, siteyi günceller; cumartesi günleri ayrıca
haftalık raporu üretip teslim eder. Manus bir oturumda tek planlı görev kabul ettiği için iki
ayrı görev yerine tek görev kullanılır; haftalık rapor bu görevin cumartesi dalıdır.

- **Günlük dal** — `run_daily.sh`: son 7 günü tarar (yuvarlanan hafta), sayıyı üretir, siteyi yayınlar.
- **Cumartesi dalı** — ek olarak `run_weekly_report.sh`: tarama yapmaz, son 7 günlük sayıyı
  PMID/DOI ile birleştirir, `content/reports/haftalik-YYYY-MM-DD.md` ve PDF üretir.

Günlük kadans yuvarlanan hafta ile çalışır: her sayı son 7 günü kapsar, böylece ana sayfa her gün
tazelenir ve kapsam proje talimatındaki gibi kalır. Tekrar eden kayıtlar LLM'e yeniden gönderilmez;
`pipeline/.work/cls_memo.json` ve `cards_memo.json` üzerinden okunur.

## Görev metni

> Göğüs cerrahisi literatür takibi: her gün 12:00'de siteyi güncelle; cumartesi günleri ayrıca haftalık raporu teslim et.
>
> 1. `/home/ubuntu/torakslit` dizininde `bash pipeline/run_daily.sh` çalıştır (son 7 gün; PubMed `[edat]`, ClinicalTrials.gov, Europe PMC, Crossref/RSS). `content/issues/YYYY-MM-DD.json`, `content/index.json` ve `content/reports/YYYY-MM-DD.md` üretilir.
> 2. Sayıyı doğrula: `stats.scanned` değeri `direct + indirect + offTopic + videoCase + cardiac + unavailable` toplamına eşit olmalı; `numberMismatches` dolu kartları özet metniyle karşılaştır, uyuşmayanı düzelt, doğrulanamayanı "doğrulanamadı" bırak.
> 3. `pnpm exec tsc -b --noEmit`, `pnpm test:pipeline`, `pnpm test:search`, `pnpm build` komutlarını çalıştır (tek komut: `pnpm check`).
> 4. `git fetch origin main` ile birleştir, commit et ve `git push origin HEAD:main` ile gönder.
> 5. `webdev.config` ile `POST publish` çağır; yayın URL'sini yalnızca başarılı sonuçtan sonra paylaş.
> 6. Bugün cumartesiyse ek olarak `bash pipeline/run_weekly_report.sh` çalıştır. `content/reports/haftalik-YYYY-MM-DD.md` üretilir; `manus-md-to-pdf` ile PDF'e çevir ve Markdown ile PDF dosyalarını ekleyerek haftalık raporu teslim et. Bölüm sırası: genel bakış, doğrudan makaleler (tasarım içinde tarih sıralı), klinik araştırmalar, dolaylı makaleler, video ve olgu başlıkları, konu dışı başlıklar, taranan kaynaklar ve erişilemeyenler. Sayıları kaynak JSON ile karşılaştır.
> 7. Kısa Türkçe özet ver: yeni doğrudan makale sayısı, tasarım dağılımı, öne çıkan üç başlık, klinik araştırma sayısı, erişilemeyen kaynaklar.
>
> Kurallar: yalnızca erişilen metne dayan, rakamları aynen aktar, klinik öneri verme, hasta verisi işleme. Kendi tarama betiklerini yazma; hat `pipeline/` içinde tek kaynak.

## Notlar

- İlk çalıştırmada 30 günlük pencere gerekirse: `bash pipeline/run_daily.sh --window 30`.
- Haftalık rapor günlük sayıların üzerine yeni tarama eklemez; iki çıktı arasında sayı farkı oluşmaz.
- Yayın adımı başarısız olursa commit korunur; yalnızca `POST publish` yeniden denenir.
- Sadeleştirme ve denetim kararları `docs/mimari.md` ve `docs/kod-denetimi.md` içinde tutulur.
- Rapor teslimi başarısız olursa Markdown dosyası yine `content/reports/` altında durur.
