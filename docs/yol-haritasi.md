# Yol haritası

Bu belge, sitenin ve veri hattının bundan sonraki işlerini öncelik sırasıyla tutar. Her madde tek cümlelik bir doğrulama ölçütü taşır; ölçüt sağlanmadan madde kapanmış sayılmaz.

## Bugünkü durum

- İki yayın adresi aynı derlemeyi gösteriyor: `https://omerfaruksa.github.io/toraks-site-live/` ve `https://toraks.manus.space/`.
- Günlük planlı görev 12:00'de (Europe/Istanbul) hattı çalıştırıyor, sayıyı doğruluyor, iki depoya itiyor ve iki adreste duman testi yapıyor.
- Test: 39 Python testi, arama testleri, tip denetimi ve derleme `pnpm check` içinde.
- Paket: `tools/paket.sh` tek komutla sürüm zip'i üretir, sha256 yazar.

## Kısa vade (1-2 hafta)

1. **Haftalık içerik denetimi.** GitHub Actions'a yalnız okuma yapan bir iş eklenir: son yedi sayıda `stats.scanned` toplamı, etiketsiz kart sayısı ve `numberMismatches` raporlanır. Ölçüt: iş her pazartesi çalışır ve etiketsiz kart sayısını 0 gösterir.
2. **Etiket kapsama raporu.** `verify_issue.py` çıktısındaki "etiketsiz" satırı sıfırdan büyükse konu listesi gözden geçirilir. Ölçüt: art arda yedi sayıda etiketsiz kart 0.
3. **TR Dizin erişimi.** Kimlik doğrulama anahtarı sağlanırsa arama API'si doğrudan kullanılır; sağlanmazsa Crossref DOI eşlemesi genişletilir. Ölçüt: raporda "erişilemedi" satırı ya kalkar ya da gerekçesi tek cümleye iner.
4. **Paket sürümleme.** Her cuma `tools/paket.sh` çalıştırılıp çıktı GitHub sürümü olarak etiketlenir. Ölçüt: sürüm etiketi, zip ve sha256 aynı sayfada.

## Orta vade (1-3 ay)

1. **Klinik araştırma takibi.** İki haftada bir tarama korunur; kayıtlı çalışmaların durum değişiklikleri (tamamlandı, sonuç yayımlandı) ayrıca izlenir. Ölçüt: durumu değişen çalışma sayısı rapora düşer.
2. **Arama ve dizin.** Yazar ve kurum için ayrı arama alanı; sayı dosyaları büyüdükçe ilk açılış süresi 1 saniyenin altında kalır. Ölçüt: 12 aylık arşivle ölçülen açılış süresi.
3. **Erişilemeyen dergiler.** Liste dışı dergiler için RSS ve Crossref kaynakları genişletilir, erişilemeyenler tek listede toplanır. Ölçüt: erişilemeyen dergi sayısı ve gerekçesi raporda.
4. **Arşiv yedeği.** `content/issues` ve `content/reports` ayrı bir sürüm etiketine bağlanır. Ölçüt: her ay bir arşiv sürümü yayımlanır.

## Uzun vade (3-12 ay)

1. **E-posta özeti.** Günlük bildirim isteğe bağlı e-posta ile gönderilir; abonelik listesi sitede tutulmaz. Ölçüt: gönderim günlüğü ve abonelikten çıkma bağlantısı.
2. **Kalite ölçümü.** Ana sonuçlardaki etki büyüklüğü ve güven aralığı doğrulaması otomatikleştirilir; elle düzeltme sayısı izlenir. Ölçüt: doğrulama uyarısı sayısının sayı başına 2'nin altına inmesi.
3. **Maliyet ve hız.** Sağlayıcı ve model seçimi ölçülür: kayıt başına çağrı sayısı, önbellek isabet oranı, günlük koşu süresi. Ölçüt: günlük koşu 10 dakikanın altında ve önbellek isabeti yüzde 80'in üstünde.

## Bilinen riskler

- **Manus geçidine bağımlılık.** Varsayılan sağlayıcı Manus. Anahtar tanımlanırsa OpenAI veya Gemini ile çalışır (`docs/llm-saglayici.md`); sağlayıcı değişince önbellek temizlenmeli.
- **GitHub Pages herkese açık depo ister.** İçerikte hasta verisi yok, yalnız başlık, özet ve yayın bilgisi var. Ortak yazarlı gizli bir taslak eklenmemeli.
- **Ağ erişimi.** İki adres farklı ağlarda; biri engellenirse diğeri denenir. Kurumsal ağda ikisi de kapalıysa çözüm kullanıcı tarafındadır.
- **Telif.** Sitede yalnız özet ve künye yayımlanır, tam metin kopyalanmaz.
