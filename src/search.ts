/**
 * Arama yardımcıları.
 *
 * Amaç: her tuş vuruşunda kayıtların metnini yeniden birleştirmemek ve Türkçe/İngilizce
 * karışık başlıklarda harf eşleşmesini kaçırmamak. Kayıt metni bir kez katlanıp
 * (küçük harf + aksan sadeleştirme) zayıf bir önbellekte tutulur; sorgu da aynı
 * katlamadan geçirilip boşlukla ayrılmış terimlere bölünür.
 */

const FOLD_MAP: Record<string, string> = {
  ı: 'i',
  i̇: 'i',
  ş: 's',
  ğ: 'g',
  ç: 'c',
  ö: 'o',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
  é: 'e',
  è: 'e',
  ê: 'e',
  ë: 'e',
  á: 'a',
  à: 'a',
  å: 'a',
  ä: 'a',
  ø: 'o',
  ô: 'o',
  ñ: 'n',
  œ: 'oe',
  æ: 'ae',
  ß: 'ss',
}

const FOLD_RE = new RegExp(`[${Object.keys(FOLD_MAP).join('')}]`, 'g')

/** Küçük harfe indirir, Türkçe i/ı ayrımını ve aksanları sadeleştirir. */
export function fold(value: string): string {
  // Türkçe küçültmede I → ı, İ → i olur; ı da aşağıdaki tabloda i'ye iner.
  return value.toLocaleLowerCase('tr').replace(FOLD_RE, (ch) => FOLD_MAP[ch] ?? ch)
}

const cache = new WeakMap<object, string>()

/**
 * Kaydın aranabilir metni. Aynı nesne için ikinci çağrıda yeniden hesaplanmaz;
 * böylece tuş başına maliyet metin uzunluğundan bağımsız kalır.
 */
export function searchText(record: object, parts: Array<string | undefined | null | string[]>): string {
  const cached = cache.get(record)
  if (cached !== undefined) return cached
  const flat: string[] = []
  for (const part of parts) {
    if (!part) continue
    const value = (Array.isArray(part) ? part.join(' ') : part).trim()
    if (value) flat.push(value)
  }
  const text = fold(flat.join(' ')).trim()
  cache.set(record, text)
  return text
}

/** Sorguyu katlanmış terimlere böler; boş sorgu boş dizi döner. */
export function tokenize(query: string): string[] {
  const folded = fold(query).trim()
  if (!folded) return []
  return folded.split(/\s+/).filter(Boolean)
}

/** Tüm terimler metinde geçiyorsa eşleşir (VE mantığı). */
export function matchesTokens(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  return tokens.every((token) => text.includes(token))
}
