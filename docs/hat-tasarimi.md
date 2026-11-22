# Haftalık tarama hattı: iki çalışmanın karşılaştırması ve birleşik tasarım

Bu not, sitedeki günlük hattın ("site hattı") haftalık zamanlanmış görevdeki çalışmayla
("görev hattı") karşılaştırmasını, birleştirme kararlarını ve yapılan iyileştirmeleri kaydeder.

## 1. İki hat ne yapıyordu

| | Site hattı (`pipeline/`, 16 betik) | Görev hattı (zamanlanmış görev, 10+ betik) |
| --- | --- | --- |
| Tetikleme | Elle, günlük | Her cumartesi 12:00, otomatik |
| Pencere | Son 7 gün | İlk çalıştırma 30 gün, sonra 7 gün |
| Çıktı | `content/issues/*.json` → React sitesi | Markdown + PDF rapor |
| Sınıflandırma | İki geçiş (luna → sol), ayrı süreçler | Tek havuz + ikinci geçiş, görev içi betikler |
| Kart doğrulama | Model doğrulaması + ayrı sayı betiği | Model doğrulaması + `verify.py` |
| Durum | Sayı 5 kez yeniden yazılıyor | Rapor tek dosyada birleştiriliyor |
| Ölçek (22 Kasım) | 1019 kayıt, 53 doğrudan kart | 2159 kayıt (30 gün), 847 değerlendirme, 226 doğrudan, 156 kart |

Görev hattının güçlü yanı: kendi kendine koşan zamanlama, 30 günlük ilk doldurma mantığı, rapor
anlatısı ve kart doğrulamasında ısrarcı davranması. Site hattının güçlü yanı: yapılandırılmış veri,
siteye doğrudan akan tek şema, kapsama tablosu, kapsam/branş etiketleri ve Türkiye tespiti.

Zayıf yanlar ortaktı: aynı yardımcıların her iki hatta kopyalanması, sıralı HTTP çağrıları,
sabit varsayılan tarihler ve elle yazılmış kaynak metinleri.

## 2. Birleşik tasarım kararları

1. **Tek kaynak, iki çıktı.** Hat önce sayı JSON'unu üretir; Markdown rapor aynı JSON'dan yazılır
   (`report.py`). Böylece sitede görünen ile raporda yazan çelişemez.
2. **Tek giriş noktası.** `run.py` aşamaları (`scan`, `classify`, `cards`, `external`, `issue`,
   `report`) yönetir; `run_daily.sh` kadansı, `run_weekly_report.sh` haftalık raporu sabitler.
3. **Model yalnızca dil işi yapar.** Grup kuralları, eşikler ve süzgeçler Python'da (`rules.py`).
   Model çıktısı şemayla sınırlanır; kural ihlali kodda düzeltilir.
4. **Tek yazma.** Sayı bellekte kurulur, `tmp` + `rename` ile bir kez yazılır. Kısmi sayı kalmaz.
5. **Sabit liste yok.** Klinik araştırmalar, dergi listesi, kaynak manifestosu ve kapsama tablosu
   tarama sonucundan türetilir.
6. **Önbellek ve eşzamanlılık.** `.cache/` altında URL bazlı önbellek; bağımsız istekler 6 iş
   parçacığıyla paralel.

## 3. Yapılan iyileştirmeler

| Alan | Önce | Sonra |
| --- | --- | --- |
| Dosya sayısı | 16 betik + 3 Node işçisi + kabuk | 10 Python modülü + 1 Node işçisi + kabuk |
| Klinik araştırma | `build_issue.py` içinde 6 sabit NCT | Tarama sonucundan kural süzgeci (8 kayıt) |
| Sayı yazımı | 5 ardışık yeniden yazma | Tek atomik yazma |
| Kaynak metinleri | Elle yazılı "58 dergi", "TR Dizin 401" | Tarama raporundan üretilen manifesto |
| Tarih/pencere | Kod içinde sabit `2026-11-22` | `config.window()` + `--date/--cadence` |
| PubMed dışı havuz | 606 kaydın tamamı modele | Önce kural süzgeci, sonra model |
| HTTP | Sıralı + `sleep` | Paralel + önbellek (ikinci koşu ağsız) |
| Sayı denetimi | Ayrı betik, yalnızca rapor | `cards.py` içinde, `numberMismatches` alanıyla veride |
| Test | Tarih testi (tek dosya) | 15 birim testi (`pnpm test:pipeline`) |

## 4. Doğrulama

22 Kasım sayısı yeni hatla, önbellekteki ara çıktılardan yeniden üretildi:

- 1019 kayıt, 53 doğrudan, 9 dolaylı, 733 konu dışı, 123 kardiyak, 98 video/olgu, 3 erişilemeyen,
  6 PubMed dışı, 58 dergi kapsaması: eski çıktıyla **birebir aynı**.
- Doğrudan kartların 23 alanı karşılaştırıldı: fark yok.
- Tek fark klinik araştırma sayısı: 6 → 8. Eski liste elle seçilmişti; yeni süzgeç, sternotomi
  sonrası analjezi ve bronşiyal arter embolizasyonu çalışmalarını da torasik oldukları için alıyor.

## 5. Açık konular

- Zamanlanmış görev bu hattı çağıracak şekilde yeniden yazılmalı; görev yalnızca
  `bash pipeline/run_daily.sh` çalıştırıp yayın adımını tetiklemeli, kendi betiklerini taşımamalı.
- TR Dizin erişimi (HTTP 401) ve RSS'siz F grubu dergiler için kaynak eklenmesi gerekiyor.
- Klinik araştırma süzgeci başlık metnine dayanıyor; ileride `conditionsModule` alanı da okunabilir.
