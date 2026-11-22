# Günlük tarama boru hattı

Tarama protokolünü (son 7 gün, dergi bazlı ISSN taraması + konu sorgusu + ClinicalTrials.gov) çalıştırıp `content/issues/YYYY-MM-DD.json` dosyasını ve `content/index.json` dizinini üretir.

## Çalıştırma

```bash
bash pipeline/run_daily.sh                 # bugün, son 7 gün penceresi
bash pipeline/run_daily.sh 2026-11-23      # belirli tarih
WINDOW_START=2026-11-01 WINDOW_END=2026-11-22 bash pipeline/run_daily.sh 2026-11-22
```

Ortam değişkenleri: `DATE`, `WINDOW_START`, `WINDOW_END`, `CONC` (eşzamanlı LLM isteği, varsayılan 4).

## Adımlar

| Adım | Betik | Ne yapar |
| --- | --- | --- |
| 1 | `fetch_pubmed.py` | `dergi_listesi.csv` içindeki 58 derginin tüm ISSN'lerini `[edat]` penceresiyle tarar; ayrıca MeSH + `[tiab]` konu sorgusuyla liste dışı dergileri toplar |
| 2 | `prep.py` | Kayıtları temizler, ISSN üzerinden dergi grubunu eşler, triyaj girdisini ve kart üretimi için kayıt dosyasını yazar |
| 3 | `triage.mjs` | İlk sınıflandırma (gpt-6-luna): ilgi sınıfı, kardiyak işareti, konu etiketleri, tasarım, tek cümlelik sonuç |
| 4 | `prep2.py` | Doğru grup bilgisiyle ikinci geçiş hedeflerini seçer (Doğrudan/Dolaylı + cerrahi anahtar sözcük içeren Konu dışı) |
| 5 | `recheck.mjs` | İkinci geçiş sınıflandırma (gpt-6-sol): kardiyak ayrımı ve grup kuralları yeniden uygulanır |
| 6 | `merge_cls.py` | İki geçişi birleştirir; A grubunda hiçbir makale "konu dışı" bırakılmaz (kardiyak hariç) |
| 7 | `cards.mjs` | Doğrudan makaleler için çalışma kartı üretir ve ikinci bir doğrulama çağrısıyla sayıları kaynakla karşılaştırır |
| 8 | `fetch_trials.py` | ClinicalTrials.gov: `StudyFirstPostDate` ve `ResultsFirstPostDate` penceresi |
| 9 | `build_issue.py` | Sayı JSON'unu yazar; PMC üzerinden açık tam metin durumunu, torasik/cerrahi içerik filtrelerini ve protokol ayıklamasını uygular |
| 10 | `verify_numbers.py` | Kartlardaki sayıları kaynak özetle karşılaştırır, uyuşmayanları listeler |

Ara dosyalar `pipeline/.work/` altında tutulur ve sürüm kontrolüne girmez. Adımlar tekrar çalıştırılabilir: `triage.mjs`, `recheck.mjs` ve `cards.mjs` tamamlanmış kayıtları atlar.

## Bilinen sınırlılıklar

- TR Dizin otomatik sorgu arayüzü yanıt vermediği için taranamaz; raporun "erişilemeyen kaynaklar" bölümünde belirtilir.
- F grubu dergilerin (MMCTS, JOVS, VATS, Shanghai Chest, Respiratory Case Reports, Open Journal of Thoracic Surgery) RSS akışları alınamadığı için yalnızca PubMed kayıtları değerlendirilir.
- Europe PMC ön baskı taraması servis kesintilerinde boş dönebilir.
- İlk sınıflandırma modeli (gpt-6-luna) düşük maliyetlidir; ikinci geçiş yalnızca Doğrudan/Dolaylı adaylarına uygulanır. Bu nedenle konu dışı listesinde tek tük hatalı sınıflandırma kalabilir.
