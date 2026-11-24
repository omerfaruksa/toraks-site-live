# Erişilemeyen dergiler ve kaynak kapsama araştırması

24 Kasım 2026 tarihinde uç noktalar canlı denendi (curl ve tarayıcı). Ölçümler bu sunucudan alındı; kurumsal ağdan farklı sonuç çıkabilir.

## Kısa sonuç

- En büyük iki kazanç: TR Dizin arama API'si kimlik doğrulaması istemiyor ve özet döndürüyor; DergiPark dergi bazlı RSS veriyor ve özet içeriyor.
- Elsevier, Thieme ve Frontiers RSS'leri sorunsuz çalışıyor. Wiley, Taylor & Francis, SAGE, Springer ve Karger Cloudflare/JS koruması nedeniyle programatik erişime kapalı.
- Crossref özet kapsamı yayınevine göre değişiyor: Annals of Thoracic Medicine 20/20, Cerrahpaşa 20/20, Thoracic Cancer 14/20, Indian JTCVS 2/20, JTD 0/20, TJTCS 0/20.
- Semantic Scholar anahtarsız kullanılamıyor (429), DOAJ bu dergilerde makale düzeyinde kayıt tutmuyor, Europe PMC PubMed dışına çıkmıyor.

## Yöntem karşılaştırması

| Yöntem | Kapsam | Özet | Kimlik doğrulama | Güvenilirlik | Not |
|---|---|---|---|---|---|
| Elsevier ScienceDirect RSS `rss.sciencedirect.com/publication/science/{ISSN}` | Elsevier dergileri (JTCVS Open, JTCVS Techniques, Seminars TCVS, Operative Techniques) | Yok, açıklama yalnız tarih ve yazarlar | Yok | Yüksek: 4/4 akış HTTP 200, 100 kayıt | Hattaki `_rss()` aynen çalışır; özet boşluğu PubMed ile kapatılır |
| Thieme RSS `thieme-connect.de/rss/thieme/en/10.1055-s-{id}.xml` | Thoracic and Cardiovascular Surgeon, TCVS Reports | Var, tam özet | Yok | Yüksek: HTTP 200, 49 öğe | `{id}` eşlemesi dergi sayfasından bir kez alınır |
| Frontiers RSS `frontiersin.org/journals/{slug}/rss` | Frontiers dergileri (listedekiler yok) | Var | Yok | Yüksek: 20 öğe | Genişleme için hazır |
| Wiley, T&F, SAGE, Springer, Karger akışları | Thoracic Cancer, Asian Cardiovasc Thorac Ann, Innovations, Indian JTCVS, Lung, Respiration | Belirlenemedi | Yok, ama bot koruması | Düşük: 403 veya challenge sayfası | Otomasyona uygun değil; Crossref/OpenAlex'e dayanılır |
| Crossref works `api.crossref.org/journals/{ISSN}/works` | DOI'si olan tüm dergiler | Değişken | Yok, `mailto` ile polite pool | Orta-yüksek; gecikme 0-30 gün | `from-created-date` kullanılmalı; limit 10 istek/sn, 429 görüldü |
| OpenAlex `api.openalex.org/works?filter=primary_location.source.issn:…` | Çok geniş | Var (`abstract_inverted_index`) | Anahtarsız 10 istek/sn | Orta; gecikme ~1 ay | Günlük tarama değil, özet ve açık erişim zenginleştirme |
| Europe PMC | PubMed + PMC + preprint | Var | Yok | Yüksek ama ek kapsam yok | Yalnız OA tam metin bağlantısı için anlamlı |
| Semantic Scholar Graph API | Geniş | Var | Anahtar pratikte zorunlu | Düşük: anahtarsız 429 | Bu hat için önerilmez |
| DOAJ `doaj.org/api/search/articles/issn:{ISSN}` | DOAJ'da metadata biriken OA dergiler | Var | Yok, 2 istek/sn | Dergiye göre değişken: Cerrahpaşa 824, JTD 1, TJTCS 0 | Genel çözüm değil |
| TR Dizin `search.trdizin.gov.tr/api/defaultSearch/publication/?q=…&order=…&page=1&limit=20` | TR Dizin dergileri (TJTCS, Tüberküloz ve Toraks, Cerrahpaşa, İzmir Göğüs) | Var, `abstracts[].abstract` | Yok | Orta-yüksek: HTTP 200, `firstIndexDate` alanı var | `order`, `page`, `limit` zorunlu; `order` yoksa sunucu JSON hatası veriyor. Dergi filtresi `facet-journalName` |
| DergiPark RSS `dergipark.org.tr/tr/pub/{slug}/rss/lastissue/tr`, `…/rss/earlypub/tr` | DergiPark dergileri | Var, ~1.300 karakter | Yok | Orta-yüksek | `earlypub` erken görünüm verir; slug listesi elle tutulur |
| OJS site RSS `…/index.php/{j}/gateway/plugin/WebFeedGatewayPlugin/rss2` | OJS dergileri (Cerrahpaşa) | Yok | Yok | Orta: 95 öğe | Özet için TR Dizin ile birleştirilir |
| PubMed `[edat]` (mevcut hat) | PubMed'de indeksli dergiler | Var | Yok | Yüksek | Erken görünüm karşılıkları: Elsevier *Available online*, Crossref `created-date`, DergiPark `earlypub`, TR Dizin `firstIndexDate` |

## Doğrulanamayanlar

- Wiley, T&F, SAGE, Springer, Karger akışlarının içeriği doğrulanamadı; hepsi 403 veya JS challenge döndürdü. Kalıplar ikincil kaynaklardan alındı.
- Karger `Respiration` dergisinin kendi akış kodu doğrulanamadı.
- TR Dizin için yazılı kota veya kullanım şartı bulunamadı; nazik kullanım (önbellek, dergi başına günde tek sorgu) önerilir.
- Eurasian Journal of Pulmonology ve Güncel Göğüs Hastalıkları için çalışan RSS bulunamadı.
- Thieme `{id}` eşlemesi yalnız Thoracic and Cardiovascular Surgeon için doğrulandı.

## Önerilen sıra

1. TR Dizin `defaultSearch`: kimlik doğrulaması yok, özet var, listedeki altı TR dergisini kapsıyor. `kaynak_esleme.csv` içine `source=trdizin` satırları ve `fetch.py` içine tek bir `_trdizin()` fonksiyonu yeterli.
2. DergiPark RSS: mevcut `_rss()` neredeyse olduğu gibi çalışır; `feed_url` yazmak yeterli, `earlypub` erken görünümü bedava verir.
3. Crossref iyileştirmesi: tarih tabanını `from-created-date` yapmak, eşzamanlılığı 2-3'e indirmek.
4. OpenAlex: özeti boş kalan kayıtlar için DOI toplu sorgusuyla `abstract_inverted_index` ve `oa_url`.
5. Thieme ve Frontiers RSS: iki `feed_url` satırı; Thieme özet de verdiği için Crossref'ten iyi.
6. Yatırım yapılmayacaklar: Wiley/T&F/SAGE/Springer/Karger akışları, Semantic Scholar, DOAJ, Europe PMC (ek kapsam yok).

## Kaynaklar

- ScienceDirect RSS yardım: https://www.elsevier.support/sciencedirect/answer/how-do-i-set-up-an-rss-feed
- TR Dizin entegrasyon dokümanı: https://development.trdizin.gov.tr/
- Crossref REST ipuçları: https://www.crossref.org/documentation/retrieve-metadata/rest-api/tips-for-using-the-crossref-rest-api/
- OpenAlex limitler: https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication
- Europe PMC REST: https://europepmc.org/RestfulWebService
- Semantic Scholar API: https://www.semanticscholar.org/product/api
- DOAJ API: https://doaj.org/api/v3/docs
- DergiPark RSS örneği: https://dergipark.org.tr/tr/pub/ighd/rss
