import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Filters, { type BranchOption, type SectionOption } from './components/Filters'
import StudyCard from './components/StudyCard'
import Toc, { type TocItem } from './components/Toc'
import Trials from './components/Trials'
import TitleList from './components/TitleList'
import Sources from './components/Sources'
import External from './components/External'
import SectionGroup from './components/SectionGroup'
import { DESIGN_ORDER, TAG_ORDER, issueIndex, loadIssue, shortDate } from './data'
import type { Design, Indirect, Issue, Scope, Study } from './types'

const norm = (s: string) => s.toLocaleLowerCase('tr')

/** Tarihe göre yeniden eskiye; tarihi olmayan kayıtlar sona düşer, kendi aralarında sıra korunur. */
function byDateDesc<T extends { entryDate?: string; date?: string }>(items: T[]): T[] {
  return items
    .map((item, i) => ({ item, i, key: item.entryDate || item.date || '' }))
    .sort((a, b) => (a.key === b.key ? a.i - b.i : a.key < b.key ? 1 : -1))
    .map((x) => x.item)
}

function readDetails(): boolean {
  return new URLSearchParams(window.location.search).get('sayfa') === 'kaynaklar'
}

interface Filterable {
  titleTr?: string
  titleOrig?: string
  title?: string
  journal: string
  summary?: string
  oneLiner?: string
  pmid: string
  doi: string
  tags?: string[]
  authors?: string
  institutions?: string[]
  scope?: Scope
  disciplines?: string[]
  multidisciplinary?: boolean
  international?: boolean
  turkey?: boolean
}

function matchesQuery(s: Filterable, q: string) {
  if (!q) return true
  const hay = norm(
    [s.titleTr, s.titleOrig, s.title, s.journal, s.summary, s.oneLiner, s.pmid, s.doi, (s.tags ?? []).join(' '),
     s.authors, (s.institutions ?? []).join(' '), (s.disciplines ?? []).join(' ')]
      .filter(Boolean)
      .join(' '),
  )
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => hay.includes(token))
}

export default function App() {
  const [detailsOpen, setDetailsOpen] = useState<boolean>(readDetails)
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
  const [turkeyOnly, setTurkeyOnly] = useState(false)
  const [scope, setScope] = useState<Scope>('')
  const [multiOnly, setMultiOnly] = useState(false)
  const [intlOnly, setIntlOnly] = useState(false)
  const [branches, setBranches] = useState<string[]>([])
  const [section, setSection] = useState('')

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
    if (detailsOpen) url.searchParams.set('sayfa', 'kaynaklar')
    else url.searchParams.delete('sayfa')
    window.history.replaceState({}, '', url)
  }, [date, detailsOpen])

  useEffect(() => {
    setQuery('')
    setTag('')
    setInterest('all')
    setTurkeyOnly(false)
    setScope('')
    setMultiOnly(false)
    setIntlOnly(false)
    setBranches([])
    setSection('')
    window.scrollTo({ top: 0 })
  }, [date])

  const filtered = useMemo(() => {
    if (!issue) return { direct: [] as Study[], indirect: [] as Indirect[] }
    const keep = (s: Filterable) => {
      if (tag && !(s.tags ?? []).includes(tag)) return false
      if (turkeyOnly && !s.turkey) return false
      if (scope && s.scope !== scope) return false
      if (multiOnly && !s.multidisciplinary) return false
      if (intlOnly && !s.international) return false
      if (branches.length > 0 && !branches.some((b) => (s.disciplines ?? []).includes(b))) return false
      return matchesQuery(s, query)
    }
    return {
      direct: byDateDesc(issue.direct.filter(keep)),
      indirect: byDateDesc(issue.indirect.filter(keep)),
    }
  }, [issue, tag, query, turkeyOnly, scope, multiOnly, intlOnly, branches])

  const tagOptions = useMemo(() => {
    if (!issue) return []
    const present = new Set<string>()
    issue.direct.forEach((s) => s.tags.forEach((t) => present.add(t)))
    issue.indirect.forEach((s) => s.tags.forEach((t) => present.add(t)))
    const ordered = TAG_ORDER.filter((t) => present.has(t))
    const extra = [...present].filter((t) => !TAG_ORDER.includes(t)).sort((a, b) => a.localeCompare(b, 'tr'))
    return [...ordered, ...extra]
  }, [issue])

  const branchOptions = useMemo<BranchOption[]>(() => {
    if (!issue) return []
    const counts = new Map<string, number>()
    for (const s of [...issue.direct, ...issue.indirect]) {
      for (const b of s.disciplines ?? []) counts.set(b, (counts.get(b) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr'))
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

  const toggleDetails = () => {
    setDetailsOpen((prev) => {
      const next = !prev
      if (next) {
        requestAnimationFrame(() => {
          document.getElementById('kaynaklar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
      return next
    })
  }

  const showDirect = interest !== 'indirect'
  const showIndirect = interest !== 'direct'

  const designGroups = DESIGN_ORDER.map((d) => ({
    ...d,
    items: filtered.direct.filter((s) => s.design === (d.key as Design)),
  })).filter((g) => g.items.length > 0)

  const toc: TocItem[] = [
    { id: 'dogrudan', label: 'Doğrudan makaleler', count: filtered.direct.length },
    { id: 'dolayli', label: 'Dolaylı makaleler', count: filtered.indirect.length },
  ]

  const sectionOptions: SectionOption[] = [
    ...(issue.external && issue.external.length > 0
      ? [{ id: 'pubmed-disi', label: 'PubMed dışı', count: issue.external.length }]
      : []),
    { id: 'arastirmalar', label: 'Klinik araştırmalar', count: issue.trials.length },
    { id: 'video-olgu', label: 'Video ve olgu', count: issue.videoCase.length },
    ...(issue.cardiac.length > 0 ? [{ id: 'kardiyak', label: 'Kardiyak içerik', count: issue.cardiac.length }] : []),
    { id: 'konu-disi', label: 'Konu dışı', count: issue.offTopic.length },
  ]

  const openSection = (id: string) => {
    setSection(id)
    if (!id) return
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const clearFilters = () => {
    setQuery('')
    setTag('')
    setInterest('all')
    setTurkeyOnly(false)
    setScope('')
    setMultiOnly(false)
    setIntlOnly(false)
    setBranches([])
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
        <Hero issue={issue} open={detailsOpen} onToggle={toggleDetails} />
      </div>

      <div className="shell" hidden={!detailsOpen}>
        <section className="details-panel" id="kaynaklar" aria-label="Kaynaklar ve detaylar">
            <Hero issue={issue} variant="full" heading="h2" title="Kaynaklar ve detaylar" />
            <section className="section details-sources">
              <div className="section-head">
                <h3>Kaynaklar</h3>
                <p className="section-note">
                  Dönem: {shortDate(issue.windowStart)} – {shortDate(issue.windowEnd)} ·{' '}
                  {issue.stats.journalsScanned} dergi tarandı · {issue.stats.journalsWithRecords} dergide
                  kayıt bulundu.
                </p>
              </div>
              <Sources issue={issue} />
            </section>
          <p className="details-foot">
            <button type="button" className="linkish" onClick={toggleDetails}>
              Kapat
            </button>
          </p>
        </section>
      </div>

      <Filters
        query={query}
        onQuery={setQuery}
        tag={tag}
        onTag={setTag}
        interest={interest}
        onInterest={setInterest}
        tags={tagOptions}
        turkeyOnly={turkeyOnly}
        onTurkeyOnly={setTurkeyOnly}
        scope={scope}
        onScope={setScope}
        multiOnly={multiOnly}
        onMultiOnly={setMultiOnly}
        intlOnly={intlOnly}
        onIntlOnly={setIntlOnly}
        branches={branches}
        onBranches={setBranches}
        branchOptions={branchOptions}
        section={section}
        onSection={openSection}
        sectionOptions={sectionOptions}
        result={
          query || tag || scope || multiOnly || intlOnly || turkeyOnly || branches.length > 0 || interest !== 'all'
            ? { direct: filtered.direct.length, indirect: filtered.indirect.length }
            : null
        }
        onClear={clearFilters}
      />

      <div className="shell layout">
        <Toc items={toc} variant="aside" />

        <main className="content">
          <Toc items={toc} variant="inline" />

          <section id="dogrudan" className="section">
            <div className="section-head">
              <h2>Doğrudan makaleler</h2>
              <p className="section-note">
                Torasik cerrahi uygulaması, tekniği veya sonucu üzerine çalışmalar. Tasarım türüne
                göre gruplanır; her grup içinde en yeni giriş en üstte yer alır. Türkiye'deki bir
                kurum veya yazarın yer aldığı çalışmalar kart üzerindeki rozetle işaretlenir ve
                filtre çubuğundaki "Türkiye'den" çipiyle ayrıca süzülebilir.
              </p>
            </div>

            {!showDirect ? null : designGroups.length === 0 ? (
              <p className="empty">Bu filtreye uyan doğrudan makale yok.</p>
            ) : (
              designGroups.map((g) => (
                <div className="design-group" key={g.key}>
                  <h3 className="design-title">
                    {g.label}
                    <span className="count">{g.items.length}</span>
                  </h3>
                  {byDateDesc(g.items).map((s) => (
                    <StudyCard key={s.pmid} study={s} />
                  ))}
                </div>
              ))
            )}

            {showDirect && issue.unavailable && issue.unavailable.length > 0 && (
              <div className="unavailable">
                <p className="tag-label">Tam metne erişilemedi (kart yazılmadı)</p>
                <TitleList items={byDateDesc(issue.unavailable)} empty="" limit={6} />
              </div>
            )}
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
                    {s.turkey && <span className="tr-badge tr-badge-sm">Türkiye'den</span>}
                    {s.scopeLabel && <span className="scope-badge scope-badge-sm">{s.scopeLabel}</span>}
                    <p className="indirect-meta">
                      {s.journal}
                      {s.pmid ? ` · PMID ${s.pmid}` : ''}
                      {s.doi ? ` · ${s.doi}` : ''}
                    </p>
                    {(s.authors || (s.institutions && s.institutions.length > 0)) && (
                      <p className="indirect-authors">
                        {s.authors}
                        {s.institutions && s.institutions.length > 0
                          ? ` · ${s.institutions.join(' · ')}`
                          : ''}
                      </p>
                    )}
                    {s.disciplines && s.disciplines.length > 0 && (
                      <p className="indirect-authors">Branşlar: {s.disciplines.join(' · ')}</p>
                    )}
                    {s.oneLiner && <p className="indirect-line">{s.oneLiner}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {issue.external && issue.external.length > 0 && (
            <SectionGroup
              id="pubmed-disi"
              title="PubMed dışı kaynaklar"
              count={issue.external.length}
              note="Crossref DOI kayıtları ve dergi RSS akışlarından gelen, PubMed taramasında yer almayan kayıtlar. Bu kanallarda özet metni çoğunlukla bulunmadığı için yalnızca başlık düzeyinde listelenir; çalışma kartı yazılmaz."
              open={section === 'pubmed-disi'}
              onToggle={(open) => setSection(open ? 'pubmed-disi' : '')}
            >
              <External items={issue.external} />
            </SectionGroup>
          )}

          <SectionGroup
            id="arastirmalar"
            title="Klinik araştırmalar"
            count={issue.trials.length}
            note="ClinicalTrials.gov üzerinde bu dönemde ilk kez kaydedilen veya sonuçları yüklenen torasik cerrahi çalışmaları."
            open={section === 'arastirmalar'}
            onToggle={(open) => setSection(open ? 'arastirmalar' : '')}
          >
            <Trials trials={issue.trials} />
          </SectionGroup>

          <SectionGroup
            id="video-olgu"
            title="Video ve olgu başlıkları"
            count={issue.videoCase.length}
            note="Yalnızca başlık düzeyinde izlenir; özet yazılmaz."
            open={section === 'video-olgu'}
            onToggle={(open) => setSection(open ? 'video-olgu' : '')}
          >
            <TitleList items={byDateDesc(issue.videoCase)} empty="Bu dönemde video veya olgu kaydı bulunmadı." limit={12} showAuthors />
          </SectionGroup>

          {issue.cardiac.length > 0 && (
            <SectionGroup
              id="kardiyak"
              title="Kardiyak içerik"
              count={issue.cardiac.length}
              note="A grubu dergilerde yayımlanan, torasik cerrahi kapsamı dışındaki kardiyak makaleler."
              open={section === 'kardiyak'}
              onToggle={(open) => setSection(open ? 'kardiyak' : '')}
            >
              <TitleList items={byDateDesc(issue.cardiac)} empty="Kardiyak içerikli kayıt bulunmadı." limit={8} />
            </SectionGroup>
          )}

          <SectionGroup
            id="konu-disi"
            title="Konu dışı başlıklar"
            count={issue.offTopic.length}
            note="Cerrahinin kapsamına girmeyen kayıtlar, tek satır."
            open={section === 'konu-disi'}
            onToggle={(open) => setSection(open ? 'konu-disi' : '')}
          >
            <TitleList items={byDateDesc(issue.offTopic)} empty="Konu dışı kayıt bulunmadı." limit={10} />
          </SectionGroup>

          <footer className="site-footer">
            <p>
              Kartlar yalnızca erişilen metne (özet veya açık erişimli tam metin) dayanır; rakamlar
              kaynaktan aynen aktarılır. Klinik öneri içermez.
            </p>
            <p>
              <button type="button" className="linkish" onClick={toggleDetails}>
                Kaynaklar ve detaylar
              </button>
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
