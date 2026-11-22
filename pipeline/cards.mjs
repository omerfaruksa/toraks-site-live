import { pathToFileURL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'

const SKILL = '/home/ubuntu/skills/builtin-llm-models'
const { LlmClient, messageText, mapLimit } = await import(pathToFileURL(`${SKILL}/lib/llm.mjs`).href)

const MODEL = 'gpt-6-sol'
const CONC = Number(process.env.CONC || 4)
const LIMIT = Number(process.env.LIMIT || 0)
const BASE = '/home/ubuntu/torakslit/pipeline/.work'
const OUT = `${BASE}/cards.jsonl`

const cardSchema = {
  type: 'object',
  properties: {
    titleTr: { type: 'string' },
    designLabel: { type: 'string' },
    summary: { type: 'string' },
    sample: { type: 'string' },
    comparison: { type: 'string' },
    outcomes: { type: 'string' },
    mainResult: { type: 'string' },
    followUp: { type: 'string' },
    dataPeriod: { type: 'string' },
  },
  required: ['titleTr', 'designLabel', 'summary', 'sample', 'comparison', 'outcomes', 'mainResult', 'followUp', 'dataPeriod'],
  additionalProperties: false,
}

const verifySchema = {
  type: 'object',
  properties: { ...cardSchema.properties, mismatches: { type: 'array', items: { type: 'string' } } },
  required: [...cardSchema.required, 'mismatches'],
  additionalProperties: false,
}

const GEN_SYSTEM = `Göğüs cerrahisi literatür asistanısın. Yalnızca sana verilen özet (abstract) metnine dayanarak Türkçe yapılandırılmış çalışma kartı üretiyorsun. Okuyucu göğüs cerrahisi öğretim üyesidir; temel terimleri açıklama, mesleki tanım yapma.

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

const items = JSON.parse(await readFile(`${BASE}/pubmed_records.json`, 'utf8'))
const cls = JSON.parse(await readFile(`${BASE}/final_cls.json`, 'utf8'))

const targets = items
  .filter((r) => cls[r.pmid]?.interest === 'dogrudan' && !cls[r.pmid]?.cardiac && r.abstract)
  .slice(0, LIMIT || undefined)

const done = new Map()
try {
  const prev = (await readFile(OUT, 'utf8')).trim().split('\n').filter(Boolean)
  for (const line of prev) {
    const r = JSON.parse(line)
    if (!r.error) done.set(r.pmid, r)
  }
} catch { /* yok */ }

const pending = targets.filter((t) => !done.has(t.pmid))
console.log(`hedef ${targets.length}, tamam ${done.size}, bekleyen ${pending.length}, eşzamanlı ${CONC}`)

const llm = new LlmClient({ timeoutMs: 240000, maxRetries: 6 })
let fatal
let n = 0

const results = await mapLimit(pending, CONC, async (rec) => {
  if (fatal) return { pmid: rec.pmid, error: 'skipped' }
  const body = {
    dergi: rec.journal,
    baslik: rec.title,
    ozet: rec.abstract,
    yayin_turleri: rec.pubtypes,
    tasarim_ipucu: cls[rec.pmid]?.design,
    konu_etiketleri: cls[rec.pmid]?.tags,
  }
  try {
    const gen = await llm.chat({
      model: MODEL,
      messages: [
        { role: 'system', content: GEN_SYSTEM },
        { role: 'user', content: JSON.stringify(body) },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'card', strict: true, schema: cardSchema } },
      max_completion_tokens: 2000,
      reasoning: { effort: 'medium' },
    })
    const card = JSON.parse(messageText(gen))

    const ver = await llm.chat({
      model: MODEL,
      messages: [
        { role: 'system', content: VERIFY_SYSTEM },
        { role: 'user', content: JSON.stringify({ ozet: rec.abstract, kart: card }) },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'verify', strict: true, schema: verifySchema } },
      max_completion_tokens: 2000,
      reasoning: { effort: 'low' },
    })
    const v = JSON.parse(messageText(ver))
    const { mismatches, ...verifiedCard } = v
    n++
    if (n % 10 === 0) console.log(`  ${n}/${pending.length}`)
    return { pmid: rec.pmid, card: verifiedCard, mismatches, error: null }
  } catch (e) {
    if (e.fatal) fatal = e
    return { pmid: rec.pmid, error: e.message }
  }
})

if (fatal) console.log('FATAL', fatal.message)
const merged = [...done.values(), ...results.filter((r) => !r.error)]
await writeFile(OUT, merged.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8')
const errs = results.filter((r) => r.error)
console.log(`tamamlanan ${merged.length}, hata ${errs.length}`)
if (errs.length) console.log('örnek hata:', String(errs[0].error).slice(0, 200))
