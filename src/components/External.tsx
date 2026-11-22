import type { ExternalItem } from '../types'
import { shortDate } from '../data'

export default function External({ items }: { items: ExternalItem[] }) {
  const sorted = items
    .map((item, i) => ({ item, i, key: item.date || '' }))
    .sort((a, b) => (a.key === b.key ? a.i - b.i : a.key < b.key ? 1 : -1))
    .map((x) => x.item)

  if (items.length === 0) {
    return <p className="empty">Bu dönemde PubMed dışı kaynaklardan yeni kayıt gelmedi.</p>
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
              {it.titleTr || it.title}
            </a>
            {it.turkey && <span className="tr-badge tr-badge-sm">Türkiye'den</span>}
          </div>
          {it.titleTr && <p className="external-orig">{it.title}</p>}
          <p className="external-meta">
            {it.journal}
            {it.date ? ` · ${shortDate(it.date)}` : ''}
            {it.dateBasis ? ` (${it.dateBasis})` : ''}
            {` · kaynak: ${it.source}`}
            {it.doi ? ` · ${it.doi}` : ''}
          </p>
          {(it.authors || (it.institutions && it.institutions.length > 0)) && (
            <p className="indirect-authors">
              {it.authors}
              {it.institutions && it.institutions.length > 0 ? ` · ${it.institutions.join(' · ')}` : ''}
            </p>
          )}
          {it.oneLiner && <p className="indirect-line">{it.oneLiner}</p>}
          {it.note && <p className="external-note">{it.note}</p>}
        </li>
      ))}
    </ul>
  )
}
