# Zamanlanmış görevler için talimat metinleri

İki ayrı görev vardır ve ikisi de bu depodaki tek hattı çağırır; kendi tarama betiklerini taşımaz.

- **Günlük site güncellemesi** — her gün, son 7 günü tarar, sayıyı üretir, siteyi yayınlar.
- **Haftalık rapor** — cumartesi 12:00, tarama yapmaz; son 7 günlük sayıyı birleştirip raporu teslim eder.

Günlük kadans yuvarlanan hafta ile çalışır: her sayı son 7 günü kapsar, böylece ana sayfa her gün
tazelenir ve kapsam proje talimatındaki gibi kalır. Tekrar eden kayıtlar LLM'e yeniden gönderilmez;
`pipeline/.work/cls_memo.json` ve `cards_memo.json` üzerinden okunur.

## 1. Günlük site güncellemesi (her gün 08:30)

> Her gün 08:30'da Göğüs Cerrahisi Literatür Takibi sitesini güncelle.
>
> 1. `/home/ubuntu/torakslit` dizininde `bash pipeline/run_daily.sh` komutunu çalıştır. Hat son 7 günü tarar (PubMed `[edat]`, ClinicalTrials.gov, Europe PMC, Crossref/RSS), `content/issues/YYYY-MM-DD.json`, `content/index.json` ve `content/reports/YYYY-MM-DD.md` dosyalarını üretir.
> 2. Sayıyı doğrula: `stats.scanned` değeri `direct + indirect + offTopic + videoCase + cardiac + unavailable` toplamına eşit olmalı. `numberMismatches` dolu kartları özet metniyle karşılaştır; uyuşmayanı düzelt, doğrulanamayanı "doğrulanamadı" olarak bırak.
> 3. `pnpm exec tsc -b --noEmit`, `pnpm test:search`, `pnpm test:pipeline`, `pnpm build` komutlarını çalıştır.
> 4. `git fetch origin main`, değişiklikleri commit et, `git push origin HEAD:main` ile gönder.
> 5. `webdev.config` ile `POST publish` çağır; yayın URL'sini yalnızca başarılı sonuçtan sonra paylaş.
> 6. Tek paragraflık Türkçe özet ver: yeni doğrudan makale sayısı, dikkat çeken başlıklar, erişilemeyen kaynaklar.
>
> Kurallar: yalnızca erişilen metne dayan, rakamları aynen aktar, klinik öneri verme, hasta verisi işleme. Kendi tarama betiklerini yazma; hat `pipeline/` içinde tek kaynak.

## 2. Haftalık rapor (cumartesi 12:00)

> Her cumartesi 12:00'de Göğüs Cerrahisi Literatür Takibi için haftalık raporu hazırla ve bana ver.
>
> 1. `/home/ubuntu/torakslit` dizininde `bash pipeline/run_weekly_report.sh` komutunu çalıştır. Bu komut tarama yapmaz; son 7 günlük sayıyı (`content/issues/`) birleştirir, PMID/DOI ile tekilleştirir ve `content/reports/haftalik-YYYY-MM-DD.md` dosyasını yazar.
> 2. Raporun bölüm sırasını koru: genel bakış, doğrudan makaleler (tasarım içinde tarih sıralı), klinik araştırmalar, dolaylı makaleler, video ve olgu başlıkları, konu dışı başlıklar, taranan kaynaklar ve erişilemeyenler.
> 3. Sayıları kaynak JSON ile karşılaştır: doğrudan/dolaylı/konu dışı toplamları, kart sayısı, klinik araştırma sayısı. Uyuşmayan varsa düzelt.
> 4. Raporu PDF'e çevir: `manus-md-to-pdf content/reports/haftalik-YYYY-MM-DD.md content/reports/haftalik-YYYY-MM-DD.pdf`.
> 5. Markdown ve PDF dosyalarını ekleyerek Türkçe kısa özet ver: haftanın doğrudan makale sayısı, tasarım dağılımı, öne çıkan üç başlık, yeni klinik araştırma sayısı, erişilemeyen kaynaklar.
>
> Kurallar: yalnızca erişilen metne dayan, rakamları aynen aktar, klinik öneri verme, hasta verisi işleme.

## Notlar

- İlk çalıştırmada 30 günlük pencere gerekirse: `bash pipeline/run_daily.sh --window 30`.
- Haftalık rapor, günlük sayıların üzerine yeni bir tarama eklemez; böylece iki hat arasında sayı farkı oluşmaz.
- Yayın adımı başarısız olursa commit korunur; yalnızca `POST publish` yeniden denenir.
- Rapor teslimi başarısız olursa Markdown dosyası yine `content/reports/` altında durur.
