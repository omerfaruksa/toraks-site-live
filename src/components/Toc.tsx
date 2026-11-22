export interface TocItem {
  id: string
  label: string
  count?: number
}

export default function Toc({ items, variant }: { items: TocItem[]; variant: 'aside' | 'inline' }) {
  const list = (
    <ol className="toc-list">
      {items.map((i) => (
        <li key={i.id}>
          <a href={`#${i.id}`}>
            <span>{i.label}</span>
            {typeof i.count === 'number' && <span className="toc-count">{i.count}</span>}
          </a>
        </li>
      ))}
    </ol>
  )

  if (variant === 'aside') {
    return (
      <aside className="toc" aria-label="İçindekiler">
        <p className="toc-title">İçindekiler</p>
        {list}
      </aside>
    )
  }

  return (
    <details className="toc-inline">
      <summary>İçindekiler</summary>
      {list}
    </details>
  )
}
