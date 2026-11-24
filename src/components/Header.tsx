import { useEffect, useMemo, useState } from 'react'
import type { IssueSummary } from '../data'
import { formatDate } from '../data'
import { THEME_LABEL, type ThemePref } from '../prefs'

/** Sayıları ay bazında gruplar; seçici bir yıldan sonra da taranabilir kalır. */
function groupByMonth(issues: IssueSummary[]) {
  const groups: { key: string; label: string; items: IssueSummary[] }[] = []
  for (const issue of issues) {
    const key = issue.date.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.items.push(issue)
    } else {
      const label = new Date(`${key}-01T00:00:00`).toLocaleDateString('tr-TR', {
        month: 'long',
        year: 'numeric',
      })
      groups.push({ key, label, items: [issue] })
    }
  }
  return groups
}

function ThemeIcon({ theme }: { theme: ThemePref }) {
  if (theme === 'dark') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
        <path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z" fill="currentColor" />
      </svg>
    )
  }
  if (theme === 'light') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
        <circle cx="12" cy="12" r="4.2" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
        </g>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
      <circle cx="12" cy="12" r="7.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 4.6a7.4 7.4 0 0 1 0 14.8Z" fill="currentColor" />
    </svg>
  )
}

interface Props {
  issues: IssueSummary[]
  currentDate: string
  onSelect: (date: string) => void
  theme: ThemePref
  onCycleTheme: () => void
  detailsOpen?: boolean
  onToggleDetails?: () => void
  lastSeen?: string
}

export default function Header({
  issues,
  currentDate,
  onSelect,
  theme,
  onCycleTheme,
  detailsOpen = false,
  onToggleDetails,
  lastSeen = '',
}: Props) {
  const months = useMemo(() => groupByMonth(issues), [issues])
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 120)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`site-header ${compact ? 'is-compact' : ''}`}>
      <div className="shell header-inner">
        <a className="wordmark" href="/">
          <svg className="wordmark-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="6.5" y="4.5" width="19" height="23" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M10.6 10.4h10.8M10.6 15h10.8M10.6 19.6h6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="wordmark-text">
            <span className="wordmark-title">Göğüs Cerrahisi Literatürü</span>
          </span>
        </a>

        <div className="header-tools">
          {onToggleDetails && (
            <button
              type="button"
              className={`header-link ${detailsOpen ? 'is-open' : ''}`}
              onClick={onToggleDetails}
              aria-expanded={detailsOpen}
              aria-controls="kaynaklar"
              title="Kaynaklar ve detaylar"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" width="15" height="15">
                <path d="M5 5.6h6.4a2 2 0 0 1 2 2v10.8a1.6 1.6 0 0 0-1.6-1.6H5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M19 5.6h-4.6a2 2 0 0 0-1 .3v12.5a1.6 1.6 0 0 1 1.6-1.6H19Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              <span className="header-link-text">Kaynaklar</span>
            </button>
          )}
          <label className="issue-picker">
            <span className="issue-picker-label">Sayı</span>
            <select value={currentDate} onChange={(e) => onSelect(e.target.value)} aria-label="Sayı seç">
              {months.map((m) => (
                <optgroup key={m.key} label={m.label}>
                  {m.items.map((i) => (
                    <option key={i.date} value={i.date}>
                      {`${lastSeen && i.date > lastSeen ? '• ' : ''}${formatDate(i.date)} · ${i.direct + i.indirect}`}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="icon-btn"
            onClick={onCycleTheme}
            aria-label={`Tema: ${THEME_LABEL[theme]}. Değiştir`}
            title={`Tema: ${THEME_LABEL[theme]} (tıkla: değiştir)`}
          >
            <ThemeIcon theme={theme} />
          </button>
        </div>
      </div>
    </header>
  )
}
