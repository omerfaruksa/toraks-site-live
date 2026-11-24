import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import Flow from './components/Flow'
import BackToTop from './components/BackToTop'
import { buildEntries } from './entries'
import { formatDate, issueIndex, loadIssue } from './data'
import { THEME_NEXT, applyTheme, readTheme, type ThemePref } from './prefs'
import { SITE } from './site'
import type { Issue } from './types'

function Stats({ issue }: { issue: Issue }) {
  const items = [
    { label: 'Taranan kayıt', value: issue.stats.scanned },
    { label: 'Doğrudan', value: issue.stats.direct },
    { label: 'Dolaylı', value: issue.stats.indirect },
    { label: 'Olgu ve video', value: issue.videoCase.length },
    { label: 'Klinik araştırma', value: issue.trials.length },
  ]
  return (
    <ul className="overview">
      {items.map((item) => (
        <li key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

export default function App() {
  const [theme, setTheme] = useState<ThemePref>(readTheme)
  const [date, setDate] = useState(issueIndex[0]?.date ?? '')
  const [issue, setIssue] = useState<Issue | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (!date) {
      setIssue(null)
      setFailed(true)
      return
    }
    let alive = true
    setFailed(false)
    // Eski sayı ekranda kalmasın: yeni sayı yüklenirken özet ve istatistikler karışmasın.
    setIssue(null)
    loadIssue(date)
      .then((data) => {
        if (!alive) return
        setIssue(data)
        setFailed(!data)
      })
      .catch(() => {
        if (!alive) return
        setIssue(null)
        setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [date])

  const entries = useMemo(() => (issue ? buildEntries(issue) : []), [issue])

  return (
    <>
      <a className="skip-link" href="#akis">
        Kayıtlara geç
      </a>
      <Header
        issues={issueIndex}
        currentDate={date}
        onSelect={setDate}
        theme={theme}
        onCycleTheme={() => setTheme(THEME_NEXT[theme])}
      />

      <main className="shell">
        <div className="intro">
          <h1 className="intro-title">Göğüs cerrahisi literatürü</h1>
          <p className="intro-line">
            {issue
              ? `${formatDate(issue.windowStart)} – ${formatDate(issue.windowEnd)} arasında taranan yayınlar. Kayıtlar tarih sırasıyla listelenir; tür ve konu etiketleri kart üzerinde.`
              : failed
                ? 'Bu tarihe ait sayı bulunamadı.'
                : 'Sayı yükleniyor'}
          </p>
          {issue ? <Stats issue={issue} /> : null}
        </div>

        {failed ? (
          <p className="flow-empty">Bu tarihe ait sayı bulunamadı. Üstteki seçiciden başka bir gün seçin.</p>
        ) : issue ? (
          <Flow entries={entries} issueDate={issue.date} windowStart={issue.windowStart} />
        ) : (
          <p className="flow-empty">Yükleniyor…</p>
        )}
      </main>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <p className="footer-note">
            Kaynaklar PubMed, ClinicalTrials.gov, Europe PMC ve dergi akışlarıdır. Kart bilgileri yalnızca erişilen
            özet veya açık tam metne dayanır; bulunamayan alanlar belirtilmemiş olarak bırakılır.
          </p>
          <div className="footer-actions">
            {SITE.subscribeEmail ? (
              <a
                className="footer-btn"
                href={`mailto:${SITE.subscribeEmail}?subject=${encodeURIComponent('Toraks literatür bülteni aboneliği')}&body=${encodeURIComponent('Günlük ve haftalık bülteni almak istiyorum.')}`}
              >
                E-posta ile abone ol
              </a>
            ) : null}
            <a className="footer-btn" href={SITE.repo} target="_blank" rel="noreferrer noopener">
              Kaynak kod
            </a>
          </div>
          {issue?.generatedAt ? (
            <p className="footer-stamp">Son üretim: {formatDate(issue.generatedAt.slice(0, 10))}</p>
          ) : null}
        </div>
      </footer>

      <BackToTop />
    </>
  )
}
