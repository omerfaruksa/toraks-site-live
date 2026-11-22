import { pathToFileURL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'

const SKILL = '/home/ubuntu/skills/builtin-llm-models'
const { LlmClient, messageText, mapLimit } = await import(pathToFileURL(`${SKILL}/lib/llm.mjs`).href)

const MODEL = 'gpt-6-luna'
const CONC = Number(process.env.CONC || 4)
const IN = '/home/ubuntu/torakslit/pipeline/.work/triage_input.json'
const OUT = '/home/ubuntu/torakslit/pipeline/.work/triage_out.jsonl'

const TAGS = ['Akciğer kanseri cerrahisi', 'Mediasten', 'Özofagus', 'Göğüs duvarı', 'Plevra', 'Akciğer nakli',
  'Minimal invaziv ve robotik cerrahi', 'Toraks travması', 'Trakea ve hava yolu', 'Diyafram', 'Perioperatif bakım/ERAS']

const schema = {
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
}

const SYSTEM = `Göğüs cerrahisi (torasik cerrahi) literatür triyajı yapıyorsun. Okuyucu, göğüs cerrahisi öğretim üyesidir; temel terimleri açıklamana gerek yok. Yalnızca verilen başlık ve özet metnine dayan, dışarıdan bilgi ekleme.

İLGİ SINIFLARI
- dogrudan: Torasik cerrahi uygulaması, tekniği, kararı veya sonucu üzerine çalışma (ameliyat serisi, teknik karşılaştırma, perioperatif sonuç, cerrahi onkolojik sonuç, cerrahiyle ilgili deneysel/doku çalışması). "Akciğer kanseri" ifadesinin geçmesi tek başına yeterli DEĞİLDİR; cerrahi girişim, cerrahi karar veya cerrahi sonuç değişkeni bulunmalıdır.
- dolayli: Onkoloji, pulmoner tıp, görüntüleme veya biyobelirteç çalışması; cerrahi kararı etkileyebilir ama cerrahi işlem/teknik/sonuç değişkeni yok.
- konu_disi: Cerrahiyle ilişkisi yok (ör. COVID tedavisi, sistemik tedavi faz çalışması, temel biyoloji, sağlık hizmeti araştırması, kardiyoloji/ damar çalışması).
- video_olgu: Video makale, cerrahi teknik video, olgu sunumu (Case Reports), editöryel yorum, düzeltme, konferans özeti. Bunlar yalnızca başlıkla listelenir.

GRUP KURALI (kayıtta verilir): A grubunda tüm makaleler değerlendirilir, kardiyak içerik dışlanmaz ama cardiac=true işaretlenir. B grubunda kalp nakli, kapak, koroner, damar çalışmaları konu_disi sayılır. C grubunda yalnızca konu etiketine uyan ve cerrahi yönetimle ilişkili olanlar alınır. D grubunda her şey video_olgu.

KONU ETİKETLERİ (0-3 adet, yalnızca listeden): Akciğer kanseri cerrahisi, Mediasten, Özofagus, Göğüs duvarı, Plevra, Akciğer nakli, Minimal invaziv ve robotik cerrahi, Toraks travması, Trakea ve hava yolu, Diyafram, Perioperatif bakım/ERAS. Minimal invaziv/robotik etiketi teknik karşılaştırma içeren çalışmalarda hastalık etiketiyle birlikte verilir. Konu dışı kayıtta tags boş olabilir.

TASARIM: rct (randomize kontrollü), meta (sistematik derleme/meta-analiz), cohort (kohort; retrospektif/prospektif), casecontrol, caseseries, nonclinical (hücre/hayvan/biyomekanik/modelleme), other.

one_liner: yalnızca dolayli kayıtlarda, tek cümlelik Türkçe ana sonuç (sayı varsa aynen). Diğerlerinde boş string.
why: en fazla 12 kelime, sınıflandırma gerekçesi.`

const items = JSON.parse(await readFile(IN, 'utf8'))

// mevcut sonuclari yukle (yeniden calistirmada tamamlananlari atla)
const doneMap = new Map()
try {
  const prev = (await readFile(OUT, 'utf8')).trim().split('\n').filter(Boolean)
  for (const line of prev) {
    const r = JSON.parse(line)
    if (!r.error && r.interest) doneMap.set(r.pmid, r)
  }
} catch { /* ilk calistirma */ }

const pending = items.filter((i) => !doneMap.has(i.pmid))
console.log(`toplam ${items.length}, tamam ${doneMap.size}, bekleyen ${pending.length}, eszamanli ${CONC}`)

const llm = new LlmClient({ timeoutMs: 180000, maxRetries: 6 })
let fatal
let n = 0

const results = await mapLimit(pending, CONC, async (rec) => {
  if (fatal) return { pmid: rec.pmid, error: 'skipped' }
  const body = {
    dergi: rec.journal, grup: rec.group || 'liste_disi', grup_kurali: rec.group_rule,
    yayin_turleri: rec.pubtypes, dil: rec.language,
    baslik: rec.title, ozet: rec.abstract || '(özet yok)',
  }
  try {
    const resp = await llm.chat({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify(body) },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'triage', strict: true, schema } },
      max_completion_tokens: 900,
      reasoning: { effort: 'low' },
    })
    const parsed = JSON.parse(messageText(resp))
    n++
    if (n % 50 === 0) console.log(`  ${n}/${pending.length}`)
    return { pmid: rec.pmid, ...parsed, error: null }
  } catch (e) {
    if (e.fatal) fatal = e
    return { pmid: rec.pmid, error: e.message }
  }
})

if (fatal) console.log('FATAL:', fatal.message)

const merged = [...doneMap.values(), ...results.filter((r) => !r.error)]
await writeFile(OUT, merged.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8')

const errs = results.filter((r) => r.error)
console.log(`tamamlanan: ${merged.length}, bu turda hata: ${errs.length}`)
const counts = {}
for (const r of merged) counts[r.interest] = (counts[r.interest] || 0) + 1
console.log(counts)
