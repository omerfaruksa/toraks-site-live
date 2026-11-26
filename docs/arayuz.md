# Arayüz kararları

24 Kasım 2026 sürümü. Sayfa tek akış: bölüm başlığı yok, kayıt türü kart üstünde etiket. Sayı üretimi ve hat tarafı için `docs/mimari.md`.

## 1. Sayfa düzeni

- Üstte yalnız başlık ve tarih seçici; istatistik şeridi ve giriş metni kaldırıldı.
- Altında tek akış: tarih yeniden eskiye sıralı kayıtlar. Aynı gün içinde tür sırası (doğrudan, olgu, video, yorum, klinik araştırma, dolaylı, liste dışı, kardiyak, erişilemedi), sonra başlık.
- Varsayılan görünüm son 24 saat. PubMed giriş tarihi bir gün geciktiği için sayı tarihinde çoğu gün kayıt olmuyor; son 24 saat, dünün girişlerini bugünün partisi sayar.
- Klinik araştırmalar tarih süzgecinden muaf: on beş günde bir tarandıkları için kayıt tarihleri son 24 saate düşmez, muafiyet olmadan akışta hiç görünmezlerdi.
- Sayfalama 20 kayıt; sayfa numarası süzgeç daralınca kendiliğinden sınırlanır.

## 2. Kart

Kapalı kart: tarih, tür etiketi, tasarım etiketi, Türkiye'den ve açık tam metin işaretleri; Türkçe başlık; varsa özgün başlık; dergi ve yazar; konu etiketleri; "Detayı gör" ve "Makaleye git".

Açık kart: özet paragrafı ve ikonlu satırlar (tasarım, örneklem, karşılaştırma, sonlanım, ana sonuç, takip, veri dönemi). Klinik araştırmada faz, durum, hedef kayıt, birincil sonlanım, sponsor. Liste dışı kayıtta ilgi ve kaynak.

Kurallar:

- Detayı olmayan kayıtta başlık düğme değil; tıklanacak bir şey varmış gibi görünmüyor.
- Aynı anda tek kart açık; akış içinde konum kaybolmuyor.
- `belirtilmemiş` dönen alan karta hiç yazılmıyor.
- Yorum, editöryal ve mektuplar "Yorum" etiketiyle olgudan ayrılıyor.

## 3. Süzgeçler

"Filtreler" düğmesi paneli açar. Panelde dört grup:

1. Tarih: son 24 saat, son 7 gün, tümü, özel aralık. Başlangıç bitişi geçerse diğer uç eşitlenir.
2. Tür: tümü ve dokuz tür; her çipte kayıt sayısı. Konu dışı varsayılan olarak kapalı.
3. Konu: on üç alan etiketi (dokuz anatomik alan, perioperatif bakım ve genel torasik cerrahi dahil).
4. Türkiye'den ve açık tam metin onay kutuları, sıfırlama.

Arama kutusu başlık, özgün başlık, yazar, dergi, etiket, özet ve not alanlarını kapsar; Türkçe karakter katlaması `src/search.ts` içinde. Girdi `useDeferredValue` ile ertelenir, yazma kilitlenmez.

## 4. Kaldırılanlar

- Bölüm başlıkları, içindekiler şeridi, "Kaynaklar ve detaylar" paneli.
- Okundu ve kaydet işaretleri, durum süzgeci, dışa aktarma düğmeleri.
- Kullanılmayan bileşenler (`StudyCard`, `Filters`, `Sources`, `IssueMap`, `SectionGroup`, `Highlight`, `TitleList`, `Trials`, `External`, `Hero`) ve `export.ts`.

Stil dosyası bu temizlikte 1.604 satırdan 639 satıra, üretim CSS'i 37,35 kB'den 14,37 kB'ye indi.

## 5. Erişilebilirlik ve mobil

- Gövde 16 px, kart başlığı 1,04 rem, satır etiketi 0,78 rem; gri metinlerde 4,5:1 üstü kontrast.
- Kart başlığı düğme olduğunda `aria-expanded` ve `aria-controls` taşır; içerik `dl` yapısında.
- "Kayıtlara geç" bağlantısı, `lang="tr"`, odak halkası korunuyor.
- Mobilde süzgeç çubuğu yapışkan değil, satır etiketleri tek sütuna iniyor, dokunma hedefleri 44 px üstünde.
- "En üste git" şeridi ilerleme çizgisi ve yüzde gösterir; mobilde alt kenara yayılır.

## 6. Ölçümler

| Ölçüm | Önce | Sonra |
|---|---|---|
| styles.css satır | 1.604 | 639 |
| Üretim CSS | 37,35 kB (7,64 kB gzip) | 14,37 kB (3,75 kB gzip) |
| Ana JS | 247,25 kB (77,61 kB gzip) | 247,42 kB (77,68 kB gzip) |
| 24 Kasım sayısı | 1.171 kayıt | 1.171 kayıt |
| Olgu ve video | 119 başlık (çevirisiz) | 47 kayıt, tamamı Türkçe başlıklı |
| Konu dışı | 836 | 908 (göğüs cerrahisi dışı olgular ve hayvan olguları eklendi) |

Ana JS boyutu değişmedi: sayı dosyaları tembel yükleniyor, en büyük parça 24 Kasım sayısı (544 kB ham, 146 kB gzip).

## 7. Bilinçli olarak yapılmayanlar

- Sonsuz kaydırma: 20 kayıtlık sayfalama konum kaybını önlüyor, tarayıcı içi bulmayı bozmuyor.
- Okundu ve kaydet işaretleri: kullanıcı isteğiyle kaldırıldı, tarayıcı deposundaki anahtarlar artık kullanılmıyor.
- Meslektaş notu alanı: hasta verisi işlenmemesi kuralı ve statik site mimarisi nedeniyle eklenmedi.
- Kurumsal tek tık tam metin: kurum vekil sunucusu tanımı gerektirir, alan adı ve kurum bilgisi olmadan yapılandırılamaz.
