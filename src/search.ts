/**
 * Arama yardımcıları.
 *
 * Amaç: her tuş vuruşunda kayıtların metnini yeniden birleştirmemek, Türkçe/İngilizce
 * karışık başlıklarda harf eşleşmesini kaçırmamak ve eşleşen yerleri işaretleyebilmek.
 * Kayıt metni bir kez katlanıp (küçük harf + aksan sadeleştirme) zayıf bir önbellekte
 * tutulur; sorgu da aynı katlamadan geçirilip terimlere bölünür.
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

/**
 * Kart metnini aranabilir hâle getirir: parçaları birleştirip katlar.
 * Katlama burada yapılmalı; aksi hâlde "gogus" sorgusu "Göğüs" kaydını bulmaz.
 */
export function composeSearchText(parts: Array<string | undefined | null>): string {
  return fold(parts.filter(Boolean).join(' '))
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

/**
 * Sorguyu terimlere böler. Tırnak içindeki ifade tek terim sayılır ("toraks travması"),
 * böylece kelimelerin yan yana gelmesi istenebilir; tırnaksız terimler VE mantığıyla aranır.
 */
export function tokenize(query: string): string[] {
  const folded = fold(query).trim()
  if (!folded) return []
  const tokens: string[] = []
  const re = /"([^"]+)"|(\S+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(folded)) !== null) {
    const token = (match[1] ?? match[2] ?? '').trim()
    if (token) tokens.push(token)
  }
  return tokens
}

/** Tüm terimler metinde geçiyorsa eşleşir (VE mantığı). */
export function matchesTokens(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  return tokens.every((token) => text.includes(token))
}

/** Tek karakterin katlanmış hâli; bazı harfler iki karaktere açılır (œ → oe). */
function foldChar(ch: string): string {
  return fold(ch)
}

/**
 * Metni katlarken kaynak konumlarını da taşır. Katlama uzunluğu değişebildiği için
 * (œ → oe) her üretilen karakterin hangi kaynak karakterden geldiği saklanır.
 */
function foldWithMap(value: string): { folded: string; map: number[] } {
  let folded = ''
  const map: number[] = []
  for (let i = 0; i < value.length; i += 1) {
    const part = foldChar(value[i])
    folded += part
    for (let k = 0; k < part.length; k += 1) map.push(i)
  }
  return { folded, map }
}

export interface Segment {
  text: string
  match: boolean
}

/**
 * Metni eşleşen ve eşleşmeyen parçalara böler; vurgulama için kullanılır.
 * Katlanmış metinde bulunan aralıklar kaynak metnin sınırlarına geri çevrilir.
 */
export function highlight(text: string, tokens: string[]): Segment[] {
  if (!text) return []
  if (tokens.length === 0) return [{ text, match: false }]

  const { folded, map } = foldWithMap(text)
  const flags = new Array<boolean>(text.length).fill(false)

  for (const token of tokens) {
    if (!token) continue
    let from = 0
    for (;;) {
      const at = folded.indexOf(token, from)
      if (at === -1) break
      const start = map[at]
      const end = map[at + token.length - 1] + 1
      for (let i = start; i < end; i += 1) flags[i] = true
      from = at + 1
    }
  }

  const segments: Segment[] = []
  let cursor = 0
  while (cursor < text.length) {
    const match = flags[cursor]
    let end = cursor + 1
    while (end < text.length && flags[end] === match) end += 1
    segments.push({ text: text.slice(cursor, end), match })
    cursor = end
  }
  return segments
}
