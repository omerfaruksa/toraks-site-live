/** Tarayıcıda tutulan tercih: tema.
 *
 * Sunucu yok; tüm durum `localStorage` içinde. Yazma ve okuma hataları sessizce
 * yutulur (gizli sekme, kota), çünkü site bu bilgi olmadan da çalışır.
 */

export type ThemePref = 'system' | 'light' | 'dark'

const THEME_KEY = 'gclt-theme'

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
