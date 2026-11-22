# Göğüs Cerrahisi Literatür Takibi

Göğüs cerrahisi literatürünün günlük takibi için okuma odaklı, sade bir yayın sitesi. Her gün yeni bir "sayı" eklenir; sayı, tarama protokolünün çıktısını okunabilir bir düzene çevirir.

## Sayfa yapısı

Bir sayı şu bölümlerden oluşur:

1. **Genel bakış** — dönem, taranan kayıt sayısı, Doğrudan / Dolaylı / Konu dışı dağılımı, klinik araştırma sayısı.
2. **Doğrudan makaleler** — çalışma kartları; tasarım türüne (RCT → meta-analiz → kohort → olgu-kontrol → olgu serisi → klinik dışı), ardından konu etiketine göre sıralanır. Her kartta yazarlar ve kurumlar bulunur.
3. **Türkiye'den** — yazar veya kurum bilgisinde Türkiye'deki bir kurum geçen doğrudan makaleler; tasarım gruplarında tekrarlanmaz. Filtre çubuğunda ayrı bir çipi vardır.
4. **PubMed dışı kaynaklar** — Crossref DOI kayıtları ve dergi RSS akışlarından gelen, PubMed taramasına girmeyen kayıtlar; başlık düzeyinde, Türkçe başlıkla listelenir.
5. **Klinik araştırmalar** — ClinicalTrials.gov kayıtları, tablo halinde.
6. **Dolaylı makaleler** — başlık, dergi, PMID/DOI ve tek cümlelik ana sonuç.
7. **Video ve olgu başlıkları** — yalnızca başlık düzeyinde.
8. **Konu dışı başlıklar** ve **Kardiyak içerik (kapsam dışı)** — tek satır.
9. **Kaynaklar ve detaylar** — ayrı sayfada (`/?sayi=YYYY-MM-DD&sayfa=kaynaklar`): tarama özeti, sayılar, taranan ve erişilemeyen kaynaklar, kayıt bulunmayan dergiler ve dergi kapsama tablosu (bu sayı, son 30 gün, son giriş tarihi, kaynak, durum). Ana sayfadaki künyeden yeni sekmede açılır.

Ana sayfada içindekiler yalnızca okuma bölümlerini listeler (Doğrudan makaleler, Türkiye'den, Dolaylı makaleler). Klinik araştırmalar, PubMed dışı kaynaklar, video ve olgu, kardiyak içerik ve konu dışı listeleri filtre çubuğundaki "Bölüm" seçicisinden açılır; bu bölümler varsayılan olarak kapalıdır.

Filtre çubuğu sırasıyla konu etiketi, çalışma kapsamı (tek merkezli / çok merkezli / multidisipliner / uluslararası), ortak branş ve bölüm seçicisini içerir. Kapsam ve branş etiketleri PubMed kurum satırları ile kart metninden türetilir; kaynakta bulunmayan bilgi etiketlenmez.

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
| `direct` | Çalışma kartları (başlık, künye, etiketler, özet, tasarım, örneklem, karşılaştırma, sonlanımlar, ana sonuç, takip, veri dönemi, yazarlar, kurumlar, Türkiye işareti, kapsam, branşlar, uluslararası bayrağı) |
| `trials` | NCT kayıtları |
| `indirect` | Dolaylı makaleler (tek cümlelik sonuç) |
| `videoCase`, `offTopic`, `cardiac`, `unavailable` | Yalnızca başlıkla listelenen kayıtlar |
| `external` | PubMed dışı kaynaklardan gelen kayıtlar (Türkçe ve orijinal başlık, dergi, tarih, DOI, yazarlar, kurumlar, ilgi sınıfı) |
| `coverage` | 58 dergi için kapsama tablosu: bu sayı, son 30 gün, son giriş tarihi, kaynak, durum |
| `sources` | Taranan, erişilemeyen kaynaklar ve kayıt bulunmayan dergiler |

Yeni bir sayı eklemek için dosyayı `content/issues/` altına koyup `content/index.json` dizinine bir satır eklemek yeterlidir; site bir sonraki derlemede sayıyı listeler.

## Günlük üretim

```bash
bash pipeline/run_daily.sh            # bugünün sayısı
bash pipeline/run_daily.sh 2026-11-23 # belirli bir tarih
```

Boru hattı sırasıyla: PubMed dergi taraması (58 derginin tüm ISSN'leri + `[edat]`), konu sorgusu, triyaj, ikinci geçiş sınıflandırma, çalışma kartı üretimi ve doğrulaması, ClinicalTrials.gov taraması, Crossref/RSS ile PubMed dışı kaynak toplama ve sınıflandırma, sayı dosyasının yazılması, yazar/kurum zenginleştirme, dış kayıtların eklenmesi, kapsama tablosu ve sayı doğrulaması. Ayrıntı ve tek tek adımlar için `pipeline/README.md`.

Dergi listesi `pipeline/dergi_listesi.csv` dosyasındadır; tarama bu listenin tek doğru kaynağı olduğunu varsayar.

## Geliştirme

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # dist/ altına statik çıktı
```

## İçerik ilkeleri

Kartlar yalnızca erişilen metne (özet veya açık erişimli tam metin) dayanır; sayılar kaynaktan aynen aktarılır, yuvarlanmaz. Kaynakta bulunmayan alan "belirtilmemiş" olarak bırakılır. Klinik öneri verilmez, hasta verisi işlenmez.
