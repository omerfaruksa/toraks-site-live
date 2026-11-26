export type Design = 'rct' | 'meta' | 'cohort' | 'casecontrol' | 'caseseries' | 'nonclinical' | 'other'

export type Access = 'open' | 'abstract'
export type Scope = 'tek_merkezli' | 'cok_merkezli' | ''

/** Beş eksenli taksonomi: ilgi, yayın türü, alan, yaklaşım, tema. */
export type Interest = 'dogrudan' | 'dolayli' | 'inceleme' | 'kardiyak' | 'konu_disi'

export interface Tax {
  interest?: Interest | string
  interestLabel?: string
  pubType?: string
  pubTypeLabel?: string
  evidence?: string
  areas?: string[]
  areaLabel?: string
  areaLabels?: string[]
  approaches?: string[]
  approachLabels?: string[]
  themes?: string[]
  themeLabels?: string[]
  video?: boolean
  accessStatus?: 'tam' | 'ozet' | 'ozet_eksik' | string
}

export interface Study extends Tax {
  id: string
  titleTr: string
  titleOrig: string
  journal: string
  entryDate: string
  pmid: string
  doi: string
  url: string
  tags: string[]
  access: Access
  design: Design
  designLabel: string
  summary: string
  sample: string
  comparison: string
  outcomes: string
  mainResult: string
  followUp: string
  dataPeriod: string
  verified?: boolean
  note?: string
  authors?: string
  institutions?: string[]
  turkey?: boolean
  turkeyNote?: string
  scope?: Scope
  scopeLabel?: string
  disciplines?: string[]
  multidisciplinary?: boolean
  international?: boolean
  countries?: string[]
}

export interface Trial {
  nct: string
  title: string
  titleTr?: string
  phase: string
  status: string
  dates: string
  enrollment: string
  primary: string
  sponsor: string
  date?: string
}

export interface Indirect extends Tax {
  id: string
  title: string
  titleTr?: string
  journal: string
  entryDate?: string
  pmid: string
  doi: string
  url: string
  oneLiner: string
  tags: string[]
  authors?: string
  institutions?: string[]
  turkey?: boolean
  scope?: Scope
  scopeLabel?: string
  disciplines?: string[]
  multidisciplinary?: boolean
  international?: boolean
  countries?: string[]
}

export interface TitleOnly extends Tax {
  title: string
  pmid?: string
  doi?: string
  titleTr?: string
  summary?: string
  designLabel?: string
  journal: string
  date: string
  url: string
  kind?: 'video' | 'case' | 'other'
  authors?: string
  institutions?: string[]
  turkey?: boolean
  note?: string
}

export interface ExternalItem extends Tax {
  titleTr?: string
  title: string
  journal: string
  date: string
  dateBasis?: string
  doi: string
  url: string
  authors?: string
  institutions?: string[]
  turkey?: boolean
  interest: string
  interestLabel: string
  tags: string[]
  oneLiner?: string
  source: string
  note?: string
}
export interface Coverage {
  journal: string
  group: string
  issn: string
  count7: number
  count30: number
  lastEntry: string
  source: string
  status: string
}
export interface JournalCount {
  name: string
  group: string
  count: number
}

export interface IssueStats {
  scanned: number
  direct: number
  indirect: number
  offTopic: number
  trials: number
  journalsScanned: number
  journalsWithRecords: number
  externalRecords?: number
  externalJournals?: number
  external?: number
  turkey?: number
  turkeyAll?: number
}

export interface Issue {
  date: string
  cadence?: string
  windowStart: string
  windowEnd: string
  scanStart?: string
  periodLabel: string
  generatedAt?: string
  stats: IssueStats
  journals: JournalCount[]
  direct: Study[]
  trials: Trial[]
  indirect: Indirect[]
  videoCase: TitleOnly[]
  offTopic: TitleOnly[]
  cardiac: TitleOnly[]
  unavailable?: TitleOnly[]
  external?: ExternalItem[]
  coverage?: Coverage[]
  sources: {
    scanned: string[]
    failed: string[]
    empty: string[]
    note?: string
  }
}
