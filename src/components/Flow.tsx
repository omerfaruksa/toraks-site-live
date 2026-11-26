import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { FLOW_KINDS, KIND_LABEL, KIND_ORDER, type Entry, type Kind } from '../entries'
import { APPROACH_ORDER, AREA_ORDER, PUB_ORDER, THEME_ORDER } from '../data'
import { matchesTokens, tokenize } from '../search'
import EntryCard from './EntryCard'

const PAGE_SIZE = 20
/** Kardiyak ve konu dışı kayıtlar varsayılan akışta yok; arşivden seçilir. */
const DEFAULT_KINDS = FLOW_KINDS

type Range = 'recent' | 'week' | 'all' | 'custom'

interface Props {
  entries: Entry[]
  issueDate: string
  windowStart: string
}

function within(date: string, from: string, to: string): boolean {
  if (!date) return false
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

interface ChipProps {
  on: boolean
  onClick: () => void
  count?: number
  children: ReactNode
  extra?: string
  title?: string
}

function Chip({ on, onClick, count, children, extra = '', title }: ChipProps) {
  return (
    <button
      type="button"
      className={`flow-chip${extra}${on ? ' is-on' : ''}`}
      onClick={onClick}
      title={title}
      aria-pressed={on}
    >
      {children}
      {typeof count === 'number' ? <span className="flow-chip-count">{count}</span> : null}
    </button>
  )
}

interface FacetProps {
  label: string
  allLabel: string
  value: string
  onChange: (next: string) => void
  items: { key: string; label: string; count: number }[]
}

function Facet({ label, allLabel, value, onChange, items }: FacetProps) {
  return (
    <div className="flow-group">
      <span className="flow-label">{label}</span>
      <div className="flow-chips">
        <Chip on={value === ''} onClick={() => onChange('')}>{allLabel}</Chip>
        {items.filter((item) => item.count > 0 || item.key === value).map((item) => (
          <Chip
            key={item.key}
            on={value === item.key}
            count={item.count}
            onClick={() => onChange(value === item.key ? '' : item.key)}
          >
            {item.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

export default function Flow({ entries, issueDate, windowStart }: Props) {
  const [query, setQuery] = useState('')
  const [kinds, setKinds] = useState<Kind[]>(DEFAULT_KINDS)
  const [pubType, setPubType] = useState('')
  const [area, setArea] = useState('')
  const [approach, setApproach] = useState('')
  const [theme, setTheme] = useState('')
  const [turkeyOnly, setTurkeyOnly] = useState(false)
  const [openOnly, setOpenOnly] = useState(false)
  const [highOnly, setHighOnly] = useState(false)
  const [videoOnly, setVideoOnly] = useState(false)
  const [range, setRange] = useState<Range>('recent')
  const [from, setFrom] = useState(issueDate)
  const [to, setTo] = useState(issueDate)
  const [page, setPage] = useState(1)
  const [panel, setPanel] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query)

  // Sayı değişince süzgeç varsayılana döner: dünün aralığı bugünün sayısını gizlemesin.
  useEffect(() => {
    setRange('recent')
    setFrom(issueDate)
    setTo(issueDate)
    setPage(1)
  }, [issueDate])

  const tokens = useMemo(() => tokenize(deferredQuery), [deferredQuery])

  // PubMed giriş tarihi bir gün geciktiği için sayı tarihinde çoğu gün kayıt olmuyor.
  // Varsayılan görünüm son 24 saat: dünün girişleri bugünün partisi sayılır.
  const yesterday = useMemo(() => {
    const d = new Date(`${issueDate}T00:00:00Z`)
    if (Number.isNaN(d.getTime())) return issueDate
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
  }, [issueDate])

  const bounds = useMemo(() => {
    if (range === 'recent') return { from: yesterday, to: issueDate }
    if (range === 'week') return { from: windowStart, to: issueDate }
    if (range === 'all') return { from: '', to: '' }
    return { from, to }
  }, [range, yesterday, issueDate, windowStart, from, to])

  const filtered = useMemo(() => {
    const picked = new Set(kinds)
    return entries.filter((entry) => {
      if (!picked.has(entry.kind)) return false
      if (pubType && entry.pubType !== pubType) return false
      if (area && !entry.areas.includes(area)) return false
      if (approach && !entry.approaches.includes(approach)) return false
      if (theme && !entry.themes.includes(theme)) return false
      if (turkeyOnly && !entry.turkey) return false
      if (openOnly && entry.access !== 'open' && entry.accessStatus !== 'tam') return false
      if (highOnly && entry.evidence !== 'yuksek') return false
      if (videoOnly && !entry.video) return false
      // Klinik araştırmalar iki haftada bir taranıyor: kayıt tarihleri son 24 saate düşmediği
      // için tarih süzgeci onlara uygulanmaz, aksi hâlde akışta hiç görünmezlerdi.
      if (entry.kind !== 'arastirma' && (bounds.from || bounds.to)
        && !within(entry.date, bounds.from, bounds.to)) return false
      return matchesTokens(entry.search, tokens)
    })
  }, [entries, kinds, pubType, area, approach, theme, turkeyOnly, openOnly, highOnly, videoOnly,
    bounds, tokens])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)

  // Süzgeç daraldığında sayfa numarası aralık dışında kalmasın.
  useEffect(() => {
    if (page > pages) setPage(pages)
  }, [page, pages])
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  // Eksen sayaçları tek geçişte hesaplanır; her çip için ayrı filtre çalıştırılmaz.
  const counts = useMemo(() => {
    const picked = new Set(kinds)
    const byKind = new Map<string, number>()
    const byPub = new Map<string, number>()
    const byArea = new Map<string, number>()
    const byApproach = new Map<string, number>()
    const byTheme = new Map<string, number>()
    const bump = (map: Map<string, number>, key?: string) => {
      if (key) map.set(key, (map.get(key) || 0) + 1)
    }
    // Sayaçlar seçili ilgi sınıflarına göre hesaplanır: arşivdeki 900 konu dışı
    // kayıt, "Gözlemsel 457" gibi yanıltıcı sayılar üretiyordu.
    for (const entry of entries) {
      if (!picked.has(entry.kind)) continue
      bump(byKind, entry.kind)
      bump(byPub, entry.pubType)
      entry.areas.forEach((name) => bump(byArea, name))
      entry.approaches.forEach((name) => bump(byApproach, name))
      entry.themes.forEach((name) => bump(byTheme, name))
    }
    return { byKind, byPub, byArea, byApproach, byTheme }
  }, [entries, kinds])

  const toggleKind = (kind: Kind) => {
    setKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]))
    setPage(1)
  }

  const reset = () => {
    setQuery('')
    setKinds(DEFAULT_KINDS)
    setPubType('')
    setArea('')
    setApproach('')
    setTheme('')
    setTurkeyOnly(false)
    setOpenOnly(false)
    setHighOnly(false)
    setVideoOnly(false)
    setRange('recent')
    setFrom(issueDate)
    setTo(issueDate)
    setPage(1)
  }

  // Uzunluk eşitliği yetmez: bir tür çıkıp başkası eklenirse küme değişmiş olur.
  const allKinds = DEFAULT_KINDS.every((kind) => kinds.includes(kind)) && kinds.length === DEFAULT_KINDS.length
  const active = (query ? 1 : 0) + (pubType ? 1 : 0) + (area ? 1 : 0) + (approach ? 1 : 0)
    + (theme ? 1 : 0) + (turkeyOnly ? 1 : 0) + (openOnly ? 1 : 0) + (highOnly ? 1 : 0)
    + (videoOnly ? 1 : 0) + (range === 'recent' ? 0 : 1) + (allKinds ? 0 : 1)

  const goto = (next: number) => {
    setPage(Math.min(Math.max(1, next), pages))
    document.getElementById('akis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pubItems = PUB_ORDER.map((item) => ({ key: item.key, label: item.label, count: counts.byPub.get(item.key) || 0 }))
  const areaItems = AREA_ORDER.map((name) => ({ key: name, label: name, count: counts.byArea.get(name) || 0 }))
  const approachItems = APPROACH_ORDER.map((name) => ({ key: name, label: name, count: counts.byApproach.get(name) || 0 }))
  const themeItems = THEME_ORDER.map((name) => ({ key: name, label: name, count: counts.byTheme.get(name) || 0 }))

  return (
    <section className="flow" id="akis" aria-label="Çalışmalar">
      <div className="flow-bar">
        <div className="flow-count">
          <strong>{filtered.length}</strong> kayıt
          {range === 'recent' ? <span className="flow-sub"> · son 24 saat</span> : null}
        </div>
        <div className="flow-actions">
          <input
            className="flow-search"
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            placeholder="Başlık, yazar, dergi ara"
            aria-label="Kayıtlarda ara"
          />
          <button
            type="button"
            className={`flow-toggle${panel ? ' is-open' : ''}`}
            onClick={() => setPanel((v) => !v)}
            aria-expanded={panel}
          >
            Filtreler{active > 0 ? <span className="flow-badge">{active}</span> : null}
            <span className={`entry-caret${panel ? ' is-open' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {panel ? (
        <div className="flow-panel">
          <div className="flow-group">
            <span className="flow-label">Tarih</span>
            <div className="flow-chips">
              <Chip on={range === 'recent'} onClick={() => { setRange('recent'); setPage(1) }}>Son 24 saat</Chip>
              <Chip on={range === 'week'} onClick={() => { setRange('week'); setPage(1) }}>Son 7 gün</Chip>
              <Chip on={range === 'all'} onClick={() => { setRange('all'); setPage(1) }}>Tümü</Chip>
              <label className={`flow-chip flow-chip--date${range === 'custom' ? ' is-on' : ''}`}>
                <input
                  type="date"
                  value={from}
                  max={to || issueDate}
                  onChange={(e) => {
                    setFrom(e.target.value)
                    if (to && e.target.value > to) setTo(e.target.value)
                    setRange('custom')
                    setPage(1)
                  }}
                  aria-label="Başlangıç tarihi"
                />
                <span>–</span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  max={issueDate}
                  onChange={(e) => {
                    setTo(e.target.value)
                    if (from && e.target.value < from) setFrom(e.target.value)
                    setRange('custom')
                    setPage(1)
                  }}
                  aria-label="Bitiş tarihi"
                />
              </label>
            </div>
          </div>

          <div className="flow-group">
            <span className="flow-label">İlgi</span>
            <div className="flow-chips">
              <Chip on={allKinds} onClick={() => { setKinds(DEFAULT_KINDS); setPage(1) }}>Tümü</Chip>
              {KIND_ORDER.map((kind) => (
                <Chip
                  key={kind}
                  on={kinds.includes(kind)}
                  count={counts.byKind.get(kind) || 0}
                  extra={` kind-${kind}`}
                  title={kind === 'kardiyak' || kind === 'konu_disi' ? 'Arşiv: varsayılan akışta gizli' : undefined}
                  onClick={() => toggleKind(kind)}
                >
                  {KIND_LABEL[kind]}
                </Chip>
              ))}
            </div>
          </div>

          <Facet label="Yayın türü" allLabel="Tüm türler" value={pubType} onChange={(v) => { setPubType(v); setPage(1) }} items={pubItems} />
          <Facet label="Alan" allLabel="Tüm alanlar" value={area} onChange={(v) => { setArea(v); setPage(1) }} items={areaItems} />
          <Facet label="Yaklaşım" allLabel="Tüm yaklaşımlar" value={approach} onChange={(v) => { setApproach(v); setPage(1) }} items={approachItems} />
          <Facet label="Tema" allLabel="Tüm temalar" value={theme} onChange={(v) => { setTheme(v); setPage(1) }} items={themeItems} />

          <div className="flow-group flow-group--inline">
            <label className="flow-check">
              <input type="checkbox" checked={turkeyOnly} onChange={(e) => { setTurkeyOnly(e.target.checked); setPage(1) }} />
              Türkiye'den
            </label>
            <label className="flow-check">
              <input type="checkbox" checked={openOnly} onChange={(e) => { setOpenOnly(e.target.checked); setPage(1) }} />
              Açık tam metin
            </label>
            <label className="flow-check">
              <input type="checkbox" checked={highOnly} onChange={(e) => { setHighOnly(e.target.checked); setPage(1) }} />
              Yüksek kanıt
            </label>
            <label className="flow-check">
              <input type="checkbox" checked={videoOnly} onChange={(e) => { setVideoOnly(e.target.checked); setPage(1) }} />
              Video içerir
            </label>
            <button type="button" className="flow-reset" onClick={reset}>Sıfırla</button>
          </div>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className="flow-empty">
          Bu süzgeçle kayıt yok. Tarih aralığını genişletin veya tür seçimini açın.
        </p>
      ) : (
        <div className="entry-list">
          {shown.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              open={openId === entry.id}
              onToggle={() => setOpenId((prev) => (prev === entry.id ? null : entry.id))}
            />
          ))}
        </div>
      )}

      {pages > 1 ? (
        <nav className="pager" aria-label="Sayfalar">
          <button type="button" className="pager-btn" onClick={() => goto(current - 1)} disabled={current === 1}>
            Önceki
          </button>
          <span className="pager-info">
            {current} / {pages}
          </span>
          <button type="button" className="pager-btn" onClick={() => goto(current + 1)} disabled={current === pages}>
            Sonraki
          </button>
        </nav>
      ) : null}
    </section>
  )
}
