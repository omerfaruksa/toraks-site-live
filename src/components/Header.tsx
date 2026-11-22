import type { IssueSummary } from '../data'
import { formatDate } from '../data'

interface Props {
  issues: IssueSummary[]
  currentDate: string
  onSelect: (date: string) => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function Header({ issues, currentDate, onSelect, theme, onToggleTheme }: Props) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <a className="wordmark" href="/">
          <svg className="wordmark-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="6.5" y="4.5" width="19" height="23" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M10.6 10.4h10.8M10.6 15h10.8M10.6 19.6h6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="wordmark-text">
            <span className="wordmark-title">Göğüs Cerrahisi Literatürü</span>
            <span className="wordmark-sub">günlük takip</span>
          </span>
        </a>

        <div className="header-tools">
          <label className="issue-picker">
            <span className="issue-picker-label">Sayı</span>
            <select value={currentDate} onChange={(e) => onSelect(e.target.value)} aria-label="Sayı seç">
              {issues.map((i) => (
                <option key={i.date} value={i.date}>
                  {formatDate(i.date)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
            title={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
                <circle cx="12" cy="12" r="4.2" fill="currentColor" />
                <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
                </g>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
                <path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
