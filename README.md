# Göğüs Cerrahisi Literatür Takibi

Göğüs cerrahisi literatürünün günlük takibi için okuma odaklı, sade bir yayın sitesi. Her gün yeni bir "sayı" eklenir; sayı, tarama protokolünün çıktısını okunabilir bir düzene çevirir.

## Sayfa yapısı

Bir sayı şu bölümlerden oluşur:

1. **Genel bakış** — dönem, taranan kayıt sayısı, Doğrudan / Dolaylı / Konu dışı dağılımı, klinik araştırma sayısı.
2. **Doğrudan makaleler** — çalışma kartları; tasarım türüne (RCT → meta-analiz → kohort → olgu-kontrol → olgu serisi → klinik dışı), ardından konu etiketine göre sıralanır.
3. **Klinik araştırmalar** — ClinicalTrials.gov kayıtları, tablo halinde.
4. **Dolaylı makaleler** — başlık, dergi, PMID/DOI ve tek cümlelik ana sonuç.
5. **Video ve olgu başlıkları** — yalnızca başlık düzeyinde.
6. **Konu dışı başlıklar** ve **Kardiyak içerik (kapsam dışı)** — tek satır.
7. **Taranan kaynaklar** — erişilemeyen kaynaklar ve kayıt bulunmayan dergiler dahil.

## Teknoloji

Vite + React + TypeScript ile yazılmış statik bir site. Sunucu, veritabanı veya oturum yönetimi yok; içerik JSON dosyalarında durur ve derleme sırasında sayfaya gömülür. Sayı dosyaları tembel yüklenir, bu yüzden arşiv büyüdükçe ana paket ağırlaşmaz.

```
content/
  index.json            # sayı dizini (tarih, dönem, sayılar)
  issues/YYYY-MM-DD.json # sayı içeriği
src/
  App.tsx               # sayfa düzeni, filtreler, bölümler
  data.ts               # sayı dizini ve tembel yükleme
  types.ts              # veri şeması
  components/           # başlık, künye, filtreler, kart, tablo, kaynaklar
  styles.css            # tipografi ve duyarlı yerleşim
pipeline/               # günlük tarama ve sayı üretimi
```

## Sayı verisi

`content/issues/YYYY-MM-DD.json` tek bir sayıyı tanımlar. Başlıca alanlar:

| Alan | İçerik |
| --- | --- |
| `date`, `windowStart`, `windowEnd`, `periodLabel` | Sayı tarihi ve tarama dönemi |
| `stats` | Taranan kayıt, Doğrudan, Dolaylı, Konu dışı, klinik araştırma, dergi sayıları |
| `journals` | Dergi bazında kayıt sayıları (grup harfiyle) |
| `direct` | Çalışma kartları (başlık, künye, etiketler, özet, tasarım, örneklem, karşılaştırma, sonlanımlar, ana sonuç, takip, veri dönemi) |
| `trials` | NCT kayıtları |
| `indirect` | Dolaylı makaleler (tek cümlelik sonuç) |
| `videoCase`, `offTopic`, `cardiac`, `unavailable` | Yalnızca başlıkla listelenen kayıtlar |
| `sources` | Taranan, erişilemeyen kaynaklar ve kayıt bulunmayan dergiler |

Yeni bir sayı eklemek için dosyayı `content/issues/` altına koyup `content/index.json` dizinine bir satır eklemek yeterlidir; site bir sonraki derlemede sayıyı listeler.

## Günlük üretim

```bash
bash pipeline/run_daily.sh            # bugünün sayısı
bash pipeline/run_daily.sh 2026-11-23 # belirli bir tarih
```

Boru hattı sırasıyla: PubMed dergi taraması (58 derginin tüm ISSN'leri + `[edat]`), konu sorgusu, triyaj, ikinci geçiş sınıflandırma, çalışma kartı üretimi ve doğrulaması, ClinicalTrials.gov taraması, sayı dosyasının yazılması ve sayı doğrulaması. Ayrıntı ve tek tek adımlar için `pipeline/README.md`.

Dergi listesi `pipeline/dergi_listesi.csv` dosyasındadır; tarama bu listenin tek doğru kaynağı olduğunu varsayar.

## Geliştirme

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # dist/ altına statik çıktı
```

## İçerik ilkeleri

Kartlar yalnızca erişilen metne (özet veya açık erişimli tam metin) dayanır; sayılar kaynaktan aynen aktarılır, yuvarlanmaz. Kaynakta bulunmayan alan "belirtilmemiş" olarak bırakılır. Klinik öneri verilmez, hasta verisi işlenmez.
