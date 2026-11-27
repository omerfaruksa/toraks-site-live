# Göğüs Cerrahisi Literatür Takibi

Göğüs cerrahisi literatürünün günlük takibi için okuma odaklı, sade bir yayın sitesi. Her gün yeni bir "sayı" eklenir; sayı, tarama protokolünün çıktısını okunabilir bir düzene çevirir.

Yayın adresleri: `https://toraks.manus.space/` (Manus) ve `https://omerfaruksa.github.io/toraks-site-live/` (GitHub Pages). GitHub Pages, `main` dalına her itmede GitHub Actions ile yayımlanır; Manus'tan üretilen içeriklerin GitHub'a otomatik aktarımı henüz kurulmamıştır. Manus API'deki son dosyaları güvenli biçimde yerelde listelemek için `MANUS_API_KEY` ortam değişkenini tanımlayıp `python3 tools/manus_artifacts.py` çalıştırın. Ayrıntı `docs/yayin.md`.

## Sayfa yapısı

Sayfa tek akış: bölüm başlığı yok, kayıt türü kart üstünde etiket olarak duruyor.

- Üstte yalnız başlık ve tarih seçici; istatistik şeridi ve giriş metni yok.
- Altında tarih yeniden eskiye sıralı kayıtlar. Aynı gün içinde tür sırası: doğrudan, olgu, video, yorum, klinik araştırma, dolaylı, liste dışı, kardiyak, erişilemedi.
- Varsayılan görünüm son 24 saat. PubMed giriş tarihi bir gün geciktiği için sayı tarihinde çoğu gün kayıt olmuyor; son 24 saat, dünün girişlerini bugünün partisi sayar.
- Klinik araştırmalar on beş günde bir tarandığı için tarih süzgecinden muaf tutulur; kayıt tarihleri son 24 saate düşmediğinden aksi hâlde akışta hiç görünmezlerdi.
- Sayfalama 20 kayıt; süzgeç daralınca sayfa numarası kendiliğinden sınırlanır.

Kart kapalıyken tarih, tür ve tasarım etiketi, "Türkiye'den" ve "Açık tam metin" işaretleri, Türkçe başlık, varsa özgün başlık, dergi, yazar, konu etiketleri, "Detayı gör" ve "Makaleye git" görünür. Tıklanınca özet paragrafı ve ikonlu satırlar açılır: tasarım, örneklem, karşılaştırma, sonlanım, ana sonuç, takip, veri dönemi. Klinik araştırmada faz, durum, hedef kayıt, birincil sonlanım ve sponsor; liste dışı kayıtta ilgi sınıfı ve kaynak. Aynı anda tek kart açık kalır. Detayı olmayan kayıtta başlık düğme değildir, `belirtilmemiş` dönen alan karta hiç yazılmaz.

Olgu, vaka bildirimi ve videolar akışın içinde; Türkçe başlık ve iki cümlelik tanıtım `pipeline/briefs.py` tarafından üretilir. Editöryal, yorum ve mektuplar "Yorum" etiketiyle ayrılır. Göğüs cerrahisi dışı olgu bildirimleri ve hayvan hastası olgular konu dışına atılır.

Filtreler "Filtreler" düğmesinin arkasında: tarih (son 24 saat, son 7 gün, tümü, özel aralık), tür (dokuz tür, sayılarıyla), konu (on üç alan etiketi), Türkiye'den ve açık tam metin onay kutuları, sıfırlama. Konu dışı türü varsayılan olarak kapalı.

Arama, Türkçe ve İngilizce başlıkların karışık olduğu metinde harf eşleşmesini kaçırmamak için katlanmış metin üzerinde çalışır: büyük/küçük harf, Türkçe I/ı/İ/i ayrımı ve aksanlar eşitlenir; "gogus" araması "Göğüs" kaydını bulur. Sorgu boşlukla terimlere bölünür, tüm terimlerin geçmesi gerekir; tırnak içindeki ifade tek terim sayılır. Kart metni sayı yüklenirken bir kez katlanır (`composeSearchText`), sorgu da aynı katlamadan geçer; böylece tuş başına yeniden katlama yapılmaz. Arama başlık, özgün başlık, yazar, dergi, etiket, özet ve not alanlarını kapsar; girdi `useDeferredValue` ile ertelenir. Birim testleri: `pnpm test:search`.

## Okuma araçları

Site tek kullanıcılı bir okuma aracı; sunucu, oturum veya hesap yok.

- **Tema.** Düğme üç durumu dolaşır: sistem, koyu, açık. Tercih yoksa sistem teması izlenir ve işletim sistemi teması değişince sayfa kendiliğinden uyar (`src/prefs.ts`).
- **Klavye.** `/` arama alanına odaklanır, `Esc` filtreleri temizler.
- **Bağlantı kopyalama.** Kart altındaki "Bağlantı" düğmesi makale adresini panoya kopyalar.
- **Erişilebilirlik.** "Kayıtlara geç" bağlantısı, `lang="tr"`, kart başlığında `aria-expanded` ve `aria-controls`, `dl` tabanlı detay yapısı, 44 px üstü dokunma hedefleri. Ayrıntılar `docs/arayuz.md`.
- **Bülten.** `src/site.ts` içindeki `subscribeEmail` doldurulduğunda altbilgide "E-posta ile abone ol" düğmesi görünür. Otomatik liste ve toplu gönderim için bir bülten hizmeti gerekir (`docs/yayin.md`).

## Teknoloji

Vite + React + TypeScript ile yazılmış statik bir site. Sunucu, veritabanı veya oturum yönetimi yok; içerik JSON dosyalarında durur ve derleme sırasında sayfaya gömülür. Sayı dosyaları tembel yüklenir, bu yüzden arşiv büyüdükçe ana paket ağırlaşmaz.

```
content/
  index.json            # sayı dizini (tarih, dönem, sayılar)
  issues/YYYY-MM-DD.json # sayı içeriği
src/
  App.tsx               # sayfa düzeni: başlık, genel bakış, akış, alt bilgi
  entries.ts            # sayıyı tek akışa indirger (tür etiketi, satırlar, arama metni)
  data.ts               # sayı dizini ve tembel yükleme
  types.ts              # veri şeması
  prefs.ts              # tema tercihi (localStorage)
  site.ts               # bülten adresi (boşsa düğme gizli)
  components/           # üst çubuk, akış, kart, en üste git
  styles.css            # tipografi ve duyarlı yerleşim
pipeline/               # günlük tarama ve sayı üretimi
```

## Sayı verisi

`content/issues/YYYY-MM-DD.json` tek bir sayıyı tanımlar. Başlıca alanlar:

| Alan | İçerik |
| --- | --- |
| `date`, `cadence`, `windowStart`, `windowEnd`, `periodLabel` | Sayı tarihi, kadans (daily) ve tarama dönemi |
| `stats` | Taranan kayıt, Doğrudan, Dolaylı, Konu dışı, klinik araştırma, dergi sayıları |
| `journals` | Dergi bazında kayıt sayıları (grup harfiyle) |
| `direct` | Çalışma kartları (başlık, künye, etiketler, özet, tasarım, örneklem, karşılaştırma, sonlanımlar, ana sonuç, takip, veri dönemi, yazarlar, kurumlar, Türkiye işareti, kapsam, branşlar, uluslararası bayrağı) |
| `trials` | NCT kayıtları |
| `indirect` | Dolaylı makaleler (tek cümlelik sonuç) |
| `trials[].date` | Kayıt veya sonuç bildirim tarihi; akış sıralaması bu alanı kullanır |
| `videoCase` | Olgu, video ve yorumlar: `titleTr`, `summary`, `designLabel`, `kind` alanlarıyla |
| `offTopic`, `cardiac`, `unavailable` | Başlık düzeyinde listelenen kayıtlar |
| `external` | PubMed dışı kaynaklardan gelen kayıtlar (Türkçe ve orijinal başlık, dergi, tarih, DOI, yazarlar, kurumlar, ilgi sınıfı) |
| `indirect[].entryDate` | Dolaylı kaydın PubMed'e giriş tarihi ([edat]); liste bu alana göre sıralanır |
| `coverage` | 58 dergi için kapsama tablosu: bu sayı, son 30 gün, son giriş tarihi, kaynak, durum |
| `sources` | Taranan, erişilemeyen kaynaklar ve kayıt bulunmayan dergiler |

Yeni bir sayı eklemek için dosyayı `content/issues/` altına koyup `content/index.json` dizinine bir satır eklemek yeterlidir; site bir sonraki derlemede sayıyı listeler.

## Haftalık üretim

```bash
bash pipeline/run_daily.sh                  # günlük sayı: son 24 saat taranır, 7 günlük kayan pencereye eklenir
bash pipeline/run_daily.sh --scan-window 7  # pencereyi baştan kur (tarama 7 gün)
bash pipeline/run_daily.sh --date 2026-11-28
python3 pipeline/run.py --stages issue --report   # yalnızca montaj + rapor
pnpm check                                  # tip denetimi + testler + derleme
pnpm pipeline:daily                         # run_daily.sh kısayolu
```

Hat tek giriş noktasından (`pipeline/run.py`) çalışır: PubMed dergi taraması (tüm ISSN'ler + `[edat]`), konu sorgusu, iki geçişli sınıflandırma, çalışma kartı üretimi ve sayı denetimi, ClinicalTrials.gov, Crossref/RSS ile PubMed dışı kaynaklar, tek geçişte atomik sayı montajı ve aynı veriden üretilen haftalık Markdown raporu (`content/reports/`). Ayrıntı, darboğaz tablosu ve doğrulama notları için `docs/mimari.md`.

Dergi listesi `pipeline/dergi_listesi.csv` dosyasındadır; tarama bu listenin tek doğru kaynağı olduğunu varsayar.

Koşu çıktısı `pipeline/.work/run.log` dosyasına da yazılır (2 MB üstünde son 2000 satır tutulur). Model belleği (`cls_memo.json`, `cards_memo.json`) koşu sonunda `content/memo/` altına kopyalanır; `.work` silinirse bir sonraki koşu belleği oradan geri yükler ve kayıtlar yeniden sınıflandırılmaz. Sayı montajı, listelerin kayıt kümesini birebir böldüğünü `check_lists` ile doğrular; tutarsızlık varsa koşu günlüğe uyarı yazar.

## Dokümanlar

| Dosya | İçerik |
| --- | --- |
| `README.md` | Sayfa yapısı, veri şeması, komutlar, içerik ilkeleri |
| `docs/mimari.md` | Hat akışı, modül sorumlulukları, memo kuralı, darboğaz tablosu, sınırlılıklar |
| `docs/zamanlanmis-gorevler.md` | Günlük 12:00 görevinin metni ve cumartesi haftalık rapor dalı |
| `docs/arayuz.md` | Arayüz kararları: tek akış, kart katmanları, süzgeçler, mobil ve erişilebilirlik ölçümleri |
| `docs/kaynak-kapsama.md` | Erişilemeyen dergiler için RSS, TR Dizin, DergiPark ve Crossref ölçümleri |
| `docs/llm-saglayici.md` | OpenAI, Gemini veya OpenAI uyumlu sunucuyla hattı çalıştırma; değişkenler, hata davranışı |
| `docs/yayin.md` | GitHub Pages, Cloudflare Pages, Vercel karşılaştırması; kurulum ve günlük güncelleme akışı |
| `docs/yol-haritasi.md` | Kısa, orta ve uzun vadeli işler; her madde için doğrulama ölçütü ve riskler |
| `tools/manus_artifacts.py` | Manus API'den son artifact listesini yerelde, indirme yapmadan gösterir |
| `tools/paket.sh` | Sürüm zip'i üretir, dosya sayısı, boyut ve sha256 yazar |

## Geliştirme

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # dist/ altına statik çıktı
```

## İçerik ilkeleri

Kartlar yalnızca erişilen metne (özet veya açık erişimli tam metin) dayanır; sayılar kaynaktan aynen aktarılır, yuvarlanmaz. Kaynakta bulunmayan alan "belirtilmemiş" olarak bırakılır. Klinik öneri verilmez, hasta verisi işlenmez.
