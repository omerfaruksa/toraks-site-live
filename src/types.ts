export type Design = 'rct' | 'meta' | 'cohort' | 'casecontrol' | 'caseseries' | 'nonclinical' | 'other'

export type Access = 'open' | 'abstract'

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
  pmid: string
  doi: string
  url: string
  oneLiner: string
  tags: string[]
}

export interface TitleOnly {
  title: string
  journal: string
  date: string
  url: string
  kind?: 'video' | 'case' | 'other'
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
  sources: {
    scanned: string[]
    failed: string[]
    empty: string[]
    note?: string
  }
}
