import { PUB_SHORT, SHORT_DESIGN } from './data'
import { composeSearchText } from './search'
import type { Design, Issue, Tax } from './types'

/** Akıştaki kayıt türleri: ilgi ekseni ve iki kayıt türü (araştırma, erişilemedi). */
export type Kind = 'dogrudan' | 'dolayli' | 'arastirma' | 'kardiyak' | 'erisilemedi' | 'konu_disi'

export const KIND_LABEL: Record<Kind, string> = {
  dogrudan: 'Doğrudan',
  dolayli: 'Dolaylı',
  arastirma: 'Klinik araştırma',
  kardiyak: 'Kardiyak',
  erisilemedi: 'Erişilemedi',
  konu_disi: 'Konu dışı',
}

export const KIND_ORDER: Kind[] = ['dogrudan', 'dolayli', 'arastirma', 'kardiyak', 'erisilemedi',
  'konu_disi']

/** Sıralama için tür dereceleri bir kez hesaplanır; karşılaştırmada indexOf çağrılmaz. */
const KIND_RANK = new Map<Kind, number>(KIND_ORDER.map((kind, index) => [kind, index]))

/** Varsayılan akış: kardiyak ve konu dışı arşivde kalır, gürültü sayfayı boğmaz. */
export const FLOW_KINDS: Kind[] = ['dogrudan', 'dolayli', 'arastirma', 'erisilemedi']

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
  areas: string[]
  approaches: string[]
  themes: string[]
  pubType?: string
  pubTypeLabel?: string
  pubShort?: string
  evidence?: string
  video?: boolean
  accessStatus?: string
  authors?: string
  turkey?: boolean
  access?: 'open' | 'abstract'
  design?: string
  summary?: string
  rows: Row[]
  note?: string
  search: string
}

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
    entry.areas.join(' '), entry.approaches.join(' '), entry.themes.join(' '), entry.pubTypeLabel,
    entry.summary, entry.note, entry.rows.map((r) => r.value).join(' ')])
}

/** Taksonomi alanlarını karta taşır; eksik alanlar boş dizi olur. */
function facets(item: Tax): Pick<Entry, 'areas' | 'approaches' | 'themes' | 'pubType' | 'pubTypeLabel'
  | 'pubShort' | 'evidence' | 'video' | 'accessStatus'> {
  return {
    areas: item.areaLabels || [],
    approaches: item.approachLabels || [],
    themes: item.themeLabels || [],
    pubType: item.pubType,
    pubTypeLabel: item.pubTypeLabel,
    pubShort: item.pubType ? (PUB_SHORT[item.pubType] || item.pubTypeLabel) : undefined,
    evidence: item.evidence,
    video: item.video,
    accessStatus: item.accessStatus,
  }
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
      ...facets(study),
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

  // Olgu, video ve yorum kayıtları normal akışta yer alır: başlık çevrilir,
  // özet yazılır, tür yalnızca etiket olarak kalır. İlgi ekseni editöryal
  // kayıtları dolaylı katmana taşır.
  for (const item of issue.videoCase) {
    const kind: Kind = item.interest === 'dolayli' ? 'dolayli' : 'dogrudan'
    const base: Omit<Entry, 'search'> = {
      id: `v-${item.pmid || item.url}`,
      kind,
      date: item.date,
      title: item.titleTr || item.title,
      titleOrig: item.titleTr && item.titleTr !== item.title ? item.title : undefined,
      journal: item.journal,
      url: item.url,
      ...facets(item),
      authors: item.authors,
      turkey: item.turkey,
      design: item.designLabel,
      summary: text(item.summary),
      rows: pack([row('design', 'Tanıtım', item.designLabel)]),
      note: item.note,
    }
    out.push({ ...base, search: searchOf(base) })
  }

  for (const item of issue.indirect) {
    const base: Omit<Entry, 'search'> = {
      id: `i-${item.id}`,
      kind: 'dolayli',
      date: item.entryDate || '',
      title: item.titleTr || item.title,
      titleOrig: item.titleTr && item.titleTr !== item.title ? item.title : undefined,
      journal: item.journal,
      url: item.url,
      ...facets(item),
      authors: item.authors,
      turkey: item.turkey,
      summary: text(item.oneLiner),
      rows: [],
    }
    out.push({ ...base, search: searchOf(base) })
  }

  for (const trial of issue.trials) {
    const base: Omit<Entry, 'search'> = {
      id: `t-${trial.nct}`,
      kind: 'arastirma',
      date: trial.date || '',
      title: trial.titleTr || trial.title,
      titleOrig: trial.titleTr && trial.titleTr !== trial.title ? trial.title : undefined,
      journal: 'ClinicalTrials.gov',
      url: `https://clinicaltrials.gov/study/${trial.nct}`,
      areas: [],
      approaches: [],
      themes: [],
      rows: pack([
        row('phase', 'Faz', trial.phase),
        row('status', 'Durum', trial.status),
        row('enroll', 'Hedef kayıt', trial.enrollment),
        row('primary', 'Birincil sonlanım', trial.primary),
        row('sponsor', 'Sponsor', trial.sponsor),
        row('period', 'Tarihler', trial.dates),
      ]),
    }
    out.push({ ...base, search: searchOf(base) })
  }

  for (const item of issue.external || []) {
    const kind: Kind = item.interest === 'kardiyak' ? 'kardiyak'
      : item.interest === 'dolayli' ? 'dolayli'
        : item.interest === 'video_olgu' || item.interest === 'dogrudan' ? 'dogrudan' : 'konu_disi'
    const base: Omit<Entry, 'search'> = {
      id: `x-${item.doi || item.url}`,
      kind,
      date: item.date,
      title: item.titleTr || item.title,
      titleOrig: item.titleTr && item.titleTr !== item.title ? item.title : undefined,
      journal: item.journal,
      url: item.url,
      ...facets(item),
      authors: item.authors,
      turkey: item.turkey,
      summary: text(item.oneLiner),
      rows: pack([row('source', 'Kaynak', item.source)]),
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
      ...facets(item),
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
      ...facets(item),
      authors: item.authors,
      turkey: item.turkey,
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
      ...facets(item),
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
