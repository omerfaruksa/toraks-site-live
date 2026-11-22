interface Props {
  query: string
  onQuery: (v: string) => void
  tag: string
  onTag: (v: string) => void
  interest: 'all' | 'direct' | 'indirect'
  onInterest: (v: 'all' | 'direct' | 'indirect') => void
  tags: string[]
  result: { direct: number; indirect: number } | null
  turkeyOnly: boolean
  onTurkeyOnly: (v: boolean) => void
}

export default function Filters({ query, onQuery, tag, onTag, interest, onInterest, tags, result, turkeyOnly, onTurkeyOnly }: Props) {
  const active = Boolean(query || tag || interest !== 'all' || turkeyOnly)

  return (
    <div className="filters" id="filtreler">
      <div className="shell filters-inner">
        <div className="filter-row">
          <div className="search">
            <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
              <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path d="m15 15 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Başlık, dergi, PMID veya etiket"
              aria-label="Makale ara"
            />
          </div>

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
                className={interest === key ? 'is-active' : ''}
                onClick={() => onInterest(key)}
                aria-pressed={interest === key}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`chip chip-tr ${turkeyOnly ? 'is-active' : ''}`}
            onClick={() => onTurkeyOnly(!turkeyOnly)}
            aria-pressed={turkeyOnly}
            title="Türkiye'den bir kurum veya yazarın yer aldığı kayıtlar"
          >
            Türkiye'den
          </button>
        </div>

        <div className="chips" role="group" aria-label="Konu etiketi">
          <button type="button" className={`chip ${tag === '' ? 'is-active' : ''}`} onClick={() => onTag('')}>
            Tüm konular
          </button>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${tag === t ? 'is-active' : ''}`}
              onClick={() => onTag(tag === t ? '' : t)}
              aria-pressed={tag === t}
            >
              {t}
            </button>
          ))}
        </div>

        {active && result && (
          <p className="filter-result">
            {result.direct} doğrudan, {result.indirect} dolaylı kayıt eşleşti.
            <button
              type="button"
              className="linkish"
              onClick={() => {
                onQuery('')
                onTag('')
                onInterest('all')
                onTurkeyOnly(false)
              }}
            >
              Filtreyi temizle
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
