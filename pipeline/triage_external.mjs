import { pathToFileURL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'
const SKILL = '/home/ubuntu/skills/builtin-llm-models'
const { LlmClient, messageText, mapLimit } = await import(pathToFileURL(`${SKILL}/lib/llm.mjs`).href)
const MODEL = process.env.MODEL || 'gpt-6-luna'
const CONC = Number(process.env.CONC || 3)
const IN = '/home/ubuntu/torakslit/pipeline/.work/external.json'
const OUT = '/home/ubuntu/torakslit/pipeline/.work/external_cls.json'

const TAGS = ['Akciğer kanseri cerrahisi', 'Mediasten', 'Özofagus', 'Göğüs duvarı', 'Plevra', 'Akciğer nakli',
  'Minimal invaziv ve robotik cerrahi', 'Toraks travması', 'Trakea ve hava yolu', 'Diyafram', 'Perioperatif bakım/ERAS']

const PROMPT = `Göğüs cerrahisi literatür triyajı. Kayıt PubMed dışı bir kaynaktan (Crossref/RSS) geldi; yalnızca verilen başlık ve özet metnine dayan.
SINIFLAR:
- dogrudan: Torasik cerrahi uygulama, teknik veya sonuç değişkeni içeren çalışma.
- dolayli: Onkoloji, pulmoner tıp, görüntüleme veya biyobelirteç; cerrahi kararı etkileyebilir ama cerrahi değişken yok.
- konu_disi: Cerrahiyle ilişkisi yok.
- video_olgu: Video makale, olgu sunumu, editöryel, düzeltme.
"Akciğer kanseri" ifadesinin geçmesi tek başına dogrudan için yeterli değildir.
title_tr: başlığın Türkçe çevirisi; kısaltma, özel ad ve dergi adları korunur, uydurma terim eklenmez.
one_liner: yalnızca dolayli kayıtlarda tek cümlelik Türkçe ana sonuç; diğerlerinde boş string.
why: en fazla 10 kelime gerekçe.`

const schema = {
  type: 'object',
  properties: {
    interest: { type: 'string', enum: ['dogrudan', 'dolayli', 'konu_disi', 'video_olgu'] },
    tags: { type: 'array', items: { type: 'string', enum: TAGS } },
    design: { type: 'string', enum: ['rct', 'meta', 'cohort', 'casecontrol', 'caseseries', 'nonclinical', 'other'] },
    cardiac: { type: 'boolean' },
    title_tr: { type: 'string' },
    one_liner: { type: 'string' },
    why: { type: 'string' },
  },
  required: ['interest', 'tags', 'design', 'cardiac', 'title_tr', 'one_liner', 'why'],
  additionalProperties: false,
}

const data = JSON.parse(await readFile(IN, 'utf8'))
const items = data.records.filter((r) => r.title)
const client = new LlmClient()
console.log(`dış kayıt: ${items.length}, eşzamanlı ${CONC}`)

const results = await mapLimit(items, CONC, async (rec) => {
  const body = `Dergi: ${rec.journal}\nBaşlık: ${rec.title}\nTür: ${(rec.pubtypes || []).join(', ')}\nÖzet: ${(rec.abstract || '').slice(0, 1800) || '(özet yok)'}`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await client.chat({
        model: MODEL,
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: body },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'triage', strict: true, schema } },
        max_completion_tokens: 1200,
      })
      return { ...rec, ...JSON.parse(messageText(res)) }
    } catch (e) {
      if (attempt === 2) return { ...rec, error: String(e).slice(0, 200) }
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
})

await writeFile(OUT, JSON.stringify(results, null, 1))
const counts = results.reduce((a, r) => ((a[r.interest || 'error'] = (a[r.interest || 'error'] || 0) + 1), a), {})
console.log(counts)
