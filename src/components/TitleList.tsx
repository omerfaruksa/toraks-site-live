import { useState } from 'react'
import type { TitleOnly } from '../types'
import { shortDate } from '../data'

interface Props {
  items: TitleOnly[]
  empty: string
  limit?: number
}

export default function TitleList({ items, empty, limit = 12 }: Props) {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return <p className="empty">{empty}</p>

  const visible = open ? items : items.slice(0, limit)
  const hidden = items.length - visible.length

  return (
    <>
      <ul className="title-list">
        {visible.map((item, i) => (
          <li key={`${item.url}-${i}`}>
            <a href={item.url} target="_blank" rel="noreferrer" className="title-link">
              {item.title}
            </a>
            <span className="title-meta">
              {item.journal}
              {item.date ? ` · ${shortDate(item.date)}` : ''}
              {item.kind === 'video' ? ' · video' : item.kind === 'case' ? ' · olgu' : ''}
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button type="button" className="more-btn" onClick={() => setOpen(true)}>
          Tümünü göster ({items.length})
        </button>
      )}
      {open && items.length > limit && (
        <button type="button" className="more-btn" onClick={() => setOpen(false)}>
          Daralt
        </button>
      )}
    </>
  )
}
