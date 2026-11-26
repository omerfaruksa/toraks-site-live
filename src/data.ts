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

/** Kart üstündeki kısa tasarım etiketi; ayrıntı açmadan okunur. */
export const SHORT_DESIGN: Record<Design, string> = {
  rct: 'RCT',
  meta: 'Meta-analiz',
  cohort: 'Kohort',
  casecontrol: 'Olgu-kontrol',
  caseseries: 'Olgu serisi',
  nonclinical: 'Klinik dışı',
  other: 'Diğer',
}

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

/** Eksen 2: yayın türü. Kartta kısa etiket, süzgeçte tam ad kullanılır. */
export const PUB_ORDER: { key: string; label: string; short: string }[] = [
  { key: 'kilavuz', label: 'Kılavuz / Uzlaşı', short: 'Kılavuz' },
  { key: 'sistematik', label: 'Sistematik Derleme / Meta-Analiz', short: 'Sistematik derleme' },
  { key: 'rct', label: 'Randomize Kontrollü Çalışma', short: 'RKÇ' },
  { key: 'gozlemsel', label: 'Gözlemsel / Kayıt Çalışması', short: 'Gözlemsel' },
  { key: 'teknik_video', label: 'Cerrahi Teknik / Video', short: 'Video / teknik' },
  { key: 'derleme', label: 'Anlatımsal Derleme', short: 'Derleme' },
  { key: 'olgu', label: 'Olgu Sunumu / Küçük Seri', short: 'Olgu' },
  { key: 'editorial', label: 'Editöryal / Yorum / Mektup', short: 'Yorum' },
  { key: 'temel', label: 'Temel / Translasyonel / Deneysel', short: 'Temel' },
]

export const PUB_SHORT: Record<string, string> = Object.fromEntries(
  PUB_ORDER.map((item) => [item.key, item.short]),
)

/** Eksen 3: anatomik ve klinik alan (birincil + en fazla iki ikincil). */
export const AREA_ORDER = [
  'Akciğer Kanseri ve Torasik Onkoloji',
  'Benign Akciğer ve Torasik Enfeksiyonlar',
  'Plevra ve Mezotelyoma',
  'Mediasten ve Timus',
  'Özofagus',
  'Trakea ve Hava Yolu',
  'Göğüs Duvarı, Deformite ve TOS',
  'Diyafram',
  'Toraks Travması',
  'Akciğer Nakli ve ECMO/ECLS',
  'Pediyatrik Göğüs Cerrahisi',
]

/** Eksen 4: cerrahi yaklaşım ve teknoloji. */
export const APPROACH_ORDER = [
  'Açık Cerrahi',
  'VATS',
  'Robotik Cerrahi',
  'Girişimsel Bronkoskopi',
  'Non-Entübe / Spontan Ventilasyon',
  'Genişletilmiş / CPB-ECMO Destekli',
]

/** Eksen 5: çapraz kesitli temalar. */
export const THEME_ORDER = [
  'Perioperatif Bakım / ERAS',
  'Multidisipliner Onkoloji',
  'Evreleme, Tarama ve Tanı',
  'Yapay Zekâ ve Dijital Cerrahi',
  'Cerrahi Eğitim ve İş Gücü',
  'Kalite, Veri Tabanı ve PRO',
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
