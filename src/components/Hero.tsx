import type { Issue } from '../types'
import { formatDate } from '../data'

interface Props {
  issue: Issue
  variant?: 'compact' | 'full'
  title?: string
  heading?: 'h1' | 'h2'
  open?: boolean
  onToggle?: () => void
}

/**
 * variant="compact": ana sayfa künyesi. Dönem başlığı ve "Kaynaklar ve detaylar" düğmesi.
 * variant="full": aynı sayfada açılan tarama özeti; sayılar ve dağılım çubuğu.
 */
export default function Hero({ issue, variant = 'compact', title, heading = 'h1', open = false, onToggle }: Props) {
  const { stats } = issue
  const total = Math.max(stats.scanned, 1)
  const pct = (n: number) => `${(n / total) * 100}%`
  const Heading = heading

  if (variant === 'compact') {
    return (
      <section className="hero hero-compact" id="genel-bakis">
        <p className="eyebrow">Sayı · {formatDate(issue.date)}</p>
        <h1 className="hero-title">{issue.periodLabel}</h1>
        <p className="hero-links">
          <button
            type="button"
            className={`hero-detail-link hero-toggle ${open ? 'is-open' : ''}`}
            onClick={onToggle}
            aria-expanded={open}
            aria-controls="kaynaklar"
          >
            Kaynaklar ve detaylar
            <span className="hero-caret" aria-hidden="true">
              {open ? '▴' : '▾'}
            </span>
          </button>
        </p>
      </section>
    )
  }

  return (
    <section className="hero hero-full" id="kaynak-ozeti">
      <p className="eyebrow">
        Sayı · {formatDate(issue.date)}
        <span className="eyebrow-sep" aria-hidden="true">
          /
        </span>
        {stats.journalsScanned} dergi tarandı
        {title ? (
          <>
            <span className="eyebrow-sep" aria-hidden="true">
              /
            </span>
            {issue.periodLabel}
          </>
        ) : null}
      </p>
      <Heading className="hero-title">{title || issue.periodLabel}</Heading>
      <p className="lede">
        {stats.scanned.toLocaleString('tr-TR')} kayıt değerlendirildi. {stats.direct} makale doğrudan
        ilgili bulundu ve çalışma kartı olarak açıldı; {stats.indirect} makale dolaylı olarak
        izleniyor.{stats.turkey ? ` Doğrudan makalelerin ${stats.turkey} tanesi Türkiye'den bir kurum veya yazara ait.` : ''}
      </p>

      <dl className="stats">
        <div className="stat">
          <dt>Taranan kayıt</dt>
          <dd>{stats.scanned.toLocaleString('tr-TR')}</dd>
        </div>
        <div className="stat stat-direct">
          <dt>Doğrudan</dt>
          <dd>{stats.direct}</dd>
        </div>
        <div className="stat">
          <dt>Dolaylı</dt>
          <dd>{stats.indirect}</dd>
        </div>
        <div className="stat">
          <dt>Klinik araştırma</dt>
          <dd>{stats.trials}</dd>
        </div>
        <div className="stat">
          <dt>Türkiye'den</dt>
          <dd>{stats.turkey ?? 0}</dd>
        </div>
        <div className="stat stat-muted">
          <dt>Konu dışı</dt>
          <dd>{stats.offTopic.toLocaleString('tr-TR')}</dd>
        </div>
      </dl>

      <div className="dist" role="img" aria-label={`Dağılım: ${stats.direct} doğrudan, ${stats.indirect} dolaylı, ${stats.offTopic} konu dışı`}>
        <span className="dist-direct" style={{ width: pct(stats.direct) }} />
        <span className="dist-indirect" style={{ width: pct(stats.indirect) }} />
        <span className="dist-off" style={{ width: pct(stats.offTopic) }} />
      </div>
    </section>
  )
}
