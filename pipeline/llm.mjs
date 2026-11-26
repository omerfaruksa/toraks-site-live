/**
 * Tek LLM işçisi: sınıflandırma (triage), çalışma kartı (cards), kısa tanıtım (briefs)
 * ve klinik araştırma başlığı çevirisi (trials) modları.
 *
 * Kullanım:
 *   node pipeline/llm.mjs triage <input.json> <out.jsonl> [model]
 *   node pipeline/llm.mjs cards  <input.json> <out.jsonl> [model]
 *   node pipeline/llm.mjs briefs <input.json> <out.jsonl> [model]
 *   node pipeline/llm.mjs trials <input.json> <out.jsonl> [model]
 *
 * Girdi: [{ id, ... }] dizisi. Çıktı: her satır { id, ...alanlar, error }.
 * Tamamlanmış kayıtlar atlanır; iş kesilirse aynı komut kaldığı yerden sürer.
 */
import { readFile, writeFile } from 'node:fs/promises'

// Sağlayıcı (Manus geçidi, OpenAI, Gemini, OpenAI uyumlu sunucu) provider.mjs içinde seçilir.
import { LlmClient, messageText, mapLimit } from './provider.mjs'

const [, , MODE, IN, OUT, MODEL_ARG] = process.argv
if (!MODE || !IN || !OUT) {
  console.error('kullanım: llm.mjs <triage|cards|briefs|trials> <input.json> <out.jsonl> [model]')
  process.exit(2)
}

const CONC = Number(process.env.CONC || 4)
const MODEL = MODEL_ARG || process.env.LLM_MODEL || (MODE === 'cards' ? 'gpt-6-sol' : 'gpt-6-luna')
let llm
try {
  llm = new LlmClient({ timeoutMs: 240000, maxRetries: 6 })
} catch (e) {
  console.error(`LLM sağlayıcı hatası: ${e.message}`)
  process.exit(2)
}

const TAGS = ['Akciğer kanseri cerrahisi', 'Mediasten', 'Özofagus', 'Göğüs duvarı', 'Plevra', 'Akciğer nakli',
  'Minimal invaziv ve robotik cerrahi', 'Toraks travması', 'Trakea ve hava yolu', 'Diyafram', 'Perioperatif bakım/ERAS']

const TRIAGE_SYSTEM = `Göğüs cerrahisi (torasik cerrahi) literatür triyajı yapıyorsun. Okuyucu, göğüs cerrahisi öğretim üyesidir; temel terimleri açıklamana gerek yok. Yalnızca verilen başlık ve özet metnine dayan, dışarıdan bilgi ekleme.

İLGİ SINIFLARI
- dogrudan: Torasik cerrahi uygulaması, tekniği, kararı veya sonucu üzerine çalışma (ameliyat serisi, teknik karşılaştırma, perioperatif sonuç, cerrahi onkolojik sonuç, cerrahiyle ilgili deneysel/doku çalışması). "Akciğer kanseri" ifadesinin geçmesi tek başına yeterli DEĞİLDİR; cerrahi girişim, cerrahi karar veya cerrahi sonuç değişkeni bulunmalıdır.
- dolayli: Onkoloji, pulmoner tıp, görüntüleme veya biyobelirteç çalışması; cerrahi kararı etkileyebilir ama cerrahi işlem/teknik/sonuç değişkeni yok.
- konu_disi: Cerrahiyle ilişkisi yok (ör. COVID tedavisi, sistemik tedavi faz çalışması, temel biyoloji, sağlık hizmeti araştırması, kardiyoloji/damar çalışması).
- video_olgu: Video makale, cerrahi teknik video, olgu sunumu (Case Reports), editöryel yorum, düzeltme, konferans özeti. Bunlar yalnızca başlıkla listelenir.

GRUP KURALI (kayıtta verilir): A grubunda tüm makaleler değerlendirilir, kardiyak içerik dışlanmaz ama cardiac=true işaretlenir. B grubunda kalp nakli, kapak, koroner, damar çalışmaları konu_disi sayılır. C grubunda yalnızca konu etiketine uyan ve cerrahi yönetimle ilişkili olanlar alınır. D grubunda her şey video_olgu.

KONU ETİKETLERİ (0-3 adet, yalnızca listeden): ${TAGS.join(', ')}. Minimal invaziv/robotik etiketi teknik karşılaştırma içeren çalışmalarda hastalık etiketiyle birlikte verilir. Konu dışı kayıtta tags boş olabilir.

TASARIM: rct (randomize kontrollü), meta (sistematik derleme/meta-analiz), cohort (kohort; retrospektif/prospektif), casecontrol, caseseries, nonclinical (hücre/hayvan/biyomekanik/modelleme), other.

one_liner: yalnızca dolayli kayıtlarda, tek cümlelik Türkçe ana sonuç (sayı varsa aynen). Diğerlerinde boş string.
why: en fazla 12 kelime, sınıflandırma gerekçesi.`

const CARD_SYSTEM = `Göğüs cerrahisi literatür asistanısın. Yalnızca sana verilen özet (abstract) metnine dayanarak Türkçe yapılandırılmış çalışma kartı üretiyorsun. Okuyucu göğüs cerrahisi öğretim üyesidir; temel terimleri açıklama, mesleki tanım yapma.

KESİN KURALLAR
1. Yalnızca verilen metinde yazana dayan. Metinde olmayan hiçbir sayı, grup, sonlanım veya sonuç ekleme.
2. Değerleri değiştirme: yuvarlama, yeniden hesaplama, birim dönüştürme, yüzdeye çevirme yok. Etki büyüklüğü, güven aralığı ve p değeri metindeki değerlerle birebir aynı olacak.
3. Yazım biçimi Türkçe olacak: ondalık ayırıcı virgül (11,9; 0,45), güven aralığı "%95 GA" biçiminde, yıl aralıkları kısa çizgi ile (2014–2024), yüzde işareti sayıdan sonra (%9,2). İngilizce "95% CI" veya "1.68-fold" gibi kalıpları Türkçeleştir ama değerleri koru (ör. "1,68 kat").
4. Bir alan metinde yoksa tam olarak "belirtilmemiş" yaz. Tahmin yürütme, çıkarım yapma.
5. Klinik öneri verme. Sınırlılıkları yorumlama. Özet dışına çıkma.
6. Kısaltmalar korunur: VATS, RATS, ERAS, PET-CT, ctDNA, EGFR, HR, OR, GA.

ALANLAR
- titleTr: Başlığın Türkçe çevirisi; yalnızca başlık, ekleme yok.
- designLabel: Tek cümlelik tasarım tanımı, sonunda nokta yok (ör. "Retrospektif kohort çalışması, eğilim skoru eşleştirmesi").
- summary: Tek paragraf, 3–5 cümle. Çalışmanın sorusu, yapılan iş ve sonucun yönü. Tasarım ayrıntısına girme, sayı tekrarı yapma.
- sample: Tek cümle; hasta/hayvan/hücre sayısı ve grup dağılımı. Klinik dışı çalışmada başa "Klinik dışı:" etiketi koy.
- comparison: Tek cümle; karşılaştırma grubu yoksa "karşılaştırma yok".
- outcomes: Tek cümle; birincil sonlanım, varsa ikincil.
- mainResult: Tek cümle; sonucun yönü, etki büyüklüğü, %95 GA ve p değeri.
- followUp: Medyan/ortalama takip süresi; yoksa "belirtilmemiş".
- dataPeriod: Veri toplama aralığı; yoksa "belirtilmemiş". Takip süresi yerine geçmez.`

const VERIFY_SYSTEM = `Göğüs cerrahisi literatür doğrulama editörüsün. Sana bir özet metni ve bu özetten üretilmiş Türkçe çalışma kartı veriliyor. Kartı özetle karşılaştır.

- Örneklem sayıları, grup sayıları, etki büyüklükleri, güven aralıkları, p değerleri, takip süresi, veri dönemi ve tasarım adını tek tek karşılaştır.
- Özetle uyuşmayan veya özette olmayan her değeri düzelt; uydurulmuş bilgi varsa o alanı "belirtilmemiş" yap.
- Değerleri değiştirme; yalnızca yazım biçimini Türkçeleştir (ondalık virgül, "%95 GA", yıl aralığında kısa çizgi).
- Düzeltilmiş kartın TÜM alanlarını eksiksiz döndür.
- mismatches: yaptığın düzeltmelerin kısa listesi; düzeltme yoksa boş dizi.
- Klinik öneri ekleme.`

const BRIEF_SYSTEM = `Göğüs cerrahisi literatür asistanısın. Sana bir olgu sunumu veya video makalenin başlığı ile özeti veriliyor. Okuyucu göğüs cerrahisi öğretim üyesidir.

Görevin kısa tanıtım üretmek:
- titleTr: Başlığın Türkçe çevirisi. Yalnızca başlık; ekleme yok.
- summary: En fazla 2 cümle. Ne yapıldığı ve sonucun yönü. Yalnızca verilen metne dayan.
- designLabel: "Olgu sunumu", "Video makale" veya "Olgu serisi" gibi kısa tanım.

Kurallar: metinde olmayan sayı, tanı veya sonuç ekleme; değerleri değiştirme; klinik öneri verme; metin yoksa summary alanına "belirtilmemiş" yaz.`

const TRIAL_SYSTEM = `Göğüs cerrahisi literatür asistanısın. Sana ClinicalTrials.gov kayıt başlığı veriliyor. Okuyucu göğüs cerrahisi öğretim üyesidir.

Görevin tek alan üretmek:
- titleTr: Başlığın Türkçe çevirisi. Yalnızca başlık; ekleme, yorum ve kısaltma yok.

Kurallar: özgün anlamı koru; VATS, RATS, ERAS, ECMO, NCT gibi kısaltmaları olduğu gibi bırak; metinde olmayan bilgi ekleme; başlık zaten Türkçeyse aynen döndür.`

const cardProps = {
  titleTr: { type: 'string' },
  designLabel: { type: 'string' },
  summary: { type: 'string' },
  sample: { type: 'string' },
  comparison: { type: 'string' },
  outcomes: { type: 'string' },
  mainResult: { type: 'string' },
  followUp: { type: 'string' },
  dataPeriod: { type: 'string' },
}
const cardRequired = Object.keys(cardProps)

const schemas = {
  triage: {
    type: 'object',
    properties: {
      interest: { type: 'string', enum: ['dogrudan', 'dolayli', 'konu_disi', 'video_olgu'] },
      tags: { type: 'array', items: { type: 'string', enum: TAGS } },
      design: { type: 'string', enum: ['rct', 'meta', 'cohort', 'casecontrol', 'caseseries', 'nonclinical', 'other'] },
      cardiac: { type: 'boolean' },
      one_liner: { type: 'string' },
      why: { type: 'string' },
    },
    required: ['interest', 'tags', 'design', 'cardiac', 'one_liner', 'why'],
    additionalProperties: false,
  },
  card: { type: 'object', properties: cardProps, required: cardRequired, additionalProperties: false },
  brief: {
    type: 'object',
    properties: {
      titleTr: { type: 'string' },
      summary: { type: 'string' },
      designLabel: { type: 'string' },
    },
    required: ['titleTr', 'summary', 'designLabel'],
    additionalProperties: false,
  },
  trialTitle: {
    type: 'object',
    properties: { titleTr: { type: 'string' } },
    required: ['titleTr'],
    additionalProperties: false,
  },
  verify: {
    type: 'object',
    properties: { ...cardProps, mismatches: { type: 'array', items: { type: 'string' } } },
    required: [...cardRequired, 'mismatches'],
    additionalProperties: false,
  },
}

const items = JSON.parse(await readFile(IN, 'utf8'))
const done = new Map()
try {
  for (const line of (await readFile(OUT, 'utf8')).trim().split('\n').filter(Boolean)) {
    const rec = JSON.parse(line)
    if (!rec.error) done.set(rec.id, rec)
  }
} catch { /* ilk çalıştırma */ }

const pending = items.filter((i) => !done.has(i.id))
console.log(`${MODE}: toplam ${items.length}, tamam ${done.size}, bekleyen ${pending.length}, model ${MODEL}, eşzamanlı ${CONC}`)

let fatal
let doneCount = 0

async function triage(rec) {
  const resp = await llm.chat({
    model: MODEL,
    messages: [
      { role: 'system', content: TRIAGE_SYSTEM },
      { role: 'user', content: JSON.stringify(rec.payload) },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'triage', strict: true, schema: schemas.triage } },
    max_completion_tokens: 900,
  })
  return JSON.parse(messageText(resp))
}

async function card(rec) {
  const gen = await llm.chat({
    model: MODEL,
    messages: [
      { role: 'system', content: CARD_SYSTEM },
      { role: 'user', content: JSON.stringify(rec.payload) },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'card', strict: true, schema: schemas.card } },
    max_completion_tokens: 2000,
    reasoning: { effort: 'medium' },
  })
  const draft = JSON.parse(messageText(gen))
  const ver = await llm.chat({
    model: MODEL,
    messages: [
      { role: 'system', content: VERIFY_SYSTEM },
      { role: 'user', content: JSON.stringify({ ozet: rec.payload.ozet, kart: draft }) },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'verify', strict: true, schema: schemas.verify } },
    max_completion_tokens: 2000,
    reasoning: { effort: 'low' },
  })
  const { mismatches, ...verified } = JSON.parse(messageText(ver))
  return { card: verified, mismatches }
}

async function trialTitle(rec) {
  const resp = await llm.chat({
    model: MODEL,
    messages: [
      { role: 'system', content: TRIAL_SYSTEM },
      { role: 'user', content: JSON.stringify(rec.payload) },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'trialTitle', strict: true, schema: schemas.trialTitle } },
    max_completion_tokens: 300,
  })
  const parsed = JSON.parse(messageText(resp)) || {}
  return { titleTr: String(parsed.titleTr || '') }
}

async function brief(rec) {
  const resp = await llm.chat({
    model: MODEL,
    messages: [
      { role: 'system', content: BRIEF_SYSTEM },
      { role: 'user', content: JSON.stringify(rec.payload) },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'brief', strict: true, schema: schemas.brief } },
    max_completion_tokens: 600,
  })
  return { brief: JSON.parse(messageText(resp)) }
}

const results = await mapLimit(pending, CONC, async (rec) => {
  if (fatal) return { id: rec.id, error: 'skipped' }
  try {
    const out = MODE === 'cards' ? await card(rec)
      : MODE === 'briefs' ? await brief(rec)
        : MODE === 'trials' ? await trialTitle(rec)
          : await triage(rec)
    doneCount += 1
    if (doneCount % 20 === 0) console.log(`  ${doneCount}/${pending.length}`)
    return { id: rec.id, ...out, error: null }
  } catch (e) {
    if (e.fatal) fatal = e
    return { id: rec.id, error: e.message }
  }
})

const merged = [...done.values(), ...results.filter((r) => !r.error)]
await writeFile(OUT, merged.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8')
const errors = results.filter((r) => r.error)
console.log(`tamamlanan ${merged.length}, hata ${errors.length}`)
if (errors.length) console.log('örnek hata:', String(errors[0].error).slice(0, 200))
if (fatal) process.exitCode = 1
