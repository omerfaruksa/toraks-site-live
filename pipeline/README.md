# Haftalık tarama hattı

Her cumartesi son 7 günü tarar, `content/issues/YYYY-MM-DD.json` sayısını, `content/index.json`
dizini ve `content/reports/YYYY-MM-DD.md` haftalık raporunu üretir. Site bu JSON'u okur; rapor
aynı veriden üretildiği için iki ayrı çıktı birbiriyle çelişmez.

## Çalıştırma

```bash
bash pipeline/run_daily.sh                        # bugünün sayısı, son 7 gün
bash pipeline/run_daily.sh --date 2026-11-28      # belirli sayı
bash pipeline/run_weekly_report.sh                # son 7 sayıyı birleştiren haftalık rapor
python3 pipeline/run.py --stages issue --report   # yalnızca montaj + rapor
python3 pipeline/run.py --from-cache --out /tmp/x.json   # ağ ve LLM çağrısı yapmadan deneme
python3 pipeline/run.py --cadence monthly --window 30    # ilk/30 günlük çalıştırma
```

Ortam değişkenleri: `CADENCE` (weekly/biweekly/monthly), `CONC` (LLM eşzamanlılığı, varsayılan 6),
`HTTP_WORKERS` (varsayılan 6), `MODEL_FAST` (gpt-6-luna), `MODEL_DEEP` (gpt-6-sol),
`CACHE_TTL` (saniye, varsayılan 6 saat).

## Akış

```
run.py
 ├─ scan      fetch.pubmed → .work/pubmed.json
 │            fetch.trials → .work/trials_raw.json
 │            fetch.external → .work/external.json
 ├─ classify  classify.run → classify_pass1/2.jsonl → .work/final_cls.json
 ├─ cards     cards.run → .work/cards.jsonl (kart + sayı denetimi)
 ├─ external  external.run → .work/external_cls.json
 └─ issue     issue.build → content/issues/<tarih>.json + index.json
              report.write → content/reports/<tarih>.md
```

| Modül | Sorumluluk |
| --- | --- |
| `config.py` | Yollar, dönem hesabı, kadans, model adları. Sabit tarih ve mutlak yol yok. |
| `net.py` | Önbellekli HTTP (`.cache/`), artan beklemeli yeniden deneme, paralel `pmap`, E-utilities kısayolları |
| `journals.py` | `dergi_listesi.csv` + `kaynak_esleme.csv`: ISSN eşleme, grup, grup kuralı metni |
| `rules.py` | Metin temizleme, torasik/cerrahi/protokol ölçütleri, kapsam ve branş, sayı denetimi |
| `fetch.py` | PubMed (dergi + konu sorgusu), ClinicalTrials.gov, Crossref/RSS, PMC ve yazar/kurum |
| `llm.mjs` | Tek LLM işçisi: `triage` ve `cards` modları, JSON şeması, kesintiden devam |
| `llm.py` | İşçiyi çağıran ince köprü |
| `classify.py` | İki geçiş + deterministik grup kuralları (A grubunda konu dışı kalmaz) |
| `cards.py` | Kart üretimi; sayılar özette yoksa `numberMismatches` alanına yazılır |
| `external.py` | PubMed dışı havuzu kural süzgecinden geçirip sınıflandırır |
| `issue.py` | Tüm bölümleri tek geçişte kurar, tek atomik yazmayla (`tmp` + `rename`) kaydeder |
| `report.py` | Sayı JSON'undan haftalık Markdown raporu |

## Ölçülen darboğazlar ve karşılıkları

| Sorun (eski hat) | Etki | Yeni davranış |
| --- | --- | --- |
| PubMed ve kapsama sorguları sıralı, arada `sleep` | 58 dergi + kapsama ~30-40 dk | Eşzamanlı istekler + disk önbelleği; ikinci koşu neredeyse ağsız |
| `build_issue.py` içinde sabit `TRIAL_IDS` listesi | Yeni dönemde klinik araştırmalar yanlış/eksik | Çalışmalar tarama sonucundan süzülür (`rules.TRIAL_INCLUDE/EXCLUDE`) |
| Sayı dosyası 5 kez yeniden yazılıyor | Adım düşerse yarım sayı | Tek montaj, atomik yazma |
| `prep`, `prep2`, `merge_cls`, `merge_external`, `coverage` ayrı süreçler | Aynı yardımcılar 7 dosyada tekrar | Yardımcılar `rules.py`/`journals.py` içinde tek yerde |
| `sources.failed/scanned` metinleri elle yazılı | Kaynak durumu gerçeği yansıtmıyor | Kaynak manifestosu tarama raporundan üretilir |
| Sabit `DATE`/`WINDOW_*` varsayılanları | Yanlış pencerede sayı üretme riski | `config.window()` + `--date/--cadence` |
| PubMed dışı 606 kaydın tamamı modele gidiyor | Gereksiz maliyet ve gecikme | Önce kural süzgeci, sonra model |

## Doğrulama

`python3 pipeline/run.py --from-cache --date 2026-11-22 --out /tmp/x.json` ile 22 Kasım sayısı
yeniden üretildi: 1019 kayıt, 53 doğrudan, 9 dolaylı, 733 konu dışı, 123 kardiyak, 98 video/olgu,
3 erişilemeyen kayıt ve 58 dergi kapsaması eski çıktıyla birebir aynı. Tek fark klinik araştırma
sayısı: eski sabit listede 6, yeni kural süzgecinde 8 (sternotomi sonrası analjezi ve bronşiyal
arter embolizasyonu çalışmaları da torasik oldukları için listeye girdi).

Birim testleri: `pnpm test:pipeline` (15 test: tarih penceresi, klinik araştırma süzgeci,
sayı denetimi, kapsam, dergi eşleme).

## Bilinen sınırlılıklar

- TR Dizin arama API'si kimlik doğrulama istiyor (HTTP 401); TR Dizin dergileri Crossref DOI
  kayıtları üzerinden izlenir.
- F grubu dergi sitelerinde RSS akışı olmayanlar yalnızca PubMed/Crossref kaydıyla değerlendirilir.
- Crossref/RSS kayıtlarında özet çoğu zaman yok; bu kayıtlar başlık düzeyinde listelenir.
- Klinik araştırma süzgeci başlık metnine dayanır; başlığında torasik işaret taşımayan ilgili
  çalışmalar gözden kaçabilir.
- Sınıflandırma iki geçişlidir; konu dışı listesinde tek tük hata kalabilir.
- `--from-cache` yalnızca `.work` içindeki hazır ara çıktılarla çalışır; ağ ve model çağrısı yapmaz.
