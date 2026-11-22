# TODO — Göğüs Cerrahisi Literatür Takibi sitesi

Blueprint onaylandı; bu liste onaylanan kapsamı uygulama sonuçlarına çevirir.

## 1. Günlük sayı yapısı ve genel bakış
- [x] Her sayı tarih ve tarama dönemi ile açılır; dönem başlık olarak görünür (ör. "15–22 Kasım 2026").
- [x] Taranan kayıt sayısı, Doğrudan / Dolaylı / Konu dışı dağılımı ve taranan klinik araştırma sayısı tek bakışta görünür.
- [x] Dağılım oranı ince bir çubukla gösterilir; taranan dergi sayısı künyede yazar.

## 2. Doğrudan makale çalışma kartı
- [x] Türkçe başlık, orijinal başlık, dergi, giriş tarihi, PMID/DOI bağlantısı, konu etiketleri ve erişim durumu (açık tam metin / yalnızca özet) gösterilir.
- [x] Tek paragraflık özet görünür; Tasarım, Örneklem, Karşılaştırma, Sonlanımlar, Ana sonuç, Takip, Veri dönemi alanları yer alır.
- [x] Ana sonuç kart üzerinde vurgulu satır olarak durur; diğer altı alan "Ayrıntılar" panelinde açılır.
- [x] Kaynakta olmayan alan "belirtilmemiş" olarak yazılır.

## 3. Çalışma kartlarının sıralanması
- [x] Kartlar RCT → meta-analiz → kohort → olgu-kontrol → olgu serisi → klinik dışı sırasıyla gruplanır.
- [x] Her tasarım grubunun içinde konu etiketine göre alt gruplama yapılır; grup başlıklarında kayıt sayısı yazar.

## 4. Dolaylı makaleler listesi
- [x] Başlık, dergi, PMID/DOI ve tek cümlelik ana sonuç birlikte gösterilir.

## 5. Video/olgu ve konu dışı başlıklar
- [x] Video ve olgu kayıtları yalnızca başlık, dergi, tarih ve bağlantı ile listelenir.
- [x] Konu dışı başlıklar tek satır olarak listelenir; uzun listeler "Tümünü göster" ile açılır.
- [x] A grubu dergilerdeki kardiyak içerik ayrı "Kardiyak içerik (kapsam dışı)" bölümünde listelenir.
- [x] Tam metne erişilemeyen doğrudan kayıtlar kart yazılmadan ayrı blokta gösterilir.

## 6. Klinik araştırmalar tablosu
- [x] NCT numarası, kısa başlık, faz, durum, kayıt/sonuç tarihi, hedef örneklem, birincil sonlanım ve sponsor/ülke sütunları bulunur.
- [x] Mobilde tablo, etiketli satır bloklarına dönüşür; yatay kaydırma gerekmez.

## 7. Taranan kaynaklar ve erişilemeyenler
- [x] Taranan kaynaklar, erişilemeyen kaynaklar ve kayıt bulunmayan dergiler ayrı ayrı listelenir.
- [x] Dergi bazında kayıt sayıları açılır panelde verilir.

## 8. Filtreler ve arama
- [x] Konu etiketi ve ilgi sınıfı (Tümü / Doğrudan / Dolaylı) filtreleri çalışır; sonuç sayısı yazı ile gösterilir.
- [x] Başlık, dergi, PMID, DOI ve etiket üzerinden arama yapılır; filtre temizleme düğmesi vardır.

## 9. Sayı arşivi
- [x] Başlıktaki sayı seçicisinden geçmiş sayılara geçilir; seçim adres çubuğuna yansır (?sayi=YYYY-MM-DD).
- [x] Sayı içi bölümlere içindekiler listesinden atlanır (masaüstünde yan sütun, mobilde açılır liste).

## 10. Okunabilir tipografi ve duyarlı yerleşim
- [x] Gövde metni ölçülü satır uzunluğunda (yaklaşık 40rem) ve 1,7 satır aralığında serif tipografiyle verilir.
- [x] Mobilde tek sütun, masaüstünde içindekiler ile birlikte iki sütun düzen kullanılır.
- [x] İsteğe bağlı koyu mod vardır; tercih tarayıcıda saklanır.
- [x] Yazdırma için sade bir görünüm tanımlıdır.

## 11. Günlük üretim ve yayın
- [x] `pipeline/run_daily.sh` tarama protokolünü baştan sona çalıştırıp yeni sayıyı `content/issues/` altına yazar ve `content/index.json` dizinini günceller.
- [ ] Zamanlanmış görev her sabah boru hattını çalıştırır, sayıyı commit eder ve yayına alır.
- [ ] Yeni sayı yayımlandığında kısa bildirim gönderilir.

## 12. Doğrulama
- [x] Sayı üretiminden sonra kartlardaki sayılar kaynak özetle karşılaştırılır (`pipeline/verify_numbers.py`); uyuşmayan değerler düzeltilir.
- [x] Üretim derlemesi ve tip denetimi hatasız geçer.
