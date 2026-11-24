import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { FLOW_KINDS, KIND_LABEL, KIND_ORDER, type Entry, type Kind } from '../entries'
import { TAG_ORDER } from '../data'
import { matchesTokens, tokenize } from '../search'
import EntryCard from './EntryCard'

const PAGE_SIZE = 20
/** Konu dışı varsayılan akışta yok; liste `entries.ts` içinde tek yerde tutulur. */
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

export default function Flow({ entries, issueDate, windowStart }: Props) {
  const [query, setQuery] = useState('')
  const [kinds, setKinds] = useState<Kind[]>(DEFAULT_KINDS)
  const [tag, setTag] = useState('')
  const [turkeyOnly, setTurkeyOnly] = useState(false)
  const [openOnly, setOpenOnly] = useState(false)
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
      if (tag && !entry.tags.includes(tag)) return false
      if (turkeyOnly && !entry.turkey) return false
      if (openOnly && entry.access !== 'open') return false
      // Klinik araştırmalar on beş günde bir taranıyor: kayıt tarihleri son 24 saate düşmediği
      // için tarih süzgeci onlara uygulanmaz, aksi hâlde akışta hiç görünmezlerdi.
      if (entry.kind !== 'arastirma' && (bounds.from || bounds.to)
        && !within(entry.date, bounds.from, bounds.to)) return false
      return matchesTokens(entry.search, tokens)
    })
  }, [entries, kinds, tag, turkeyOnly, openOnly, bounds, tokens])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)

  // Süzgeç daraldığında sayfa numarası aralık dışında kalmasın.
  useEffect(() => {
    if (page > pages) setPage(pages)
  }, [page, pages])
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const counts = useMemo(() => {
    const map = new Map<Kind, number>()
    for (const entry of entries) map.set(entry.kind, (map.get(entry.kind) || 0) + 1)
    return map
  }, [entries])

  const toggleKind = (kind: Kind) => {
    setKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]))
    setPage(1)
  }

  const reset = () => {
    setQuery('')
    setKinds(DEFAULT_KINDS)
    setTag('')
    setTurkeyOnly(false)
    setOpenOnly(false)
    setRange('recent')
    setFrom(issueDate)
    setTo(issueDate)
    setPage(1)
  }

  // Uzunluk eşitliği yetmez: bir tür çıkıp başkası eklenirse küme değişmiş olur.
  const allKinds = DEFAULT_KINDS.every((kind) => kinds.includes(kind)) && kinds.length === DEFAULT_KINDS.length
  const active = (query ? 1 : 0) + (tag ? 1 : 0) + (turkeyOnly ? 1 : 0) + (openOnly ? 1 : 0)
    + (range === 'recent' ? 0 : 1) + (allKinds ? 0 : 1)

  const goto = (next: number) => {
    setPage(Math.min(Math.max(1, next), pages))
    document.getElementById('akis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
              <button type="button" className={`flow-chip${range === 'recent' ? ' is-on' : ''}`} onClick={() => { setRange('recent'); setPage(1) }}>
                Son 24 saat
              </button>
              <button type="button" className={`flow-chip${range === 'week' ? ' is-on' : ''}`} onClick={() => { setRange('week'); setPage(1) }}>
                Son 7 gün
              </button>
              <button type="button" className={`flow-chip${range === 'all' ? ' is-on' : ''}`} onClick={() => { setRange('all'); setPage(1) }}>
                Tümü
              </button>
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
            <span className="flow-label">Tür</span>
            <div className="flow-chips">
              <button
                type="button"
                className={`flow-chip${allKinds ? ' is-on' : ''}`}
                onClick={() => { setKinds(DEFAULT_KINDS); setPage(1) }}
              >
                Tümü
              </button>
              {KIND_ORDER.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={`flow-chip kind-${kind}${kinds.includes(kind) ? ' is-on' : ''}`}
                  onClick={() => toggleKind(kind)}
                  title={kind === 'arastirma' ? 'ClinicalTrials.gov son 15 gün' : undefined}
                >
                  {KIND_LABEL[kind]}
                  <span className="flow-chip-count">{counts.get(kind) || 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flow-group">
            <span className="flow-label">Konu</span>
            <div className="flow-chips">
              <button type="button" className={`flow-chip${tag === '' ? ' is-on' : ''}`} onClick={() => { setTag(''); setPage(1) }}>
                Tüm konular
              </button>
              {TAG_ORDER.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`flow-chip${tag === name ? ' is-on' : ''}`}
                  onClick={() => { setTag(tag === name ? '' : name); setPage(1) }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="flow-group flow-group--inline">
            <label className="flow-check">
              <input type="checkbox" checked={turkeyOnly} onChange={(e) => { setTurkeyOnly(e.target.checked); setPage(1) }} />
              Türkiye'den
            </label>
            <label className="flow-check">
              <input type="checkbox" checked={openOnly} onChange={(e) => { setOpenOnly(e.target.checked); setPage(1) }} />
              Açık tam metin
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
