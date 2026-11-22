import { useMemo, useState } from 'react'
import type { TitleOnly } from '../types'
import { shortDate } from '../data'
import { matchesTokens, searchText } from '../search'
import Highlight from './Highlight'

interface Props {
  items: TitleOnly[]
  empty: string
  limit?: number
  showAuthors?: boolean
  tokens?: string[]
}

export default function TitleList({ items, empty, limit = 12, showAuthors = false, tokens = [] }: Props) {
  const [open, setOpen] = useState(false)
  const matched = useMemo(() => {
    if (tokens.length === 0) return items
    return items.filter((item) =>
      matchesTokens(searchText(item, [item.title, item.journal, item.authors, item.note]), tokens),
    )
  }, [items, tokens])
  if (items.length === 0) return <p className="empty">{empty}</p>
  if (matched.length === 0) return <p className="empty">Bu listede aramaya uyan kayıt yok.</p>

  const visible = open ? matched : matched.slice(0, limit)
  const hidden = matched.length - visible.length

  return (
    <>
      <ul className="title-list">
        {visible.map((item, i) => (
          <li key={`${item.url}-${i}`}>
            <a href={item.url} target="_blank" rel="noreferrer" className="title-link">
              <Highlight text={item.title} tokens={tokens} />
            </a>
            {item.turkey && <span className="tr-badge tr-badge-sm">Türkiye'den</span>}
            <span className="title-meta">
              {item.journal}
              {item.date ? ` · ${shortDate(item.date)}` : ''}
              {item.kind === 'video' ? ' · video' : item.kind === 'case' ? ' · olgu' : ''}
              {showAuthors && item.authors ? ` · ${item.authors}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button type="button" className="more-btn" onClick={() => setOpen(true)}>
          Tümünü göster ({matched.length})
        </button>
      )}
      {open && matched.length > limit && (
        <button type="button" className="more-btn" onClick={() => setOpen(false)}>
          Daralt
        </button>
      )}
    </>
  )
}
