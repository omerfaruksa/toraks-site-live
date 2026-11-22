import type { Issue } from '../types'

export default function Sources({ issue }: { issue: Issue }) {
  const { sources, journals } = issue
  const withRecords = journals.filter((j) => j.count > 0)

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

      <details className="sources-wide journal-details">
        <summary>Dergi bazında kayıt sayıları ({withRecords.length})</summary>
        <ul className="journal-counts">
          {withRecords.map((j) => (
            <li key={j.name}>
              <span className={`group-mark group-${j.group || 'x'}`}>{j.group || '–'}</span>
              <span className="jc-name">{j.name}</span>
              <span className="jc-count">{j.count}</span>
            </li>
          ))}
        </ul>
      </details>

      {sources.note && <p className="muted-text sources-wide">{sources.note}</p>}
    </div>
  )
}
