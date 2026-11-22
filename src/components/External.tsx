import { useMemo } from 'react'
import type { ExternalItem } from '../types'
import { byDateDesc, shortDate } from '../data'
import { matchesTokens, searchText } from '../search'
import Highlight from './Highlight'

// Varsayılan boş dizi modül düzeyinde: her render'da yeni dizi useMemo'yu bozuyordu.
const NO_TOKENS: string[] = []

export default function External({ items, tokens = NO_TOKENS }: { items: ExternalItem[]; tokens?: string[] }) {
  const matched = useMemo(() => {
    if (tokens.length === 0) return items
    return items.filter((item) =>
      matchesTokens(
        searchText(item, [item.titleTr, item.title, item.journal, item.authors, item.oneLiner, item.doi]),
        tokens,
      ),
    )
  }, [items, tokens])
  const sorted = useMemo(() => byDateDesc(matched), [matched])

  if (items.length === 0) {
    return <p className="empty">Bu dönemde PubMed dışı kaynaklardan yeni kayıt gelmedi.</p>
  }
  if (matched.length === 0) {
    return <p className="empty">Bu listede aramaya uyan kayıt yok.</p>
  }
  return (
    <ul className="external-list">
      {sorted.map((it, i) => (
        <li key={`${it.doi || it.url || it.title}-${i}`}>
          <div className="external-head">
            {it.interestLabel && (
              <span className={`interest-mark interest-${it.interest}`}>{it.interestLabel}</span>
            )}
            <a href={it.url} target="_blank" rel="noreferrer" className="external-title">
              <Highlight text={it.titleTr || it.title} tokens={tokens} />
            </a>
            {it.turkey && <span className="tr-badge tr-badge-sm">Türkiye'den</span>}
          </div>
          {it.titleTr && (
            <p className="external-orig">
              <Highlight text={it.title} tokens={tokens} />
            </p>
          )}
          <p className="external-meta">
            {it.journal}
            {it.date ? ` · ${shortDate(it.date)}` : ''}
            {it.dateBasis ? ` (${it.dateBasis})` : ''}
            {` · kaynak: ${it.source}`}
            {it.doi ? ` · ${it.doi}` : ''}
          </p>
          {(it.authors || (it.institutions && it.institutions.length > 0)) && (
            <p className="indirect-authors">
              {[it.authors, ...(it.institutions ?? [])].filter(Boolean).join(' · ')}
            </p>
          )}
          {it.oneLiner && <p className="indirect-line">{it.oneLiner}</p>}
          {it.note && <p className="external-note">{it.note}</p>}
        </li>
      ))}
    </ul>
  )
}
