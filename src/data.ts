import type { Design, Issue } from './types'
import indexData from '../content/index.json'

export interface IssueSummary {
  date: string
  periodLabel: string
  direct: number
  indirect: number
  scanned: number
  trials: number
}

export const issueIndex = (indexData as IssueSummary[]).slice().sort((a, b) => (a.date < b.date ? 1 : -1))

const loaders = import.meta.glob<{ default: Issue }>('../content/issues/*.json')

export async function loadIssue(date: string): Promise<Issue | null> {
  const loader = loaders[`../content/issues/${date}.json`]
  if (!loader) return null
  const mod = await loader()
  return mod.default
}

export const DESIGN_ORDER: { key: Design; label: string }[] = [
  { key: 'rct', label: 'Randomize kontrollü çalışma' },
  { key: 'meta', label: 'Meta-analiz / sistematik derleme' },
  { key: 'cohort', label: 'Kohort' },
  { key: 'casecontrol', label: 'Olgu-kontrol' },
  { key: 'caseseries', label: 'Olgu serisi' },
  { key: 'nonclinical', label: 'Klinik dışı' },
  { key: 'other', label: 'Diğer' },
]

export const TAG_ORDER = [
  'Akciğer kanseri cerrahisi',
  'Mediasten',
  'Özofagus',
  'Göğüs duvarı',
  'Plevra',
  'Akciğer nakli',
  'Minimal invaziv ve robotik cerrahi',
  'Toraks travması',
  'Trakea ve hava yolu',
  'Diyafram',
  'Perioperatif bakım/ERAS',
]

export function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y) return iso
  if (!m) return String(y)
  if (!d) {
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('tr-TR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function shortDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
