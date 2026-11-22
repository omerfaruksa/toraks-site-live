import { pathToFileURL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'

const SKILL = '/home/ubuntu/skills/builtin-llm-models'
const { LlmClient, messageText, mapLimit } = await import(pathToFileURL(`${SKILL}/lib/llm.mjs`).href)

const MODEL = 'gpt-6-sol'
const CONC = Number(process.env.CONC || 4)
const IN = '/home/ubuntu/torakslit/pipeline/.work/recheck_input.json'
const OUT = '/home/ubuntu/torakslit/pipeline/.work/recheck_out.jsonl'

const TAGS = ['Akciğer kanseri cerrahisi', 'Mediasten', 'Özofagus', 'Göğüs duvarı', 'Plevra', 'Akciğer nakli',
  'Minimal invaziv ve robotik cerrahi', 'Toraks travması', 'Trakea ve hava yolu', 'Diyafram', 'Perioperatif bakım/ERAS']

const schema = {
  type: 'object',
  properties: {
    interest: { type: 'string', enum: ['dogrudan', 'dolayli', 'konu_disi', 'video_olgu'] },
    cardiac: { type: 'boolean' },
    tags: { type: 'array', items: { type: 'string', enum: TAGS } },
    design: { type: 'string', enum: ['rct', 'meta', 'cohort', 'casecontrol', 'caseseries', 'nonclinical', 'other'] },
    one_liner: { type: 'string' },
    why: { type: 'string' },
  },
  required: ['interest', 'cardiac', 'tags', 'design', 'one_liner', 'why'],
  additionalProperties: false,
}

const SYSTEM = `Göğüs cerrahisi (torasik cerrahi) literatür sınıflandırması yapıyorsun. Okuyucu göğüs cerrahisi öğretim üyesidir. Yalnızca verilen başlık ve özete dayan.

ÖNCE KARDİYAK AYRIMI
cardiac=true: kalp ve büyük damar içeriği baskın olan çalışmalar — koroner bypass (CABG), kapak cerrahisi/TAVR, aort cerrahisi ve diseksiyon, konjenital kalp cerrahisi, kalp nakli, LVAD/ventriküler destek, kardiyak anestezi/yoğun bakım, kardiyotorasik dergide yayımlanan kardiyoloji çalışmaları. Bu kayıtlarda interest ne olursa olsun cardiac=true yazılır.
cardiac=false: akciğer, plevra, mediasten, özofagus, göğüs duvarı, trakea, diyafram, akciğer nakli ile ilgili çalışmalar. Torasik cerrahi ile kalp cerrahisinin birlikte ele alındığı çalışmada baskın olan konu belirleyicidir.

SONRA İLGİ SINIFI
- dogrudan: torasik cerrahi uygulaması, tekniği, kararı veya sonucu üzerine çalışma (ameliyat serisi, teknik karşılaştırma, perioperatif sonuç, cerrahi onkolojik sonuç, cerrahiyle doğrudan ilgili doku/deneysel çalışma). "Akciğer kanseri" ifadesinin geçmesi tek başına yeterli DEĞİLDİR; cerrahi girişim, cerrahi karar veya cerrahi sonuç değişkeni bulunmalıdır. Girişimsel pulmonoloji (bronkoskopik tanı, EBUS, bronşiyal embolizasyon) ve radyasyon onkolojisi cerrahi değildir.
- dolayli: onkoloji, pulmoner tıp, görüntüleme veya biyobelirteç çalışması; cerrahi kararı etkileyebilir ama cerrahi işlem/teknik/sonuç değişkeni yok.
- konu_disi: cerrahiyle ilişkisi yok (temel bilim, hayvan çalışması - insan cerrahisine dönük değilse, sistemik tedavi faz çalışması, epidemiyoloji, sağlık hizmeti araştırması).
- video_olgu: video makale, olgu sunumu (Case Reports), editöryel yorum, düzeltme, konferans özeti, teknik not.

GRUP KURALI (kayıtta verilir) mutlaka uygulanır: A grubunda tüm makaleler değerlendirilir ve kardiyak içerik cardiac=true ile işaretlenir (konu_disi yapılmaz). B grubunda kalp nakli, kapak, koroner, damar çalışmaları konu_disi olur. C grubunda yalnızca konu etiketine uyan ve cerrahi yönetimle ilişkili olanlar alınır; diğerleri konu_disi.

KONU ETİKETLERİ (0-3, yalnızca listeden): Akciğer kanseri cerrahisi, Mediasten, Özofagus, Göğüs duvarı, Plevra, Akciğer nakli, Minimal invaziv ve robotik cerrahi, Toraks travması, Trakea ve hava yolu, Diyafram, Perioperatif bakım/ERAS. Minimal invaziv/robotik etiketi teknik karşılaştırmalarda hastalık etiketiyle birlikte verilir. konu_disi kayıtta tags boş olabilir.

TASARIM: rct, meta (sistematik derleme/meta-analiz), cohort (retrospektif/prospektif kohort), casecontrol, caseseries, nonclinical (hücre/hayvan/biyomekanik/modelleme), other (editöryel, teknik not, derleme).

one_liner: yalnızca dolayli kayıtlarda tek cümlelik Türkçe ana sonuç (sayı varsa aynen); diğerlerinde boş string.
why: en fazla 12 kelime Türkçe gerekçe.`

const items = JSON.parse(await readFile(IN, 'utf8'))
const done = new Map()
try {
  for (const line of (await readFile(OUT, 'utf8')).trim().split('\n').filter(Boolean)) {
    const r = JSON.parse(line)
    if (!r.error) done.set(r.pmid, r)
  }
} catch { /* yok */ }

const pending = items.filter((i) => !done.has(i.pmid))
console.log(`hedef ${items.length}, tamam ${done.size}, bekleyen ${pending.length}`)

const llm = new LlmClient({ timeoutMs: 240000, maxRetries: 6 })
let fatal
let n = 0

const results = await mapLimit(pending, CONC, async (rec) => {
  if (fatal) return { pmid: rec.pmid, error: 'skipped' }
  const body = {
    dergi: rec.journal, grup: rec.group, grup_kurali: rec.group_rule,
    yayin_turleri: rec.pubtypes, baslik: rec.title, ozet: rec.abstract || '(özet yok)',
    onceki_siniflandirma: rec.prev_interest,
  }
  try {
    const resp = await llm.chat({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify(body) },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'cls', strict: true, schema } },
      max_completion_tokens: 2000,
      reasoning: { effort: 'low' },
    })
    const parsed = JSON.parse(messageText(resp))
    n++
    if (n % 20 === 0) console.log(`  ${n}/${pending.length}`)
    return { pmid: rec.pmid, ...parsed, error: null }
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
const c = {}
for (const r of merged) c[r.interest] = (c[r.interest] || 0) + 1
console.log(c, 'cardiac:', merged.filter((r) => r.cardiac).length)
