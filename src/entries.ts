import { SHORT_DESIGN, TAG_ORDER } from './data'
import { composeSearchText } from './search'
import type { Design, Issue } from './types'

/** Akıştaki kayıt türleri: bölüm başlığı yerine kart üstünde etiket olarak görünür. */
export type Kind =
  | 'dogrudan'
  | 'dolayli'
  | 'olgu'
  | 'video'
  | 'yorum'
  | 'arastirma'
  | 'kardiyak'
  | 'dis'
  | 'erisilemedi'
  | 'konu_disi'

export const KIND_LABEL: Record<Kind, string> = {
  dogrudan: 'Doğrudan',
  dolayli: 'Dolaylı',
  erisilemedi: 'Erişilemedi',
  olgu: 'Olgu',
  video: 'Video',
  yorum: 'Yorum',
  arastirma: 'Klinik araştırma',
  kardiyak: 'Kardiyak',
  dis: 'Liste dışı',
  konu_disi: 'Konu dışı',
}

export const KIND_ORDER: Kind[] = ['dogrudan', 'olgu', 'video', 'yorum', 'arastirma', 'dolayli', 'dis', 'kardiyak',
  'erisilemedi', 'konu_disi']

/** Sıralama için tür dereceleri bir kez hesaplanır; karşılaştırmada indexOf çağrılmaz. */
const KIND_RANK = new Map<Kind, number>(KIND_ORDER.map((kind, index) => [kind, index]))

/** Varsayılan akışta konu dışı kayıtlar yok: 800 satırlık gürültü sayfayı boğuyor. */
export const FLOW_KINDS: Kind[] = ['dogrudan', 'olgu', 'video', 'yorum', 'arastirma', 'dolayli', 'dis', 'kardiyak',
  'erisilemedi']

export interface Row {
  key: string
  label: string
  value: string
}

export interface Entry {
  id: string
  kind: Kind
  date: string
  title: string
  titleOrig?: string
  journal: string
  url: string
  tags: string[]
  authors?: string
  turkey?: boolean
  access?: 'open' | 'abstract'
  design?: string
  summary?: string
  rows: Row[]
  note?: string
  search: string
}

const TAGS = new Set(TAG_ORDER)
/** Editöryal, yorum ve mektuplar olgu türünden ayrılır. */
const COMMENT = /editör|yorum|mektup|düzeltme|comment|editorial|letter/i

/** Model "belirtilmemiş" yazdığında alan boş sayılır; kartta yer tutmaz. */
function text(value?: string): string {
  const trimmed = (value || '').trim()
  return trimmed.toLowerCase().startsWith('belirtilmemiş') ? '' : trimmed
}

function row(key: string, label: string, value?: string): Row | null {
  const clean = text(value)
  if (!clean) return null
  return { key, label, value: clean }
}

function pack(rows: Array<Row | null>): Row[] {
  return rows.filter((item): item is Row => Boolean(item))
}

function searchOf(entry: Omit<Entry, 'search'>): string {
  return composeSearchText([entry.title, entry.titleOrig, entry.journal, entry.authors,
    entry.tags.join(' '), entry.summary, entry.note, entry.rows.map((r) => r.value).join(' ')])
}

/** Sayı dosyasını tek, tarih sıralı akışa indirger; bölüm bilgisi tür etiketine dönüşür. */
export function buildEntries(issue: Issue): Entry[] {
  const out: Entry[] = []

  for (const study of issue.direct) {
    const base: Omit<Entry, 'search'> = {
      id: `d-${study.id}`,
      kind: 'dogrudan',
      date: study.entryDate,
      title: study.titleTr || study.titleOrig,
      titleOrig: study.titleTr && study.titleOrig && study.titleTr !== study.titleOrig ? study.titleOrig : undefined,
      journal: study.journal,
      url: study.url,
      tags: study.tags.filter((t) => TAGS.has(t)),
      authors: study.authors,
      turkey: study.turkey,
      access: study.access,
      design: SHORT_DESIGN[study.design as Design] || study.designLabel,
      summary: text(study.summary),
      rows: pack([
        row('design', 'Tasarım', study.designLabel),
        row('sample', 'Örneklem', study.sample),
        row('compare', 'Karşılaştırma', study.comparison),
        row('outcome', 'Sonlanım', study.outcomes),
        row('result', 'Ana sonuç', study.mainResult),
        row('follow', 'Takip', study.followUp),
        row('period', 'Veri dönemi', study.dataPeriod),
      ]),
      note: study.note,
    }
    out.push({ ...base, search: searchOf(base) })
  }

  for (const item of issue.indirect) {
    const base: Omit<Entry, 'search'> = {
      id: `i-${item.id}`,
      kind: 'dolayli',
      date: item.entryDate || '',
      title: item.title,
      journal: item.journal,
      url: item.url,
      tags: item.tags.filter((t) => TAGS.has(t)),
      authors: item.authors,
      turkey: item.turkey,
      summary: text(item.oneLiner),
      rows: [],
    }
    out.push({ ...base, search: searchOf(base) })
  }

  for (const item of issue.videoCase) {
    const kind: Kind = item.kind === 'video'
      ? 'video'
      : COMMENT.test(item.designLabel || '') ? 'yorum' : 'olgu'
    const base: Omit<Entry, 'search'> = {
      id: `v-${item.pmid || item.url}`,
      kind,
      date: item.date,
      title: item.titleTr || item.title,
      titleOrig: item.titleTr && item.titleTr !== item.title ? item.title : undefined,
      journal: item.journal,
      url: item.url,
      tags: [],
      authors: item.authors,
      turkey: item.turkey,
      design: item.designLabel,
      summary: text(item.summary),
      rows: [],
      note: item.note,
    }
    out.push({ ...base, search: searchOf(base) })
  }

  for (const trial of issue.trials) {
    const base: Omit<Entry, 'search'> = {
      id: `t-${trial.nct}`,
      kind: 'arastirma',
      date: trial.date || '',
      title: trial.title,
      journal: 'ClinicalTrials.gov',
      url: `https://clinicaltrials.gov/study/${trial.nct}`,
      tags: [],
      rows: pack([
        row('phase', 'Faz', trial.phase),
        row('status', 'Durum', trial.status),
        row('enroll', 'Hedef kayıt', trial.enrollment),
        row('primary', 'Birincil sonlanım', trial.primary),
        row('sponsor', 'Sponsor', trial.sponsor),
      ]),
    }
    out.push({ ...base, search: searchOf(base) })
  }

  for (const item of issue.external || []) {
    const base: Omit<Entry, 'search'> = {
      id: `x-${item.doi || item.url}`,
      kind: item.interest === 'kardiyak' ? 'kardiyak' : 'dis',
      date: item.date,
      title: item.titleTr || item.title,
      titleOrig: item.titleTr && item.titleTr !== item.title ? item.title : undefined,
      journal: item.journal,
      url: item.url,
      tags: item.tags.filter((t) => TAGS.has(t)),
      authors: item.authors,
      turkey: item.turkey,
      summary: text(item.oneLiner),
      rows: pack([row('interest', 'İlgi', item.interestLabel), row('source', 'Kaynak', item.source)]),
      note: item.note,
    }
    out.push({ ...base, search: searchOf(base) })
  }

  for (const item of issue.cardiac) {
    const base: Omit<Entry, 'search'> = {
      id: `c-${item.pmid || item.url}`,
      kind: 'kardiyak',
      date: item.date,
      title: item.title,
      journal: item.journal,
      url: item.url,
      tags: [],
      authors: item.authors,
      turkey: item.turkey,
      rows: [],
      note: item.note,
    }
    out.push({ ...base, search: searchOf(base) })
  }

  for (const item of issue.unavailable || []) {
    const base: Omit<Entry, 'search'> = {
      id: `u-${item.pmid || item.url}`,
      kind: 'erisilemedi',
      date: item.date,
      title: item.title,
      journal: item.journal,
      url: item.url,
      tags: [],
      authors: item.authors,
      rows: [],
      note: item.note || 'Tam metne erişilemedi; kart yazılmadı.',
    }
    out.push({ ...base, search: searchOf(base) })
  }

  for (const item of issue.offTopic) {
    const base: Omit<Entry, 'search'> = {
      id: `o-${item.pmid || item.url}`,
      kind: 'konu_disi',
      date: item.date,
      title: item.title,
      journal: item.journal,
      url: item.url,
      tags: [],
      authors: item.authors,
      rows: [],
    }
    out.push({ ...base, search: searchOf(base) })
  }

  // Aynı yayın iki listede birden gelirse tek kez gösterilir; ön ek atılarak ham kimlik karşılaştırılır.
  const seen = new Set<string>()
  return sortEntries(out.filter((entry) => {
    const raw = entry.id.slice(2)
    if (seen.has(raw)) return false
    seen.add(raw)
    return true
  }))
}

/** Tarih yeniden eskiye; aynı gün içinde tür sırası, sonra başlık. */
export function sortEntries(items: Entry[]): Entry[] {
  return items.slice().sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    const ka = KIND_RANK.get(a.kind) ?? 99
    const kb = KIND_RANK.get(b.kind) ?? 99
    if (ka !== kb) return ka - kb
    return a.title.localeCompare(b.title, 'tr')
  })
}
