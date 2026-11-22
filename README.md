# Göğüs Cerrahisi Literatür Takibi

Göğüs cerrahisi literatürünün günlük takibi için okuma odaklı, sade bir yayın sitesi. Her gün yeni bir "sayı" eklenir; sayı, tarama protokolünün çıktısını okunabilir bir düzene çevirir.

## Sayfa yapısı

Bir sayı şu bölümlerden oluşur:

1. **Genel bakış** — dönem, taranan kayıt sayısı, Doğrudan / Dolaylı / Konu dışı dağılımı, klinik araştırma sayısı.
2. **Doğrudan makaleler** — çalışma kartları; tasarım türüne (RCT → meta-analiz → kohort → olgu-kontrol → olgu serisi → klinik dışı) göre gruplanır ve her grup içinde en yeni giriş en üstte olacak şekilde tarihe göre sıralanır. Her kartta yazarlar ve kurumlar bulunur.
3. **PubMed dışı kaynaklar** — Crossref DOI kayıtları ve dergi RSS akışlarından gelen, PubMed taramasına girmeyen kayıtlar; başlık düzeyinde, Türkçe başlıkla listelenir.
4. **Klinik araştırmalar** — ClinicalTrials.gov kayıtları, tablo halinde.
5. **Dolaylı makaleler** — başlık, dergi, PMID/DOI ve tek cümlelik ana sonuç.
6. **Video ve olgu başlıkları** — yalnızca başlık düzeyinde.
7. **Konu dışı başlıklar** ve **Kardiyak içerik (kapsam dışı)** — tek satır.
8. **Kaynaklar ve detaylar** — ana sayfada künyedeki "Kaynaklar ve detaylar" düğmesine basınca sayfa içinde açılan panel: tarama özeti, sayılar, taranan ve erişilemeyen kaynaklar, kayıt bulunmayan dergiler ve dergi kapsama tablosu (bu sayı, son 30 gün, son giriş tarihi, kaynak, durum). Panelin altındaki "Kapat" düğmesi ya da künyedeki düğme ile kapanır; adres çubuğu `sayfa=kaynaklar` parametresiyle panelin durumunu korur, böylece eski bağlantılar panel açık şekilde çalışır. Panelin içinde dergi listeleri ve kapsama tablosu için arama kutusu ile durum çipleri (Tümü / Bu sayıda kayıt var / Bu sayıda kayıt yok / PubMed'de yok) bulunur; eşleşme sayısı ve "Filtreyi temizle" satırı hemen altında görünür, filtre etkinken iki katlanır liste kendiliğinden açılır. "Bu sayıda kayıt yok" ve "PubMed'de yok" süzgeçlerinde kayıt listesi tanımı gereği boş kaldığı için gizlenir, yalnızca kapsama tablosu sayılır.

Ana sayfada ayrı bir içindekiler sütunu yoktur; okuma bölümleri doğrudan akışta yer alır. Bölüm seçimi filtre panelindeki "Bölüm" satırından yapılır: klinik araştırmalar, PubMed dışı kaynaklar, video ve olgu, kardiyak içerik ve konu dışı listeler varsayılan olarak kapalıdır, seçilince açılır. Türkiye'deki bir kurum veya yazarın yer aldığı makaleler ayrı bir blok oluşturmaz; kart üzerindeki "Türkiye'den" rozeti ve filtre çubuğundaki çip ile işaretlenir.

Filtre çubuğu varsayılan olarak kompakt: yalnızca arama kutusu ve "Filtreler" düğmesi görünür; düğme açılınca ilgi sınıfı, "Türkiye'den", konu etiketi, çalışma kapsamı (tek merkezli / çok merkezli / multidisipliner / uluslararası), ortak branş ve bölüm seçicisi tek panelde toplanır. Etkin filtre sayısı düğmede rozet olarak görünür; panel kapalıyken eşleşme sayısı ve "Filtreyi temizle" satırı kalır. Tüm listeler (doğrudan kartlar, dolaylı kayıtlar, başlık listeleri, PubMed dışı kayıtlar) tarihe göre yeniden eskiye sıralanır. Kapsam ve branş etiketleri PubMed kurum satırları ile kart metninden türetilir; kaynakta bulunmayan bilgi etiketlenmez.

Arama, Türkçe ve İngilizce başlıkların karışık olduğu metinde harf eşleşmesini kaçırmamak için katlanmış metin üzerinde çalışır: büyük/küçük harf, Türkçe I/ı/İ/i ayrımı ve aksanlar (ö→o, ğ→g, ü→u, ş→s, ç→c, ı→i) eşitlenir; "gogus" araması "Göğüs" kaydını bulur. Sorgu boşlukla terimlere bölünür ve tüm terimlerin geçmesi gerekir (VE mantığı). Kayıtların aranabilir metni nesne başına bir kez hesaplanıp önbelleğe alınır, sorgu ise `useDeferredValue` ile ertelenir; böylece yazarken liste süzme maliyeti kayıt sayısıyla doğrusal artsa da tuş başına yeniden metin kurma yükü oluşmaz. Birim testleri: `pnpm test:search`.

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
| `indirect[].entryDate` | Dolaylı kaydın PubMed'e giriş tarihi ([edat]); liste bu alana göre sıralanır |
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
