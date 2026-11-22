# Göğüs Cerrahisi Literatür Takibi

Göğüs cerrahisi literatürünün günlük takibi için okuma odaklı, sade bir yayın sitesi. Her gün yeni bir "sayı" eklenir; sayı, tarama protokolünün çıktısını okunabilir bir düzene çevirir.

## Sayfa yapısı

Bir sayı şu bölümlerden oluşur:

1. **Çalışma kartları (Doğrudan makaleler)** — tasarım türüne (RCT → meta-analiz → kohort → olgu-kontrol → olgu serisi → klinik dışı) göre gruplanır ve her grup içinde en yeni giriş en üstte olacak şekilde tarihe göre sıralanır. Her kartta yazarlar ve kurumlar bulunur.
2. **PubMed dışı kaynaklar** — Crossref DOI kayıtları ve dergi RSS akışlarından gelen, PubMed taramasına girmeyen kayıtlar; başlık düzeyinde, Türkçe başlıkla listelenir.
3. **Klinik araştırmalar** — ClinicalTrials.gov kayıtları, tablo halinde.
4. **Dolaylı makaleler** — başlık, dergi, PMID/DOI ve tek cümlelik ana sonuç.
5. **Video ve olgu başlıkları** — yalnızca başlık düzeyinde.
6. **Konu dışı başlıklar** ve **Kardiyak içerik (kapsam dışı)** — tek satır.
7. **Kaynaklar ve detaylar** — üst çubuktaki "Kaynaklar" düğmesine basınca sayfa içinde açılan panel: genel bakış (dönem, taranan kayıt, Doğrudan / Dolaylı / Konu dışı dağılımı, klinik araştırma sayısı), tarama özeti, taranan ve erişilemeyen kaynaklar, kayıt bulunmayan dergiler ve dergi kapsama tablosu (bu sayı, son 30 gün, son giriş tarihi, kaynak, durum). Panelin altındaki "Kapat" düğmesi ya da üst çubuktaki düğme ile kapanır; adres çubuğu `sayfa=kaynaklar` parametresiyle panelin durumunu korur, böylece eski bağlantılar panel açık şekilde çalışır. Panelin içinde dergi listeleri ve kapsama tablosu için arama kutusu ile durum çipleri (Tümü / Bu sayıda kayıt var / Bu sayıda kayıt yok / PubMed'de yok) bulunur; sayaç satırı "Kayıtlı dergi 34/34 · Taranan dergi 58/58" biçiminde iki farklı kümeyi ayrı adlandırır, "Filtreyi temizle" düğmesini taşır ve süzgeç ilk kez devreye girdiğinde iki katlanır liste açılır. "Bu sayıda kayıt yok" ve "PubMed'de yok" süzgeçlerinde kayıt listesi tanımı gereği boş kaldığı için gizlenir, yalnızca kapsama tablosu sayılır.

Ana sayfada künye, ayrı bir içindekiler sütunu ve bölüm başlıkları yoktur; sayfa doğrudan üst çubukla başlar ve okuma bölümleri kesintisiz akar. Çalışma kartları ile dolaylı liste arasında yalnızca ince bir ayırıcı çizgi bulunur; kart grubu başlıkları da görünmez, grup sırası ekran okuyucu için `aria-label` ile korunur. Bölüm seçimi filtre panelindeki "Bölüm" satırından yapılır: klinik araştırmalar, PubMed dışı kaynaklar, video ve olgu, kardiyak içerik ve konu dışı listeler varsayılan olarak kapalıdır, seçilince açılır. Türkiye'deki bir kurum veya yazarın yer aldığı makaleler ayrı bir blok oluşturmaz; kart üzerindeki "Türkiye'den" rozeti ve filtre çubuğundaki çip ile işaretlenir. Üst çubuk mobilde iki satıra ayrılır: ilk satırda site adı, ikinci satırda "Kaynaklar", sayı seçici ve tema düğmesi.

Filtre çubuğu varsayılan olarak kompakt: yalnızca arama kutusu ve "Filtreler" düğmesi görünür; düğme açılınca ilgi sınıfı, "Türkiye'den", konu etiketi, çalışma kapsamı (tek merkezli / çok merkezli / multidisipliner / uluslararası), ortak branş ve bölüm seçicisi tek panelde toplanır. Etkin filtre sayısı düğmede rozet olarak görünür; panel kapalıyken eşleşme sayısı ve "Filtreyi temizle" satırı kalır. Tüm listeler (doğrudan kartlar, dolaylı kayıtlar, başlık listeleri, PubMed dışı kayıtlar) tarihe göre yeniden eskiye sıralanır. Kapsam ve branş etiketleri PubMed kurum satırları ile kart metninden türetilir; kaynakta bulunmayan bilgi etiketlenmez.

Arama, Türkçe ve İngilizce başlıkların karışık olduğu metinde harf eşleşmesini kaçırmamak için katlanmış metin üzerinde çalışır: büyük/küçük harf, Türkçe I/ı/İ/i ayrımı ve aksanlar (ö→o, ğ→g, ü→u, ş→s, ç→c, ı→i) eşitlenir; "gogus" araması "Göğüs" kaydını bulur. Sorgu boşlukla terimlere bölünür ve tüm terimlerin geçmesi gerekir (VE mantığı); tırnak içindeki ifade tek terim sayılır ("toraks travması") ve kelimelerin yan yana gelmesi istenir. Eşleşen yerler kart ve liste başlıklarında `<mark>` ile işaretlenir. Arama yalnızca doğrudan ve dolaylı listeleri değil, video/olgu, kardiyak, konu dışı, erişilemeyen ve PubMed dışı kaynak listelerini de süzer. Kayıtların aranabilir metni nesne başına bir kez hesaplanıp önbelleğe alınır, sorgu ise `useDeferredValue` ile ertelenir; böylece yazarken liste süzme maliyeti kayıt sayısıyla doğrusal artsa da tuş başına yeniden metin kurma yükü oluşmaz. Birim testleri: `pnpm test:search`.

Filtre durumu adres çubuğuna yazılır (`q`, `konu`, `ilgi`, `tr`, `kapsam`, `cok`, `ulus`, `brans`, `bolum`); böylece süzülmüş görünüm paylaşılabilir, sayfa yenilendiğinde korunur ve geri/ileri tuşlarıyla geri yüklenir. Sayı değiştirildiğinde filtreler sıfırlanır. Kaynaklar panelindeki iki katlanır liste, süzgeç ilk kez devreye girdiğinde açılır; sonrasında kullanıcı kapatabilir ve yazmaya devam etse de kapalı kalır. Sayı seçici ay bazında gruplanır.

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
  components/           # üst çubuk, filtreler, kart, tablo, kaynaklar
  styles.css            # tipografi ve duyarlı yerleşim
pipeline/               # günlük tarama ve sayı üretimi
```

## Sayı verisi

`content/issues/YYYY-MM-DD.json` tek bir sayıyı tanımlar. Başlıca alanlar:

| Alan | İçerik |
| --- | --- |
| `date`, `cadence`, `windowStart`, `windowEnd`, `periodLabel` | Sayı tarihi, kadans (weekly) ve tarama dönemi |
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

## Haftalık üretim

```bash
bash pipeline/run_daily.sh                  # günlük sayı, yuvarlanan son 7 gün
bash pipeline/run_daily.sh --date 2026-11-28
bash pipeline/run_weekly_report.sh          # son 7 günlük sayıyı birleştiren haftalık rapor
python3 pipeline/run.py --stages issue --report   # yalnızca montaj + rapor
pnpm test:pipeline                          # kural testleri
```

Hat tek giriş noktasından (`pipeline/run.py`) çalışır: PubMed dergi taraması (tüm ISSN'ler + `[edat]`), konu sorgusu, iki geçişli sınıflandırma, çalışma kartı üretimi ve sayı denetimi, ClinicalTrials.gov, Crossref/RSS ile PubMed dışı kaynaklar, tek geçişte atomik sayı montajı ve aynı veriden üretilen haftalık Markdown raporu (`content/reports/`). Ayrıntı, darboğaz tablosu ve doğrulama notları için `pipeline/README.md`.

Dergi listesi `pipeline/dergi_listesi.csv` dosyasındadır; tarama bu listenin tek doğru kaynağı olduğunu varsayar.

## Geliştirme

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # dist/ altına statik çıktı
```

## İçerik ilkeleri

Kartlar yalnızca erişilen metne (özet veya açık erişimli tam metin) dayanır; sayılar kaynaktan aynen aktarılır, yuvarlanmaz. Kaynakta bulunmayan alan "belirtilmemiş" olarak bırakılır. Klinik öneri verilmez, hasta verisi işlenmez.
