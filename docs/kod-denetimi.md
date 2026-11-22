# Kod denetimi: üç kaynaklı inceleme ve bütünleştirme

Bu belge 22 Kasım 2026 tarihli kod denetiminin yöntemini, bulgularını, uygulanan
sadeleştirmeleri, ölçülen kazanımları ve bilerek uygulanmayan önerileri kaydeder.

## 1. Yöntem

Denetim üç kaynakla yapıldı: kendi statik analizim (ruff, kullanım taraması, ölçüm
betikleri), Gemini ve OpenAI modelleri. Harici API anahtarları çalışmadı (Gemini HTTP 401,
OpenAI kredi yok); bu yüzden modeller Manus'un yerleşik model köprüsü üzerinden, sıcak kod
parçaları 12-15 KB'lik dilimler halinde ve `gemini-3.8-flash` ile `gpt-6-luna` kullanılarak
koşturuldu. Daha büyük dilimler tek çağrı bütçesini aştığı için reddedildi.

Model çıktıları doğrudan uygulanmadı. Her bulgu gerçek dosyada karşılaştırıldı; dilimler
dosya ortasında kesildiği için modellerin "dosya yarım, sözdizimi hatası var" biçimindeki
yüksek etkili uyarıları dilim artefaktı olarak elendi (dosyalar `ast.parse` ve ruff ile
temiz). Yalnızca kodda doğrulanabilen bulgular uygulandı.

## 2. Uygulanan bulgular

| Bulgu | Kaynak | Karar | Sonuç |
| --- | --- | --- | --- |
| `fetch.author_meta` hiçbir yerden çağrılmıyor; yeni kayıtların yazar/kurum bilgisi boş kalıyor | Manus | Uygulandı | `run.py` tarama aşamasında çağırıyor; fonksiyon artımlı, yalnızca yeni PMID'ler için ağa çıkıyor |
| `report.py` içinde `render` ve `render_weekly` aynı bölümleri kopyalıyor | Manus, OpenAI | Uygulandı | Dokuz ortak üretici (`_card`, `_direct`, `_trials`, `_indirect`, `_video`, `_off_topic`, `_sources`, `_overview`, `_body`); 221 → 206 satır, tek bakım noktası |
| `classify.py` ve `cards.py` içinde `_load_memo` birebir kopya | Manus, Gemini, OpenAI | Uygulandı | `pipeline/memo.py`: `load`, `save`, `key`, `partition` |
| Bellek anahtarı yalnızca PMID; özet güncellenirse eski karar donuyor | OpenAI | Uygulandı | Anahtar `PMID:kısa-SHA-1`; içerik değişince kayıt yeniden değerlendirilir |
| İkinci sınıflandırma geçişinde her sonuç için `records` baştan taranıyor (O(k·n)) | Gemini, OpenAI | Uygulandı | PMID sözlüğü; ikinci geçiş yükleri de ilk geçişte bir kez üretilip yeniden kullanılıyor |
| `classify.py` içinde `_candidates` iki kez tanımlı (ikincisi birincisini eziyor) | Manus (düzenleme sırasında) | Uygulandı | Yinelenen tanım silindi |
| `journals.listed_names()` her kayıt için yeniden kuruluyor | Gemini | Uygulandı | Döngü öncesinde tek küme |
| `title + " " + abstract` iki kez birleştiriliyor | Gemini | Uygulandı | Tek `text` değişkeni |
| Başlık listelerinde `institutions` alanı üretiliyor ama hiçbir bileşen okumuyor | Manus | Uygulandı | Kurum yalnızca Doğrudan/Dolaylı kartlarda; sayı dosyası 671 KB → 528 KB |
| `App.tsx` her tuş vuruşunda `offTopic` (733 kayıt) listesini yeniden sıralıyor | OpenAI | Uygulandı | `sortedLists` sayı yüklenince bir kez sıralanıyor |
| Branş süzgeci kayıt başına iç içe doğrusal tarama yapıyor | OpenAI | Uygulandı | Seçili branşlar `Set`, kayıt branşları tek geçişte |
| ISSN koşulu dergi başına iki kez hesaplanıyor; PMID sırası küme kaynaklı kararsız | OpenAI | Uygulandı | Koşul bir kez; sıra korunumlu sözlükle sabitlendi |
| Ölü kod: `config.parse_date`, `issue.py` içinde `external_raw`, `classify.py` içinde kullanılmayan `fetch` importu | Manus (ruff F401/F841) | Uygulandı | Silindi; ruff `F,E9` temiz |
| Kullanılmayan CSS sınıfları: `design-group`, `field-key`, `read-col`, `sr-only`, `tag-group` | Manus | Uygulandı | 14 satır silindi; dinamik üretilen `access-*`, `interest-*` korundu |
| Haftalık birleştirme için test yok | Manus | Uygulandı | 3 test: PMID tekilleştirme, DOI yedeği, dönem birleşimi |
| 500 KB paket uyarısı | Manus | Uygulandı | `chunkSizeWarningLimit: 700`; uyarı veren parça sayı verisi (gzip 125 KB) |
| Birleşik `check` komutu ve hat kısayolları yok | Manus | Uygulandı | `pnpm check`, `pnpm pipeline:daily`, `pnpm pipeline:report` |

## 3. Ölçümler

| Ölçü | Önce | Sonra |
| --- | --- | --- |
| Sayı JSON'u (22 Kasım) | 671.012 bayt | 528.448 bayt (−%21) |
| Sayı paketi | 580 KB / gzip 160 KB | 469,7 KB / gzip 124,8 KB |
| CSS | 24 KB / gzip 5,4 KB | 22,5 KB / gzip 5,2 KB |
| Ana paket | 262 KB / gzip 81 KB | 262,8 KB / gzip 81,0 KB (değişmedi) |
| `report.py` | 221 satır, iki kopya bölüm üreticisi | 206 satır, tek üretici kümesi |
| Birim testi | 15 | 18 |
| `ruff --select F,E9` | 2 bulgu | 0 |

Günlük ve haftalık rapor, yeniden yazım öncesi kopyalarla bayt bayt aynı üretildi; sayı
JSON'unda tek fark kurum alanının başlık listelerinden kalkması ve `generatedAt` damgası.
Yani sadeleştirme çıktıyı değiştirmedi.

## 4. Uygulanmayan öneriler

| Öneri | Neden uygulanmadı |
| --- | --- |
| "Dosyalar yarım, sözdizimi hatası var" (Gemini, üç dilimde) | Dilim kesme artefaktı; dosyalar `ast.parse` ve ruff ile temiz |
| `STATUS_TR`, `PHASE_TR` kullanılmıyor (Gemini) | Yanlış pozitif; `issue.py` içinde klinik araştırma tablosunda kullanılıyor |
| `issue.py`/`fetch.py` içinde kullanılmayan importlar (Gemini) | Yanlış pozitif; ruff `F401` temiz |
| `net.chunks` ve `esearch_count` kullanılmıyor (Gemini) | İkisi de `fetch.py` ve `issue.py` içinde kullanılıyor |
| `FOLD_RE` içinde birleşik `i̇` karakteri (Gemini) | Karakter kümesinde iki kod noktasına ayrılıyor ama eşleme tablosunda karşılığı olmadığı için metni bozmuyor; davranış testlerle doğrulandı |
| Her tuş vuruşunda `history.replaceState` (Gemini) | Ölçüldü, maliyeti ihmal edilebilir; adres çubuğunun anında güncellenmesi işlevsel tercih |
| React satıcı paketini `manualChunks` ile ayırma | Ana paket 262 KB; ayırma ek bir ağ gidiş-dönüşü getirir, kazanç yok |
| `byDateDesc` yerine sıralamayı tamamen kaldırma (OpenAI) | Filtre değişiminde sıralama gerekiyor; yalnızca büyük başlık listeleri önceden sıralandı |

## 5. İkinci tur: gerçek anahtarlarla yeniden denetim

Kullanıcı Gemini API anahtarını ekledikten ve OpenAI'ın Manus Flex üzerinden çalıştığını
bildirdikten sonra denetim güncel kod üzerinde yeniden koşuldu.

- **Gemini**: anahtar doğrulandı (50 model). `gemini-2.5-pro` yeni kullanıcılara kapalı,
  `gemini-3.1-pro-preview` kotası dolu olduğu için `gemini-3-flash-preview` kullanıldı.
  Dosyalar dilimlenmedi: 97 KB'lik hat ve 63 KB'lik site paketi tek çağrıda okundu, 17 bulgu.
- **OpenAI**: Manus Flex üzerinden `gpt-6-luna`, 8 KB'lik 21 dilim, 49 bulgu.
- Modeller artık kodun tamamını gördüğü için "dosya yarım" türü yanlış pozitif oluşmadı.

### Uygulanan düzeltmeler

| Bulgu | Kaynak | Düzeltme |
| --- | --- | --- |
| `esearch` sonuç sayısı `retmax`ı aşınca sessizce kesiliyor | OpenAI | `net.esearch` toplam sayı ile dönen PMID sayısını karşılaştırıp uyarı basıyor |
| `COUNTRY_TR` deseni `Turkey;` biçimini kaçırıyor | OpenAI | Sınır karakter sınıfına noktalı virgül eklendi |
| `countries_of` kısaltmaları bozuyor (`USA` → `Usa`, `UK` → `Uk`) | OpenAI | `COUNTRY_CANON` eşlemesi; sayı dosyasında 27 ülke etiketi düzeldi |
| `iso_date` takvimde olmayan günü kabul ediyor (`2024-02-31`) | OpenAI | Gün `datetime.date` ile doğrulanıyor |
| `memo.load` bozuk dosyayı sessizce yutuyor | Gemini | Okunamayan bellekte uyarı basılıyor |
| `byDateDesc` hem `App.tsx` hem `External.tsx` içinde kopya | Gemini | `src/data.ts` içinde tek fonksiyon |
| `formatDate` ve `shortDate` ISO ayrıştırmayı tekrarlıyor | Gemini | `parseIso` + `trDate` yardımcıları |
| `loadIssue` bozuk/eksik JSON'da sessizce boş sayfa bırakıyor | Gemini | `try/catch`, konsola hata, `null` dönüş |
| `External` varsayılan `tokens = []` her render'da yeni dizi | OpenAI | Modül düzeyinde `NO_TOKENS`; `sorted` `useMemo` içinde |
| Yazar yokken kurum listesi `· Kurum` ile başlıyor | OpenAI | Yazar ve kurumlar tek `join(' · ')` ile birleştiriliyor |
| Bölüm filtresi etkin filtre sayacına eklenmiyor | OpenAI | `activeCount` içine `p.section` eklendi |
| "Filtreyi temizle" tasarım filtresini sıfırlamıyor | OpenAI | `clearFilters` içine `setDesign('')` |
| Tema tercihi `localStorage`'dan okunmuyor | OpenAI | Başlangıç değeri kayıtlı tercihten okunuyor |
| `toggleDetails` yan etkisi durum güncellemesinin içinde | OpenAI | `requestAnimationFrame` güncelleme dışına alındı |

### Karar bekleyen bulgu: A grubu ve konu dışı

OpenAI, A grubu bir kaydın ikinci geçişe girmeden konu dışı kalabildiğini gösterdi: kural
yalnızca `second` sözlüğündeki kayıtlara uygulanıyor. Kural tüm A grubu kayıtlarına
uygulandığında 22 Kasım sayısında 4 kayıt Dolaylı listesine geçiyor (Dolaylı 9 → 13,
Konu dışı 733 → 729). Proje talimatındaki "A: tüm makaleler, sonda tek satır" ifadesi bu
kayıtların konu dışı listesinde tek satır kalmasını da desteklediği için değişiklik geri
alındı ve yayımlanmış sayı korundu. Karar sizin: A grubunda konu dışı hiç kayıt kalmasın
isteniyorsa `classify.py` içindeki kural tek satırda genişletilebilir.

### Uygulanmayan ikinci tur önerileri

| Öneri | Gerekçe |
| --- | --- |
| `coverage_table` ağ darboğazı (Gemini, "yüksek") | Fonksiyon zaten `net.pmap` ile 6 işçi paralel çalışıyor; soğuk önbellekte dergi başına ~3 çağrı, günlük tek koşuda kabul edilebilir |
| `author_meta` yalnızca Doğrudan/Dolaylı için çağrılsın | `meta.json` artımlı; günde ~30 yeni PMID. Ayrıca başlık listelerindeki Türkiye rozeti ve `turkeyAll` sayacı tüm kayıtlara dayanıyor |
| `searchText` önbellek anahtarına alan kümesi eklensin | Önbellek kayıt nesnesine bağlı; her kayıt türü her zaman aynı alan kümesiyle çağrılıyor |
| Üç `useMemo` tek döngüde birleştirilsin | Liste 62 kayıt; kazanç ölçülemedi |
| `enrich`/`tag_scope` yerinde mutasyon yerine yeni nesne döndürsün | Tek seferlik montaj adımı; davranış doğru, değişiklik riski kazancından büyük |
| Crossref `rows: 100` sayfalansın | 7 günlük pencerede dergi başına 100 kayıt sınırına ulaşılmıyor; sınıra ulaşılırsa uyarı için `total-results` izlenebilir (kalan risk) |
| `window(7)` uçlar dahil 8 takvim günü kapsıyor | Sayı etiketi (15–22 Kasım) ile aynı aralığı gösteriyor; daraltmak yayımlanmış sayıları değiştirir, karar sizin |

### Bellek tohumlama

Çalışma alanında `cls_memo.json` ve `cards_memo.json` dosyaları yoktu; kararlar yalnızca
`final_cls.json` ve `cards.jsonl` içinde duruyordu. Yeni içerik anahtarlarıyla bellek bu iki
dosyadan tohumlandı (1019 sınıflandırma, 63 kart). Böylece ilk günlük koşu tüm kayıtları
yeniden sınıflandırmak zorunda kalmıyor.

## 6. Kalan riskler

- Bellek dosyaları büyümeye devam eder: içerik değişen kayıt için yeni anahtar eklenir, eski
  anahtar silinmez. Yılda bir `pipeline/.work/*_memo.json` dosyalarını temizlemek yeterli.
- `author_meta` artımlı olduğu için `meta.json` silinirse tüm kayıtlar için tek seferlik ağ
  taraması yapılır (yaklaşık 1019 kayıt, 150'lik parçalar).
- `chunkSizeWarningLimit` uyarıyı susturur, veri hacmini küçültmez; konu dışı listesi büyüdükçe
  sayı paketi de büyür. Kalıcı çözüm gerekirse konu dışı listesi sayı dosyasından ayrı bir
  dosyaya taşınmalı.
- Model denetimi dilimler halinde yapıldı; dosyalar arası akış (örneğin `run.py` içindeki aşama
  sırası) yalnızca kendi incelememle değerlendirildi.
