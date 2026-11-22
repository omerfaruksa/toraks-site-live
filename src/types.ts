export type Design = 'rct' | 'meta' | 'cohort' | 'casecontrol' | 'caseseries' | 'nonclinical' | 'other'

export type Access = 'open' | 'abstract'
export type Scope = 'tek_merkezli' | 'cok_merkezli' | ''

export interface Study {
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
  phase: string
  status: string
  dates: string
  enrollment: string
  primary: string
  sponsor: string
}

export interface Indirect {
  id: string
  title: string
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

export interface TitleOnly {
  title: string
  journal: string
  date: string
  url: string
  kind?: 'video' | 'case' | 'other'
  authors?: string
  institutions?: string[]
  turkey?: boolean
  note?: string
}

export interface ExternalItem {
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
  windowStart: string
  windowEnd: string
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
