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
  try {
    const mod = await loader()
    return mod.default
  } catch (err) {
    console.error('Sayı yüklenemedi', date, err)
    return null
  }
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

/** ISO tarihi (YYYY-MM-DD) sayı üçlüsüne çevirir; eksik parçalar 0 döner. */
function parseIso(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number)
  return [y || 0, m || 0, d || 0]
}

function trDate(y: number, m: number, d: number, options: Intl.DateTimeFormatOptions): string {
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('tr-TR', { ...options, timeZone: 'UTC' })
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = parseIso(iso)
  if (!y) return iso
  if (!m) return String(y)
  if (!d) return trDate(y, m, 1, { month: 'long', year: 'numeric' })
  return trDate(y, m, d, { day: 'numeric', month: 'long', year: 'numeric' })
}

export function shortDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = parseIso(iso)
  if (!y || !m || !d) return iso
  return trDate(y, m, d, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Tarihe göre yeniden eskiye; tarihi olmayan kayıtlar sona düşer, kendi aralarında sıra korunur. */
export function byDateDesc<T extends { entryDate?: string; date?: string }>(items: T[]): T[] {
  return items
    .map((item, i) => ({ item, i, key: item.entryDate || item.date || '' }))
    .sort((a, b) => (a.key === b.key ? a.i - b.i : a.key < b.key ? 1 : -1))
    .map((x) => x.item)
}
