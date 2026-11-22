import { useState } from 'react'
import type { Scope } from '../types'

export interface SectionOption {
  id: string
  label: string
  count: number
}

export interface BranchOption {
  name: string
  count: number
}

interface Props {
  query: string
  onQuery: (v: string) => void
  tag: string
  onTag: (v: string) => void
  interest: 'all' | 'direct' | 'indirect'
  onInterest: (v: 'all' | 'direct' | 'indirect') => void
  tags: string[]
  turkeyOnly: boolean
  onTurkeyOnly: (v: boolean) => void
  scope: Scope
  onScope: (v: Scope) => void
  multiOnly: boolean
  onMultiOnly: (v: boolean) => void
  intlOnly: boolean
  onIntlOnly: (v: boolean) => void
  branches: string[]
  onBranches: (v: string[]) => void
  branchOptions: BranchOption[]
  section: string
  onSection: (v: string) => void
  sectionOptions: SectionOption[]
  result: { direct: number; indirect: number } | null
  onClear: () => void
}

export default function Filters(p: Props) {
  const [open, setOpen] = useState(false)

  const activeCount =
    (p.interest !== 'all' ? 1 : 0) +
    (p.turkeyOnly ? 1 : 0) +
    (p.tag ? 1 : 0) +
    (p.scope ? 1 : 0) +
    (p.multiOnly ? 1 : 0) +
    (p.intlOnly ? 1 : 0) +
    (p.branches.length > 0 ? 1 : 0)

  const toggleBranch = (name: string) =>
    p.onBranches(p.branches.includes(name) ? p.branches.filter((b) => b !== name) : [...p.branches, name])

  return (
    <div className={`filters ${open ? 'is-open' : ''}`} id="filtreler">
      <div className="shell filters-inner">
        <div className="filter-row">
          <div className="search">
            <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
              <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path d="m15 15 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={p.query}
              onChange={(e) => p.onQuery(e.target.value)}
              placeholder="Başlık, yazar, kurum, dergi, PMID"
              aria-label="Makale ara"
            />
          </div>

          <button
            type="button"
            className={`filters-toggle ${open ? 'is-open' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="filtre-paneli"
          >
            Filtreler
            {activeCount > 0 && <span className="filters-count">{activeCount}</span>}
            <span className="filters-caret" aria-hidden="true">
              {open ? '▾' : '▸'}
            </span>
          </button>
        </div>

        <div className="filters-panel" id="filtre-paneli" hidden={!open}>
            <div className="filter-row">
              <div className="segmented" role="group" aria-label="İlgi sınıfı">
                {(
                  [
                    ['all', 'Tümü'],
                    ['direct', 'Doğrudan'],
                    ['indirect', 'Dolaylı'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={p.interest === key ? 'is-active' : ''}
                    onClick={() => p.onInterest(key)}
                    aria-pressed={p.interest === key}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`chip chip-tr ${p.turkeyOnly ? 'is-active' : ''}`}
                onClick={() => p.onTurkeyOnly(!p.turkeyOnly)}
                aria-pressed={p.turkeyOnly}
                title="Türkiye'den bir kurum veya yazarın yer aldığı kayıtlar"
              >
                Türkiye'den
              </button>
            </div>

            <div className="filter-line">
              <span className="filter-label">Konu</span>
              <div className="chips" role="group" aria-label="Konu etiketi">
                <button
                  type="button"
                  className={`chip ${p.tag === '' ? 'is-active' : ''}`}
                  onClick={() => p.onTag('')}
                  aria-pressed={p.tag === ''}
                >
                  Tüm konular
                </button>
                {p.tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`chip ${p.tag === t ? 'is-active' : ''}`}
                    onClick={() => p.onTag(p.tag === t ? '' : t)}
                    aria-pressed={p.tag === t}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-line">
              <span className="filter-label">Kapsam</span>
              <div className="chips" role="group" aria-label="Çalışma kapsamı">
                <button
                  type="button"
                  className={`chip ${p.scope === '' ? 'is-active' : ''}`}
                  onClick={() => p.onScope('')}
                  aria-pressed={p.scope === ''}
                >
                  Tümü
                </button>
                {(
                  [
                    ['tek_merkezli', 'Tek merkezli'],
                    ['cok_merkezli', 'Çok merkezli'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`chip ${p.scope === key ? 'is-active' : ''}`}
                    onClick={() => p.onScope(p.scope === key ? '' : key)}
                    aria-pressed={p.scope === key}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`chip ${p.multiOnly ? 'is-active' : ''}`}
                  onClick={() => p.onMultiOnly(!p.multiOnly)}
                  aria-pressed={p.multiOnly}
                  title="Yazar kurumlarında birden fazla branş saptanan çalışmalar"
                >
                  Multidisipliner
                </button>
                <button
                  type="button"
                  className={`chip ${p.intlOnly ? 'is-active' : ''}`}
                  onClick={() => p.onIntlOnly(!p.intlOnly)}
                  aria-pressed={p.intlOnly}
                  title="Yazar kurumları iki veya daha fazla ülkede olan çalışmalar"
                >
                  Uluslararası
                </button>
              </div>
            </div>

            {p.branchOptions.length > 0 && (
              <div className="filter-line">
                <span className="filter-label">Branş</span>
                <div className="chips" role="group" aria-label="Ortak branş">
                  <button
                    type="button"
                    className={`chip ${p.branches.length === 0 ? 'is-active' : ''}`}
                    onClick={() => p.onBranches([])}
                    aria-pressed={p.branches.length === 0}
                  >
                    Tüm branşlar
                  </button>
                  {p.branchOptions.map((b) => (
                    <button
                      key={b.name}
                      type="button"
                      className={`chip ${p.branches.includes(b.name) ? 'is-active' : ''}`}
                      onClick={() => toggleBranch(b.name)}
                      aria-pressed={p.branches.includes(b.name)}
                    >
                      {b.name}
                      <span className="chip-count">{b.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {p.sectionOptions.length > 0 && (
              <div className="filter-line">
                <span className="filter-label">Bölüm</span>
                <div className="chips" role="group" aria-label="Diğer listeler">
                  <button
                    type="button"
                    className={`chip ${p.section === '' ? 'is-active' : ''}`}
                    onClick={() => p.onSection('')}
                    aria-pressed={p.section === ''}
                  >
                    Kapalı
                  </button>
                  {p.sectionOptions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`chip ${p.section === s.id ? 'is-active' : ''}`}
                      onClick={() => p.onSection(p.section === s.id ? '' : s.id)}
                      aria-pressed={p.section === s.id}
                    >
                      {s.label}
                      <span className="chip-count">{s.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          {activeCount > 0 && (
            <p className="filter-result">
              <button type="button" className="linkish" onClick={p.onClear}>
                Filtreleri temizle
              </button>
            </p>
          )}
        </div>

        {!open && p.result && (
          <p className="filter-result filter-result-compact">
            {p.result.direct} doğrudan, {p.result.indirect} dolaylı kayıt eşleşti.
            <button type="button" className="linkish" onClick={p.onClear}>
              Filtreyi temizle
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
