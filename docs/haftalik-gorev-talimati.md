# Haftalık zamanlanmış görev için talimat taslağı

Mevcut "Güncel literatürü her cumartesi paylaş" görevi iptal edildikten sonra, aynı saatte
(cumartesi 12:00) çalışacak yeni göreve verilecek metin. Görev kendi betiklerini taşımaz; bu
depodaki hattı çağırır.

## Görev metni

> Her cumartesi 12:00'de Göğüs Cerrahisi Literatür Takibi projesinde haftalık sayıyı üret ve siteyi güncelle.
>
> 1. `/home/ubuntu/torakslit` dizininde `bash pipeline/run_weekly.sh` komutunu çalıştır. Hat son 7 günü tarar (PubMed `[edat]`, ClinicalTrials.gov, Crossref/RSS, PMC) ve şunları üretir: `content/issues/YYYY-MM-DD.json`, `content/index.json`, `content/reports/YYYY-MM-DD.md`.
> 2. Üretilen sayıyı doğrula: `stats.scanned` değeri `direct + indirect + offTopic + videoCase + cardiac + unavailable` toplamına eşit olmalı; kartlarda `numberMismatches` dolu olan kayıtları özet metniyle karşılaştır. Uyuşmazlık varsa düzelt, doğrulanamayanı "doğrulanamadı" olarak işaretle.
> 3. `pnpm exec tsc -b --noEmit`, `pnpm test:search`, `pnpm test:pipeline`, `pnpm build` komutlarını çalıştır.
> 4. `git fetch origin main`, değişiklikleri commit et ve `git push origin HEAD:main` ile gönder.
> 5. `webdev.config` ile `POST publish` çağır ve yayın URL'sini paylaş.
> 6. Türkçe kısa özet ver: taranan kayıt, Doğrudan/Dolaylı/Konu dışı dağılımı, klinik araştırma sayısı, erişilemeyen kaynaklar ve bir önceki haftaya göre dikkat çeken değişim.
>
> Kurallar: yalnızca erişilen metne dayan, rakamları aynen aktar, klinik öneri verme, hasta verisi işleme. Kendi tarama betiklerini yazma; hat `pipeline/` içinde tek kaynak.

## Notlar

- Görev yalnızca bu depoyu kullanmalı; başka bir sandbox'ta kopya betik üretmemeli.
- İlk çalıştırma 30 günlük pencere isteyebilir: `bash pipeline/run_weekly.sh --window 30`.
- Yayın adımı başarısız olursa commit korunur; yalnızca `POST publish` yeniden denenir.
