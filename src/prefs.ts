/** Tarayıcıda tutulan okuma tercihleri: tema, okundu ve kaydedilen işaretleri.
 *
 * Sunucu yok; tüm durum `localStorage` içinde. Yazma ve okuma hataları sessizce
 * yutulur (gizli sekme, kota), çünkü site bu bilgi olmadan da çalışır.
 */

export type ThemePref = 'system' | 'light' | 'dark'

const THEME_KEY = 'gclt-theme'
const READ_KEY = 'gclt-read'
const SAVED_KEY = 'gclt-saved'
const SEEN_KEY = 'gclt-seen'
const LIMIT = 5000

export const THEME_LABEL: Record<ThemePref, string> = {
  system: 'Sistem teması',
  light: 'Açık tema',
  dark: 'Koyu tema',
}

/** Düğmeye her basışta sıradaki tercih: sistem → koyu → açık.
 * Sistemdeyken ilk basış görünür bir değişiklik üretir; açık temada sistem
 * tercihine dönülür, böylece üç durum da tek düğmeyle dolaşılır. */
export const THEME_NEXT: Record<ThemePref, ThemePref> = {
  system: 'dark',
  dark: 'light',
  light: 'system',
}

export function readTheme(): ThemePref {
  try {
    const value = localStorage.getItem(THEME_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    /* depolama kapalı */
  }
  return 'system'
}

export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'system') return pref
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Temayı belgeye uygular ve tercihi saklar; çözülen temayı döndürür. */
export function applyTheme(pref: ThemePref): 'light' | 'dark' {
  const resolved = resolveTheme(pref)
  document.documentElement.dataset.theme = resolved
  try {
    localStorage.setItem(THEME_KEY, pref)
  } catch {
    /* yoksay */
  }
  return resolved
}

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

function writeSet(key: string, value: Set<string>) {
  try {
    const list = [...value]
    localStorage.setItem(key, JSON.stringify(list.slice(-LIMIT)))
  } catch {
    /* yoksay */
  }
}

export function readMarks(): { read: Set<string>; saved: Set<string> } {
  return { read: readSet(READ_KEY), saved: readSet(SAVED_KEY) }
}

export function saveRead(value: Set<string>) {
  writeSet(READ_KEY, value)
}

export function saveSaved(value: Set<string>) {
  writeSet(SAVED_KEY, value)
}

/** Kaydın kalıcı anahtarı: PMID varsa o, yoksa DOI, yoksa iç kimlik. */
export function recordKey(rec: { pmid?: string; doi?: string; id?: string }): string {
  return rec.pmid || rec.doi || rec.id || ''
}

export function readLastSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function markSeen(date: string) {
  try {
    localStorage.setItem(SEEN_KEY, date)
  } catch {
    /* yoksay */
  }
}
