import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type { Coverage, Issue } from '../types'
import { fold, matchesTokens, searchText, tokenize } from '../search'

type StatusFilter = '' | 'hit' | 'zero' | 'missing'

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'Tümü' },
  { key: 'hit', label: 'Bu sayıda kayıt var' },
  { key: 'zero', label: 'Bu sayıda kayıt yok' },
  { key: 'missing', label: "PubMed'de yok" },
]

/** "PubMed'de yok" etiketi veri dosyasında serbest metin; eşleşme katlanmış metinden yapılır. */
const isMissing = (c: Coverage) => fold(c.status ?? '').includes('pubmed') && fold(c.status ?? '').includes('yok')

/** Sayı alanı eksik ya da sayı değilse kayıt "var" sayılmaz. */
const hasRecords = (c: Coverage) => Number(c.count7) > 0

export default function Sources({ issue }: { issue: Issue }) {
  const { sources, journals, coverage } = issue
  const withRecords = useMemo(() => journals.filter((j) => j.count > 0), [journals])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [journalOpen, setJournalOpen] = useState(false)
  const [coverageOpen, setCoverageOpen] = useState(false)
  const wasActive = useRef(false)
  const deferredQuery = useDeferredValue(query)

  const tokens = useMemo(() => tokenize(deferredQuery), [deferredQuery])
  const active = tokens.length > 0 || status !== ''

  // Süzgeç ilk kez devreye girdiğinde iki liste açılır; sonrasında kullanıcı istediği gibi kapatabilir.
  useEffect(() => {
    if (active && !wasActive.current) {
      setJournalOpen(true)
      setCoverageOpen(true)
    }
    wasActive.current = active
  }, [active])

  const coverageRows = useMemo(() => {
    if (!coverage) return []
    return coverage.filter((c) => {
      if (status === 'hit' && !hasRecords(c)) return false
      if (status === 'zero' && hasRecords(c)) return false
      if (status === 'missing' && !isMissing(c)) return false
      if (tokens.length === 0) return true
      const text = searchText(c, [c.journal, c.group, c.source, c.status, c.lastEntry, c.issn])
      return matchesTokens(text, tokens)
    })
  }, [coverage, tokens, status])

  const journalRows = useMemo(() => {
    // Liste yalnızca bu sayıda kaydı olan dergileri içerir; "kayıt yok" / "PubMed'de yok"
    // durumunda sonuç kümesi boşalır.
    if (status === 'zero' || status === 'missing') return []
    if (tokens.length === 0) return withRecords
    return withRecords.filter((j) => matchesTokens(searchText(j, [j.name, j.group]), tokens))
  }, [withRecords, tokens, status])

  // "Bu sayıda kayıt yok" / "PubMed'de yok" süzgeçlerinde kayıt listesi tanımı gereği boş kalır;
  // bu durumda liste yerine yalnızca kapsama tablosu sayılır.
  const hideJournalList = (status === 'zero' || status === 'missing') && journalRows.length === 0

  const countParts: string[] = []
  if (!hideJournalList) countParts.push(`Kayıtlı dergi ${journalRows.length}/${withRecords.length}`)
  if (coverage) countParts.push(`Taranan dergi ${coverageRows.length}/${coverage.length}`)
  if (countParts.length === 0) countParts.push('Kapsama verisi yok')

  const clear = () => {
    setQuery('')
    setStatus('')
  }

  return (
    <div className="sources">
      <div className="sources-col">
        <p className="mini-title">Taranan kaynaklar</p>
        <ul className="plain">
          {sources.scanned.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="sources-col">
        <p className="mini-title">Erişilemeyen kaynaklar</p>
        {sources.failed.length === 0 ? (
          <p className="empty">Erişilemeyen kaynak bildirilmedi.</p>
        ) : (
          <ul className="plain plain-warn">
            {sources.failed.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="sources-col sources-wide">
        <p className="mini-title">Kayıt bulunmayan dergiler</p>
        {sources.empty.length === 0 ? (
          <p className="empty">Tüm dergilerde en az bir kayıt bulundu.</p>
        ) : (
          <p className="muted-text">{sources.empty.join(' · ')}</p>
        )}
      </div>

      <div className="sources-wide table-tools">
        <div className="table-search">
          <svg viewBox="0 0 24 24" aria-hidden="true" width="15" height="15">
            <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="m15 15 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Dergi, grup, kaynak veya durum ara"
            aria-label="Dergi listelerinde ve kapsama tablosunda ara"
          />
        </div>
        <div className="chips chips-inline" role="group" aria-label="Kapsama durumu">
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.key || 'all'}
              type="button"
              className={`chip ${status === o.key ? 'is-active' : ''}`}
              onClick={() => setStatus(o.key)}
              aria-pressed={status === o.key}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="table-count" role="status" aria-live="polite">
          {countParts.join(' · ')}
          {active && (
            <button type="button" className="linkish" onClick={clear}>
              Filtreyi temizle
            </button>
          )}
        </p>
      </div>

      {!hideJournalList && (
        <details
          className="sources-wide journal-details"
          open={journalOpen}
          onToggle={(e) => setJournalOpen(e.currentTarget.open)}
        >
          <summary>Dergi bazında kayıt sayıları ({journalRows.length})</summary>
          {journalRows.length === 0 ? (
            <p className="empty">Eşleşen dergi yok.</p>
          ) : (
            <ul className="journal-counts">
              {journalRows.map((j) => (
                <li key={j.name}>
                  <span className={`group-mark group-${j.group || 'x'}`}>{j.group || '–'}</span>
                  <span className="jc-name">{j.name}</span>
                  <span className="jc-count">{j.count}</span>
                </li>
              ))}
            </ul>
          )}
        </details>
      )}

      {coverage && coverage.length > 0 && (
        <details
          className="sources-wide journal-details"
          open={coverageOpen}
          onToggle={(e) => setCoverageOpen(e.currentTarget.open)}
        >
          <summary>Dergi kapsama tablosu ({coverageRows.length})</summary>
          <div className="coverage-wrap">
            <table className="coverage">
              <thead>
                <tr>
                  <th>Dergi</th>
                  <th>Grup</th>
                  <th>Bu sayı</th>
                  <th>30 gün</th>
                  <th>Son kayıt</th>
                  <th>Kaynak</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {coverageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty">
                      Eşleşen dergi yok.
                    </td>
                  </tr>
                ) : (
                  coverageRows.map((c) => (
                    <tr
                      key={c.journal}
                      className={c.count7 > 0 ? 'is-hit' : c.status === "PubMed'de yok" ? 'is-missing' : ''}
                    >
                      <td>{c.journal}</td>
                      <td>{c.group}</td>
                      <td>{c.count7}</td>
                      <td>{c.count30}</td>
                      <td>{c.lastEntry || '—'}</td>
                      <td>{c.source}</td>
                      <td className="cov-status">{c.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="muted-text">
            "Bu sayı" bu sayıya alınan kayıt sayısıdır (içerik filtresi uygulanmış). "30 gün" son
            30 günde PubMed'e giren kayıt sayısı, "Son kayıt" en son PubMed giriş tarihidir ([edat]);
            bu iki sütun filtresizdir ve dergi toplu yükleme yaptığında haftalık sayı sıfır kalabilir.
            "Kaynak" sütunu derginin hangi kanaldan tarandığını gösterir: PubMed, Crossref DOI
            kayıtları, dergi RSS akışı veya makine okunur akış bulunamadı (none).
          </p>
        </details>
      )}

      {sources.note && <p className="muted-text sources-wide">{sources.note}</p>}
    </div>
  )
}
