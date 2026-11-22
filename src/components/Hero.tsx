import type { Issue } from '../types'
import { formatDate } from '../data'

export default function Hero({ issue }: { issue: Issue }) {
  const { stats } = issue
  const total = Math.max(stats.scanned, 1)
  const pct = (n: number) => `${(n / total) * 100}%`

  return (
    <section className="hero" id="genel-bakis">
      <p className="eyebrow">
        Sayı · {formatDate(issue.date)}
        <span className="eyebrow-sep" aria-hidden="true">
          /
        </span>
        {issue.stats.journalsScanned} dergi tarandı
      </p>
      <h1 className="hero-title">{issue.periodLabel}</h1>
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
