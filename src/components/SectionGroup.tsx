import type { ReactNode } from 'react'

interface Props {
  id: string
  title: string
  count?: number
  note?: string
  open: boolean
  onToggle: (open: boolean) => void
  children: ReactNode
}

/** İkincil listeler: başlık satırından açılan, varsayılan olarak kapalı bölüm. */
export default function SectionGroup({ id, title, count, note, open, onToggle, children }: Props) {
  return (
    <details className="section section-fold" id={id} open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary>
        <span className="fold-title">{title}</span>
        {typeof count === 'number' && <span className="count">{count}</span>}
      </summary>
      <div className="fold-body">
        {note && <p className="section-note">{note}</p>}
        {children}
      </div>
    </details>
  )
}
