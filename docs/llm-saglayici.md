# LLM sağlayıcısı

Hattın tüm model çağrıları tek dosyadan geçer: `pipeline/llm.mjs` (dört mod: `triage`, `cards`, `briefs`, `trials`). Sağlayıcı seçimi `pipeline/provider.mjs` içindedir; başka hiçbir dosyaya dokunmak gerekmez. Python tarafı (`pipeline/llm.py`) işçiyi `node` ile başlatır.

## Hızlı kurulum

Node 18 veya üstü gerekir; ek paket yoktur. Değişkenleri hattı çalıştıran kabukta tanımlayın:

```bash
# OpenAI
export LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-...
export MODEL_FAST=gpt-4.1-mini        # triage, briefs, trials
export MODEL_DEEP=gpt-4.1             # cards (üret ve doğrula)
export LLM_REASONING=off              # akıl yürütme desteklemeyen modellerde

# Gemini
export LLM_PROVIDER=gemini
export GEMINI_API_KEY=...
export MODEL_FAST=gemini-flash-latest
export MODEL_DEEP=gemini-pro-latest

# OpenAI uyumlu herhangi bir sunucu (Azure, OpenRouter, Ollama, vLLM)
export LLM_PROVIDER=custom
export LLM_BASE_URL=http://localhost:11434/v1
export LLM_API_KEY=anahtar             # yerel sunucuda boş olabilir

bash pipeline/run_daily.sh
```

Model adları güncel liste için sağlayıcının belgesinden doğrulanmalıdır; bu dosyadaki adlar örnektir. `cards` modu çıkarma ve ikinci bir doğrulama çağrısı yapar, bu yüzden güçlü modelle çalıştırın.

## Değişkenler

| Değişken | Anlamı |
| --- | --- |
| `LLM_PROVIDER` | `openai`, `gemini`, `custom`, `manus`. Boşsa: Manus geçidi varsa o, yoksa `OPENAI_API_KEY`, yoksa `GEMINI_API_KEY` |
| `OPENAI_API_KEY`, `GEMINI_API_KEY`, `LLM_API_KEY` | Anahtar. `LLM_API_KEY` sağlayıcıya özel değişkenin yerine geçer |
| `LLM_BASE_URL` | Uç nokta kökü; `custom` için zorunlu, diğerlerinde varsayılanı değiştirir |
| `MODEL_FAST`, `MODEL_DEEP` | Hızlı ve derin mod modelleri (`pipeline/config.py`) |
| `LLM_REASONING` | `off` ise `reasoning_effort` gönderilmez |
| `LLM_STRICT` | `off` ise JSON şemasındaki `strict` alanı atılır |
| `LLM_TOKEN_FACTOR` | Gemini'de çıktı belirteç sınırı çarpanı (varsayılan 4; düşünme belirteçleri sınırdan yer) |
| `CONC` | Eşzamanlı istek sayısı (varsayılan 6). Ücretsiz katmanlarda 1 veya 2 yapın |
| `LLM_NODE` | Kullanılacak node yolunu zorlar |

## Davranış

- İstekler OpenAI Chat Completions biçimindedir: `response_format: json_schema`, `max_completion_tokens`, `reasoning_effort`. Gemini için OpenAI uyumlu uç nokta kullanılır.
- Geçici hatalar (429, 5xx, ağ) üstel bekleme ile en çok 6 kez yeniden denenir.
- Kota, yetki ve model bulunamadı hataları (400, 401, 403, 404, `insufficient_quota`) yeniden denenmez; işçi hemen durur ve çıkış kodu 1 döner. Tamamlanan kayıtlar `pipeline/.work/` içinde kalır, aynı komut kaldığı yerden sürer.
- Anahtar veya sağlayıcı eksikse işçi anlaşılır bir iletiyle çıkış kodu 2 ile durur.

## Sınırlar ve doğrulama

- Bu depodaki dört mod sahte bir OpenAI uyumlu sunucuya karşı sınandı (istek çevirisi, yeniden deneme, kota hatasında durma) ve Manus geçidiyle gerçek model üzerinde çalıştırıldı. OpenAI ve Gemini'nin gerçek uç noktaları anahtar bulunmadığı için burada çalıştırılamadı; ilk çalıştırmada küçük bir örnekle deneyin:

  ```bash
  python3 -c "import json;json.dump(json.load(open('pipeline/.work/triage_input.json'))[:2],open('/tmp/in.json','w'))"
  node pipeline/llm.mjs triage /tmp/in.json /tmp/out.jsonl "$MODEL_FAST"
  ```
- Şema uyumu sağlayıcıya göre değişir. OpenAI `strict` kipinde tüm alanların `required` olmasını ister; hata alırsanız `LLM_STRICT=off` deneyin. Gemini yanıtı boş dönerse `LLM_TOKEN_FACTOR` değerini artırın.
- Model değiştirmek sınıflandırma ve çeviri kalitesini değiştirir. Önbellekler (`content/memo/*.json`) eski modelin çıktısını tutar; yeni modelle karşılaştırma yapmadan toplu kullanmayın.
- Çıktı doğrulama (`numbers_missing`, `verify_issue.py`) sağlayıcıdan bağımsız çalışır ve sayı uyuşmazlığını yakalar.
