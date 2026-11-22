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
| 9 | `fetch_external.py` | `kaynak_esleme.csv`'deki dergiler için Crossref DOI kayıtları (online ve basılı yayın tarihi) ile dergi RSS akışlarını toplar |
| 10 | `triage_external.mjs` | PubMed dışı kayıtları sınıflandırır (gpt-6-luna): ilgi sınıfı, etiket, tek cümlelik sonuç |
| 11 | `build_issue.py` | Sayı JSON'unu yazar; PMC üzerinden açık tam metin durumunu, torasik/cerrahi içerik filtrelerini ve protokol ayıklamasını uygular |
| 12 | `enrich_meta.py` | Her kayda yazar, kurum ve Türkiye kökeni bilgisini ekler (PubMed `AffiliationInfo`) |
| 13 | `scope_tags.py` | Kartlara çalışma kapsamı (tek merkezli / çok merkezli), uluslararası işbirliği bayrağı ve ortak branşları ekler (PubMed kurum satırları + kart metni) |
| 14 | `merge_external.py` | Crossref/RSS kayıtlarını sayıya ekler (başlık düzeyinde; kart yazılmaz) |
| 15 | `coverage.py` | Dergi kapsama tablosunu üretir: bu sayı, son 30 gün, son giriş tarihi, kaynak |
| 16 | `verify_numbers.py` | Kartlardaki sayıları kaynak özetle karşılaştırır, uyuşmayanları listeler |

Ara dosyalar `pipeline/.work/` altında tutulur ve sürüm kontrolüne girmez. Adımlar tekrar çalıştırılabilir: `triage.mjs`, `recheck.mjs` ve `cards.mjs` tamamlanmış kayıtları atlar.

## Bilinen sınırlılıklar

- TR Dizin'in arama API'si kimlik doğrulama istiyor (`yonetim.trdizin.gov.tr/api/v1` HTTP 401); OAI-PMH ve toplu indirme yolu doğrulanamadı. TR Dizin dergileri Crossref DOI kayıtları üzerinden izleniyor.
- Makine okunur akışı doğrulanamayan dergiler: MMCTS, Shanghai Chest, Respiratory Case Reports, İzmir Göğüs Hastanesi Dergisi, Güncel Göğüs Hastalıkları. Bunlarda Crossref kaydı varsa oradan, yoksa yalnızca PubMed kayıtları değerlendirilir.
- Crossref/RSS kayıtlarında özet metni çoğunlukla bulunmaz; bu kayıtlar başlık düzeyinde listelenir, çalışma kartı yazılmaz.
- Europe PMC ön baskı taraması servis kesintilerinde boş dönebilir.
- Giriş tarihi (`entry_date`) PubMed `PubMedPubDate[@PubStatus="entrez"]` alanından `iso_date()` ile üretilir: ay adı sayıya çevrilir, ay ve gün iki haneye tamamlanır, eksik parçada `YYYY` veya `YYYY-MM` döner. Böylece tarihler sözlük sırasına göre de doğru sıralanır.
- `prep.py` ve `build_issue.py` giriş tarihini `iso_or_empty()` ile doğrular: yalnızca `YYYY`, `YYYY-MM`, `YYYY-MM-DD` (veya saatli ISO'nun gün kısmı) geçer; bozuk değer boş bırakılır ve listede sona düşer. Doğrulama testleri: `python3 pipeline/test_dates.py`.
- `build_issue.py` dolaylı kayıtlara PubMed giriş tarihini (`entryDate`) yazar; arayüzdeki tarih sıralaması bu alana dayanır.
- İlk sınıflandırma modeli (gpt-6-luna) düşük maliyetlidir; ikinci geçiş yalnızca Doğrudan/Dolaylı adaylarına uygulanır. Bu nedenle konu dışı listesinde tek tük hatalı sınıflandırma kalabilir.

## Kapsam ve branş etiketleri
`scope_tags.py` yalnızca kaynak metne dayanır: kapsam bilgisi kartın tasarım etiketi ve özetindeki ifadelerden ("çok merkezli", "ulusal kayıt", "tek merkezli"), branşlar ise PubMed kurum satırlarındaki bölüm adlarından ("Department of Medical Oncology" gibi) okunur. Kurum satırında branş yoksa kart "belirtilmemiş" kalır; metinde geçmeyen bilgi üretilmez. "Uluslararası" bayrağı yazar kurumlarının iki veya daha fazla ülkede olmasını gösterir, çalışma tasarımını değil.

## Kaynak eşleme
`kaynak_esleme.csv` her dergi için hangi kanalın kullanılacağını belirler: `pubmed` (varsayılan, listede yoksa), `crossref`, `rss`, `none`. Yeni bir dergi eklenirken ISSN ve kanal buraya yazılır; `coverage.py` ürettiği tabloda her derginin son 30 günlük kayıt sayısını ve son giriş tarihini gösterir.
