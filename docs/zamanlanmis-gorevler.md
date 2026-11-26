# Zamanlanmış görev

Tek planlı görev vardır: her gün 12:00 (Europe/Istanbul, cron `0 0 12 * * *`). Haftalık rapor, PDF ve cumartesi dalı yoktur; klinik araştırmalar iki haftada bir taranır ve o günkü sayıya girer.

## Görev metni

> Göğüs cerrahisi literatür takibi: her gün 12:00'de siteyi güncelle ve günlük Markdown bildirimini ver. Haftalık rapor, PDF ve ayrı teslim dosyası yoktur.
> 1) /home/ubuntu/torakslit dizininde 'bash pipeline/run_daily.sh' çalıştır. Son 24 saat taranır, kayıtlar 7 günlük kayan pencereye eklenir; kaynaklar PubMed [edat], ClinicalTrials.gov (iki haftada bir), Europe PMC, Crossref/RSS. content/issues/YYYY-MM-DD.json, content/index.json ve content/reports/YYYY-MM-DD.md üretilir.
> 2) Sayıyı doğrula: stats.scanned değeri direct+indirect+offTopic+videoCase+cardiac+unavailable toplamına eşit olmalı; numberMismatches dolu kartları özet metniyle karşılaştır, uyuşmayanı düzelt, doğrulanamayanı 'doğrulanamadı' bırak. Beş eksen (ilgi, yayın türü, alan, yaklaşım, tema) her doğrudan kayıtta dolu olmalı.
> 3) 'pnpm check' komutunu çalıştır (tsc, arama testleri, Python testleri, build).
> 4) 'git fetch origin main' ile birleştir, commit et ve 'git push origin HEAD:main' ile gönder. Manus kanonik deposunda push checkpoint üretir ve otomatik yayını tetikler; ayrıca POST publish çağırma. Yayını deployStatus: success ve deployRevision ile doğrula.
> 5) Canlı adreste duman testi: 'python3 /home/ubuntu/skills/literature-tracking-site/scripts/smoke_site.py --url https://toraks.manus.space/ --search gogus --search akciger'. Konsol hatası, sıfır kart ve mobil yatay taşma hata sayılır.
> 6) Günlük Markdown bildirimi ver: content/reports/YYYY-MM-DD.md içeriğini sohbette özetle. Bölüm sırası: genel bakış, doğrudan makaleler (önce tasarım, sonra alan), klinik araştırmalar (iki haftada bir), dolaylı makaleler, konu dışı başlıklar, taranan kaynaklar. Olgu, video ve yorum kayıtları ayrı bölüm açmaz; normal makale gibi çevrilir ve özetlenir, tür yalnız etiket olur.
> 7) Kısa Türkçe özet ver: son 24 saatte eklenen doğrudan kayıt sayısı, tasarım ve alan dağılımı, öne çıkan üç başlık, iki haftada bir taranan klinik araştırma sayısı, erişilemeyen kaynaklar.
> Kurallar: yalnızca erişilen metne dayan, rakamları aynen aktar, klinik öneri verme, hasta verisi işleme, boşluklu tire kullanma.

## Notlar

- İlk çalıştırmada 30 günlük pencere gerekirse: `bash pipeline/run_daily.sh --window 30`.
- Yayın adımı başarısız olursa commit korunur; yalnızca yayın yeniden denenir (`docs/yayin.md`).
- Rapor teslimi başarısız olursa Markdown dosyası yine `content/reports/` altında durur.
