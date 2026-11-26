import { useEffect, useRef, useState } from 'react'
import { KIND_LABEL, type Entry } from '../entries'
import { shortDate } from '../data'

const PATHS: Record<string, string> = {
  design: 'M9 3h6M10 3v5.5L5.5 17A3 3 0 0 0 8.2 21h7.6a3 3 0 0 0 2.7-4L14 8.5V3',
  sample: 'M8 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 8 11Zm8 1a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 16 12ZM2.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14 15.4c2.6-.6 5.5 1 5.5 4.6',
  compare: 'M4 8h13l-3-3M20 16H7l3 3',
  outcome: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  result: 'M4 20V10m5 10V4m5 16v-7m5 7V7',
  follow: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3.5 2',
  period: 'M4 6.5h16v14H4zM4 10.5h16M8 3v4M16 3v4',
  phase: 'M12 3 3 8l9 5 9-5-9-5Zm-9 8 9 5 9-5M3 16l9 5 9-5',
  status: 'M3 12h4l2.5-6 4 12 2.5-6h5',
  enroll: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9c0-3.5 3.5-6 8-6s8 2.5 8 6',
  primary: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z',
  sponsor: 'M4 21V6l8-3 8 3v15M9 21v-6h6v6M8 9h.01M12 9h.01M16 9h.01',
  interest: 'M10 13a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 5.8M14 11a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 19.7l1.5-1.5',
  source: 'M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14',
  type: 'M4 4h7l9 9-7 7-9-9V4Zm3.5 3.5h.01',
}

function Icon({ name }: { name: string }) {
  const d = PATHS[name] || PATHS.type
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" className="row-icon">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface Props {
  entry: Entry
  open: boolean
  onToggle: () => void
}

export default function EntryCard({ entry, open, onToggle }: Props) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const hasDetail = Boolean(entry.summary) || entry.rows.length > 0 || Boolean(entry.note)
  const expanded = open && hasDetail
  const bodyId = `entry-${entry.id}`

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copyDoi = async () => {
    try {
      await navigator.clipboard.writeText(entry.url)
      setCopied(true)
      // Önceki zamanlayıcı iptal edilmezse erken kapanıp "Kopyalandı" yanlış kaybolur.
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article className={`entry entry--${entry.kind}${expanded ? ' is-open' : ''}`}>
      <div className="entry-top">
        <span className="entry-date">{shortDate(entry.date)}</span>
        <span className={`entry-kind kind-${entry.kind}`}>{KIND_LABEL[entry.kind]}</span>
        {entry.pubShort ? <span className="entry-design">{entry.pubShort}</span> : null}
        {entry.turkey ? <span className="entry-tr">Türkiye'den</span> : null}
        {entry.access === 'open' || entry.accessStatus === 'tam'
          ? <span className="entry-open">Açık tam metin</span> : null}
        {entry.video ? <span className="entry-open">Video</span> : null}
      </div>

      {hasDetail ? (
        <button
          type="button"
          className="entry-title"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
        >
          {entry.title}
        </button>
      ) : (
        <p className="entry-title">{entry.title}</p>
      )}

      {entry.titleOrig ? <p className="entry-orig">{entry.titleOrig}</p> : null}

      <p className="entry-meta">
        <span className="entry-journal">{entry.journal}</span>
        {entry.authors ? <span className="entry-authors">{entry.authors}</span> : null}
      </p>

      {entry.areas.length > 0 ? (
        <ul className="entry-tags">
          {entry.areas.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : null}

      {entry.approaches.length > 0 || entry.themes.length > 0 ? (
        <ul className="entry-tags entry-tags--soft">
          {entry.approaches.map((name) => (
            <li key={`a-${name}`}>{name}</li>
          ))}
          {entry.themes.map((name) => (
            <li key={`t-${name}`}>{name}</li>
          ))}
        </ul>
      ) : null}

      {expanded ? (
        <div className="entry-body" id={bodyId}>
          {entry.summary ? <p className="entry-summary">{entry.summary}</p> : null}
          {entry.rows.length > 0 ? (
            <dl className="entry-rows">
              {entry.rows.map((r) => (
                <div className="entry-row" key={r.key}>
                  <dt>
                    <Icon name={r.key} />
                    {r.label}
                  </dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {entry.note ? <p className="entry-note">{entry.note}</p> : null}
        </div>
      ) : null}

      <div className="entry-foot">
        {hasDetail ? (
          <button type="button" className="entry-more" onClick={onToggle} aria-expanded={expanded}>
            {expanded ? 'Detayı kapat' : 'Detayı gör'}
            <span className={`entry-caret${expanded ? ' is-open' : ''}`} aria-hidden="true" />
          </button>
        ) : (
          <span />
        )}
        <span className="entry-links">
          <a className="entry-link" href={entry.url} target="_blank" rel="noreferrer noopener">
            {entry.kind === 'arastirma' ? 'Kayda git' : 'Makaleye git'}
          </a>
          <button type="button" className="entry-copy" onClick={copyDoi} title="Bağlantıyı kopyala">
            {copied ? 'Kopyalandı' : 'Bağlantı'}
          </button>
        </span>
      </div>
    </article>
  )
}
