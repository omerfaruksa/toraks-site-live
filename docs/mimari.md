# Mimari: tek hat, iki çıktı

Bu belge boru hattının güncel yapısını, modül sorumluluklarını, ölçülen darboğazları ve
bilinen sınırlılıkları tek yerde toplar. Sitenin sayfa yapısı ve veri şeması `README.md`
içindedir; zamanlanmış görev metni `docs/zamanlanmis-gorevler.md`, yayın ve barındırma
`docs/yayin.md` dosyasındadır.

## 1. Akış

```
run.py
 ├─ scan      fetch.pubmed  → .work/pubmed.json (son 24 saat + kayan pencere)
 │            fetch.author_meta → .work/meta.json (yazar, kurum, Türkiye kanıtı)
 │            fetch.trials  → .work/trials_raw.json (15 günlük pencere)
 │            fetch.external → .work/external.json
 ├─ classify  classify.run  → classify_pass1/2.jsonl → .work/final_cls.json
 ├─ cards     cards.run     → .work/cards.jsonl (kart + sayı denetimi)
 ├─ briefs    briefs.run    → .work/briefs.jsonl (olgu/video başlık çevirisi + iki cümle özet)
 ├─ external  external.run  → .work/external_cls.json
 └─ issue     issue.build   → content/issues/<tarih>.json + content/index.json
              report.write  → content/reports/<tarih>.md
```

Haftalık rapor ayrı tarama yapmaz: `report.write_weekly` son sayıları okur, PMID/DOI ile
tekilleştirir ve aynı veriden Markdown üretir. Sitede görünen ile raporda yazan çelişemez.

## 2. Modüller

| Modül | Sorumluluk |
| --- | --- |
| `config.py` | Yollar, dönem hesabı, kadans, model adları, eşzamanlılık. Sabit tarih ve mutlak yol yok. |
| `net.py` | Önbellekli HTTP (`.cache/`), artan beklemeli yeniden deneme, paralel `pmap`, E-utilities kısayolları |
| `journals.py` | `dergi_listesi.csv` + `kaynak_esleme.csv`: ISSN eşleme, grup, grup kuralı metni |
| `rules.py` | Metin temizleme, torasik/cerrahi/protokol ölçütleri, kapsam ve branş, sayı denetimi |
| `fetch.py` | PubMed (dergi + konu sorgusu), ClinicalTrials.gov, Crossref/RSS, PMC, yazar/kurum |
| `rolling.py` | Günlük tarama ile kayan pencereyi birleştirir: anahtar bazlı tekleştirme, pencere dışını atma, sınır toleransı |
| `llm.mjs` / `llm.py` | Tek LLM işçisi (`triage`, `cards`, `briefs` modları, JSON şeması, kesintiden devam) ve ince köprü |
| `memo.py` | Model kararlarının günler arası belleği; anahtar `PMID:kısa-içerik-özeti` |
| `memo_seed.py` | Belleği `content/memo/` altında saklar, `.work` boşsa geri yükler |
| `classify.py` | İki geçiş + deterministik grup kuralları (A grubunda konu dışı kalmaz) |
| `cards.py` | Kart üretimi; özette bulunmayan sayılar `numberMismatches` alanına yazılır |
| `briefs.py` | Olgu ve video kayıtları için Türkçe başlık, iki cümlelik tanıtım ve tür etiketi; özet yoksa yalnız başlık çevrilir |
| `external.py` | PubMed dışı havuzu kural süzgecinden geçirip sınıflandırır |
| `issue.py` | Bölümleri tek geçişte kurar, `tmp` + `rename` ile atomik yazar, liste dağıtımını doğrular; göğüs cerrahisi dışı ve hayvan olgularını konu dışına atar |
| `report.py` | Sayı JSON'undan günlük ve haftalık Markdown raporu; bölüm üreticileri ortak |

## 3. Komutlar

```bash
bash pipeline/run_daily.sh                        # bugünün sayısı: son 24 saati tara, 7 günlük pencereye ekle
bash pipeline/run_daily.sh --date 2026-11-28      # belirli sayı
bash pipeline/run_daily.sh --window 30            # ilk çalıştırma, 30 gün
bash pipeline/run_daily.sh --scan-window 7        # pencereyi baştan kur (tarama 7 gün)
python3 pipeline/run.py --stages issue --report   # yalnızca montaj + rapor
python3 pipeline/run.py --from-cache --out /tmp/x.json   # ağ ve LLM çağrısı yapmadan deneme
pnpm check                                        # tip denetimi + iki test kümesi + derleme
pnpm pipeline:daily                               # run_daily.sh kısayolu
```

Ortam değişkenleri: `CADENCE` (daily/weekly/biweekly/monthly), `CONC` (LLM eşzamanlılığı,
varsayılan 6), `HTTP_WORKERS` (varsayılan 6), `MODEL_FAST` (gpt-6-luna), `MODEL_DEEP`
(gpt-6-sol), `TRIALS_DAYS` (ClinicalTrials.gov penceresi, varsayılan 15), `CACHE_TTL`
(saniye, varsayılan 6 saat).

`run_daily.sh` çıktıyı `pipeline/.work/run.log` dosyasına da yazar; dosya 2 MB'ı geçince son
2000 satır tutulur. Zamanlanmış görev başarısız olduğunda teşhis bu dosyadan yapılır.

## 4. Günlük tarama ve bellek (memo) kuralı

Günlük kadans her gün yalnızca son 24 saati tarar (`config.SCAN_DAYS["daily"] = 1`). Bulunan
kayıtlar önceki koşunun kayıtlarıyla birleştirilir ve 7 günlük kayan pencereye
(`config.CADENCE_DAYS["daily"] = 7`) eklenir; pencere dışında kalanlar düşürülür. Böylece sayı
proje talimatındaki 7 günlük kapsamı korur, taranan gün sayısı yedide birden bire iner.

Birleştirme `rolling.merge` ile yapılır: anahtar PubMed'de PMID, klinik araştırmada NCT,
PubMed dışı kaynakta DOI ya da başlıktır; aynı anahtar yeniden gelirse taze kayıt kazanır.
PubMed `[edat]` sorgusu bitişik günü de döndürebildiği için pencere sınırında bir günlük tolerans
tanınır (`buffer_days=1`); bu olmadan sınır günündeki kayıtlar her koşuda düşüyordu. Pencereyi
baştan kurmak için `--scan-window 7` verilir.

Aynı kayıt yedi gün boyunca pencerede kaldığı için sınıflandırma ve kart üretimi
`cls_memo.json` ve `cards_memo.json` dosyalarını kullanır.

Bellek anahtarı yalnızca PMID değil, `PMID:` ile başlayıp yükün (dergi, başlık, özet, yayın
türleri) kısa SHA-1 özetiyle biter. Özet değişirse anahtar da değişir ve kayıt yeniden
değerlendirilir; böylece PubMed'de güncellenen bir özet eski kararla donmaz. Bozuk memo dosyası
sessizce boş kabul edilir, hat durmaz.

`meta.json` (yazar, kurum, Türkiye kanıtı) artık artımlıdır: yalnızca bellekte olmayan PMID'ler
için ağa çıkılır, eski kayıtlar korunur. Önceki sürümde bu adım `run.py` içinden çağrılmıyordu ve
yeni kayıtların yazar/kurum bilgisi boş kalıyordu.

Bellek `pipeline/.work` içinde geçicidir; sandbox sıfırlandığında kayboluyor ve ilk koşu tüm
kayıtları yeniden sınıflandırıyordu. `memo_seed.persist()` koşu sonunda iki memo dosyasını
`content/memo/` altına kopyalar, `memo_seed.restore()` açılışta `.work` içinde olmayanları geri
getirir. Depoda yalnızca kararlar durur (ilgi sınıfı, etiketler, kart alanları); özet metni veya
hasta verisi yoktur.

Sayı montajı `check_lists` ile iki değişmez arar: her kayıt tam olarak bir listede olmalı ve
listelerin toplamı sınıflandırılan kayıt sayısına eşit olmalı. Tutarsızlık koşuyu durdurmaz;
ekrana ve koşu günlüğüne uyarı yazılır, böylece sessiz sayı kayması fark edilir.

## 5. Ölçülen darboğazlar ve karşılıkları

| Sorun (eski hat) | Etki | Bugünkü davranış |
| --- | --- | --- |
| PubMed ve kapsama sorguları sıralı, arada `sleep` | 58 dergi + kapsama ~30-40 dk | Eşzamanlı istekler + disk önbelleği; ikinci koşu neredeyse ağsız |
| `build_issue.py` içinde sabit `TRIAL_IDS` listesi | Yeni dönemde klinik araştırmalar yanlış/eksik | Çalışmalar tarama sonucundan süzülür (`rules.TRIAL_INCLUDE/EXCLUDE`) |
| Sayı dosyası 5 kez yeniden yazılıyor | Adım düşerse yarım sayı | Tek montaj, atomik yazma |
| `prep`, `prep2`, `merge_cls`, `merge_external`, `coverage` ayrı süreçler | Aynı yardımcılar 7 dosyada tekrar | Yardımcılar `rules.py`/`journals.py` içinde tek yerde |
| `sources.failed/scanned` metinleri elle yazılı | Kaynak durumu gerçeği yansıtmıyor | Kaynak manifestosu tarama raporundan üretilir |
| Sabit `DATE`/`WINDOW_*` varsayılanları | Yanlış pencerede sayı üretme riski | `config.window()` + `--date/--cadence` |
| PubMed dışı 606 kaydın tamamı modele gidiyor | Gereksiz maliyet ve gecikme | Önce kural süzgeci, sonra model |
| Başlık listelerinde kurum dizisi taşınıyordu | Sayı dosyası 671 KB, gzip 160 KB | Kurum yalnızca kartlarda; 528 KB, gzip 125 KB |
| `render` ve `render_weekly` bölümleri kopyalıyordu | İki yerde bakım | Dokuz ortak bölüm üreticisi |
| Günlük koşu her seferinde 7 günü yeniden tarıyordu | Gereksiz ağ yükü, aynı kayıt yedi kez | Son 24 saat taranır, `rolling.merge` kayan pencereyi korur |

## 6. Doğrulama

`python3 pipeline/run.py --from-cache --stages issue,report` ile 22 Kasım sayısı yeniden
üretildi: 1019 kayıt, 53 doğrudan, 9 dolaylı, 733 konu dışı, 123 kardiyak, 98 video/olgu,
3 erişilemeyen kayıt, 6 PubMed dışı kayıt ve 58 dergi kapsaması. Günlük rapor ve haftalık rapor
yeniden yazım öncesi kopyalarla bayt bayt aynı çıktı; sayı JSON'unda tek fark kurum alanının
başlık listelerinden kaldırılması ve `generatedAt` damgası.

Klinik araştırma sayısı eski sabit listede 6, yeni kural süzgecinde 8: sternotomi sonrası
analjezi ve bronşiyal arter embolizasyonu çalışmaları da torasik oldukları için listeye girdi.

Birim testleri: `pnpm test:pipeline` (27 test: tarih penceresi, klinik araştırma süzgeci,
sayı denetimi, kapsam, dergi eşleme, haftalık birleştirmede PMID/DOI tekilleştirme,
kayan pencere birleştirmesi) ve
`pnpm test:search` (10 test: arama katlama, tırnaklı ifade, vurgulama).

## 7. Bilinen sınırlılıklar

- TR Dizin arama API'si kimlik doğrulama istiyor (HTTP 401); TR Dizin dergileri Crossref DOI
  kayıtları üzerinden izlenir.
- F grubu dergi sitelerinde RSS akışı olmayanlar yalnızca PubMed/Crossref kaydıyla değerlendirilir.
- Crossref/RSS kayıtlarında özet çoğu zaman yok; bu kayıtlar başlık düzeyinde listelenir.
- Klinik araştırma süzgeci başlık metnine dayanır; başlığında torasik işaret taşımayan ilgili
  çalışmalar gözden kaçabilir. İleride `conditionsModule` alanı da okunabilir.
- Sınıflandırma iki geçişlidir; konu dışı listesinde tek tük hata kalabilir.
- `--from-cache` yalnızca `.work` içindeki hazır ara çıktılarla çalışır; ağ ve model çağrısı yapmaz.
- Yeni sayı yayımlandığında okura bildirim gönderilmez; site sessizce güncellenir.
