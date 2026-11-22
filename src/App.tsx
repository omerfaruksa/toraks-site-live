import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Filters from './components/Filters'
import StudyCard from './components/StudyCard'
import Toc, { type TocItem } from './components/Toc'
import Trials from './components/Trials'
import TitleList from './components/TitleList'
import Sources from './components/Sources'
import { DESIGN_ORDER, TAG_ORDER, issueIndex, loadIssue, shortDate } from './data'
import type { Design, Indirect, Issue, Study } from './types'

const norm = (s: string) => s.toLocaleLowerCase('tr')

function primaryTag(s: Study): string {
  const ordered = [...s.tags].sort((a, b) => {
    const ia = TAG_ORDER.indexOf(a)
    const ib = TAG_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  return ordered[0] ?? 'Diğer'
}

function matchesQuery(s: { titleTr?: string; titleOrig?: string; title?: string; journal: string; summary?: string; oneLiner?: string; pmid: string; doi: string; tags?: string[] }, q: string) {
  if (!q) return true
  const hay = norm(
    [s.titleTr, s.titleOrig, s.title, s.journal, s.summary, s.oneLiner, s.pmid, s.doi, (s.tags ?? []).join(' ')]
      .filter(Boolean)
      .join(' '),
  )
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => hay.includes(token))
}

export default function App() {
  const [date, setDate] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('sayi')
    return p && issueIndex.some((i) => i.date === p) ? p : issueIndex[0]?.date ?? ''
  })
  const [issue, setIssue] = useState<Issue | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'),
  )
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')
  const [interest, setInterest] = useState<'all' | 'direct' | 'indirect'>('all')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('gclt-theme', theme)
  }, [theme])

  useEffect(() => {
    let alive = true
    setIssue(null)
    loadIssue(date).then((i) => {
      if (alive) setIssue(i)
    })
    return () => {
      alive = false
    }
  }, [date])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (date) url.searchParams.set('sayi', date)
    else url.searchParams.delete('sayi')
    window.history.replaceState({}, '', url)
    setQuery('')
    setTag('')
    setInterest('all')
    window.scrollTo({ top: 0 })
  }, [date])

  const filtered = useMemo(() => {
    if (!issue) return { direct: [] as Study[], indirect: [] as Indirect[] }
    const direct = issue.direct.filter(
      (s) => (tag === '' || s.tags.includes(tag)) && matchesQuery(s, query),
    )
    const indirect = issue.indirect.filter(
      (s) => (tag === '' || s.tags.includes(tag)) && matchesQuery(s, query),
    )
    return { direct, indirect }
  }, [issue, tag, query])

  const tagOptions = useMemo(() => {
    if (!issue) return []
    const present = new Set<string>()
    issue.direct.forEach((s) => s.tags.forEach((t) => present.add(t)))
    issue.indirect.forEach((s) => s.tags.forEach((t) => present.add(t)))
    return TAG_ORDER.filter((t) => present.has(t))
  }, [issue])

  if (!issue) {
    return (
      <>
        <Header
          issues={issueIndex}
          currentDate={date}
          onSelect={setDate}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />
        <div className="shell">
          <p className="empty" style={{ paddingTop: '2rem' }}>
            {issueIndex.length === 0 ? 'Henüz yayımlanmış sayı yok.' : 'Sayı yükleniyor…'}
          </p>
        </div>
      </>
    )
  }

  const showDirect = interest !== 'indirect'
  const showIndirect = interest !== 'direct'

  const designGroups = DESIGN_ORDER.map((d) => ({
    ...d,
    items: filtered.direct.filter((s) => s.design === (d.key as Design)),
  })).filter((g) => g.items.length > 0)

  const toc: TocItem[] = [
    { id: 'genel-bakis', label: 'Genel bakış' },
    { id: 'dogrudan', label: 'Doğrudan makaleler', count: filtered.direct.length },
    { id: 'arastirmalar', label: 'Klinik araştırmalar', count: issue.trials.length },
    { id: 'dolayli', label: 'Dolaylı makaleler', count: filtered.indirect.length },
    { id: 'video-olgu', label: 'Video ve olgu', count: issue.videoCase.length },
    { id: 'konu-disi', label: 'Konu dışı', count: issue.offTopic.length },
    { id: 'kaynaklar', label: 'Kaynaklar' },
  ]
  if (issue.cardiac.length > 0) {
    toc.splice(6, 0, { id: 'kardiyak', label: 'Kardiyak içerik', count: issue.cardiac.length })
  }

  return (
    <>
      <Header
        issues={issueIndex}
        currentDate={issue.date}
        onSelect={setDate}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      <div className="shell">
        <Hero issue={issue} />
      </div>

      <Filters
        query={query}
        onQuery={setQuery}
        tag={tag}
        onTag={setTag}
        interest={interest}
        onInterest={setInterest}
        tags={tagOptions}
        result={query || tag || interest !== 'all' ? { direct: filtered.direct.length, indirect: filtered.indirect.length } : null}
      />

      <div className="shell layout">
        <Toc items={toc} variant="aside" />

        <main className="content">
          <Toc items={toc} variant="inline" />

          <section id="dogrudan" className="section">
            <div className="section-head">
              <h2>Doğrudan makaleler</h2>
              <p className="section-note">
                Torasik cerrahi uygulaması, tekniği veya sonucu üzerine çalışmalar. Tasarım türüne,
                ardından konu etiketine göre sıralanır.
              </p>
            </div>

            {!showDirect ? null : designGroups.length === 0 ? (
              <p className="empty">Bu filtreye uyan doğrudan makale yok.</p>
            ) : (
              designGroups.map((g) => {
                const subTags = Array.from(new Set(g.items.map(primaryTag)))
                return (
                  <div className="design-group" key={g.key}>
                    <h3 className="design-title">
                      {g.label}
                      <span className="count">{g.items.length}</span>
                    </h3>
                    {subTags.map((t) => (
                      <div className="tag-group" key={t}>
                        <p className="tag-label">{t}</p>
                        {g.items
                          .filter((s) => primaryTag(s) === t)
                          .map((s) => (
                            <StudyCard key={s.pmid} study={s} />
                          ))}
                      </div>
                    ))}
                  </div>
                )
              })
            )}

            {showDirect && issue.unavailable && issue.unavailable.length > 0 && (
              <div className="unavailable">
                <p className="tag-label">Tam metne erişilemedi (kart yazılmadı)</p>
                <TitleList items={issue.unavailable} empty="" limit={6} />
              </div>
            )}
          </section>

          <section id="arastirmalar" className="section">
            <div className="section-head">
              <h2>Klinik araştırmalar</h2>
              <p className="section-note">
                ClinicalTrials.gov üzerinde bu dönemde ilk kez kaydedilen veya sonuçları yüklenen
                torasik cerrahi çalışmaları.
              </p>
            </div>
            <Trials trials={issue.trials} />
          </section>

          <section id="dolayli" className="section">
            <div className="section-head">
              <h2>Dolaylı makaleler</h2>
              <p className="section-note">
                Onkoloji, pulmoner tıp, görüntüleme ve biyobelirteç çalışmaları; cerrahi kararı
                etkileyebilecek olanlar.
              </p>
            </div>
            {!showIndirect ? null : filtered.indirect.length === 0 ? (
              <p className="empty">Bu filtreye uyan dolaylı makale yok.</p>
            ) : (
              <ul className="indirect">
                {filtered.indirect.map((s) => (
                  <li key={s.pmid}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="indirect-title">
                      {s.title}
                    </a>
                    <p className="indirect-meta">
                      {s.journal}
                      {s.pmid ? ` · PMID ${s.pmid}` : ''}
                      {s.doi ? ` · ${s.doi}` : ''}
                    </p>
                    {s.oneLiner && <p className="indirect-line">{s.oneLiner}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="video-olgu" className="section">
            <div className="section-head">
              <h2>Video ve olgu başlıkları</h2>
              <p className="section-note">Yalnızca başlık düzeyinde izlenir; özet yazılmaz.</p>
            </div>
            <TitleList items={issue.videoCase} empty="Bu dönemde video veya olgu kaydı bulunmadı." limit={12} />
          </section>

          <section id="konu-disi" className="section">
            <div className="section-head">
              <h2>Konu dışı başlıklar</h2>
              <p className="section-note">Cerrahinin kapsamına girmeyen kayıtlar, tek satır.</p>
            </div>
            <TitleList items={issue.offTopic} empty="Konu dışı kayıt bulunmadı." limit={10} />
          </section>

          {issue.cardiac.length > 0 && (
            <section id="kardiyak" className="section">
              <div className="section-head">
                <h2>Kardiyak içerik (kapsam dışı)</h2>
                <p className="section-note">
                  A grubu dergilerde yayımlanan, torasik cerrahi kapsamı dışındaki kardiyak
                  makaleler.
                </p>
              </div>
              <TitleList items={issue.cardiac} empty="Kardiyak içerikli kayıt bulunmadı." limit={8} />
            </section>
          )}

          <section id="kaynaklar" className="section">
            <div className="section-head">
              <h2>Taranan kaynaklar</h2>
              <p className="section-note">
                Dönem: {shortDate(issue.windowStart)} – {shortDate(issue.windowEnd)} ·{' '}
                {issue.stats.journalsScanned} dergi · {issue.stats.journalsWithRecords} dergide kayıt.
              </p>
            </div>
            <Sources issue={issue} />
          </section>

          <footer className="site-footer">
            <p>
              Kartlar yalnızca erişilen metne (özet veya açık erişimli tam metin) dayanır; rakamlar
              kaynaktan aynen aktarılır. Klinik öneri içermez.
            </p>
            <p>
              <a href="#genel-bakis">Başa dön</a>
              {issue.generatedAt ? ` · Son güncelleme ${formatStamp(issue.generatedAt)}` : ''}
            </p>
          </footer>
        </main>
      </div>
    </>
  )
}

function formatStamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
}
