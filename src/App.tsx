import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Filters, { type BranchOption, type SectionOption } from './components/Filters'
import StudyCard from './components/StudyCard'
import Trials from './components/Trials'
import TitleList from './components/TitleList'
import Sources from './components/Sources'
import External from './components/External'
import Highlight from './components/Highlight'
import SectionGroup from './components/SectionGroup'
import { DESIGN_ORDER, TAG_ORDER, issueIndex, loadIssue, shortDate } from './data'
import type { Indirect, Issue, Scope, Study } from './types'
import { matchesTokens, searchText, tokenize } from './search'

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

/** Filtre durumunu adresten okur; paylaşılan bağlantı aynı süzgeçle açılır. */
function readFilters() {
  const p = new URLSearchParams(window.location.search)
  const interest = p.get('ilgi')
  const scope = p.get('kapsam')
  return {
    query: p.get('q') ?? '',
    tag: p.get('konu') ?? '',
    interest: (interest === 'direct' || interest === 'indirect' ? interest : 'all') as
      | 'all'
      | 'direct'
      | 'indirect',
    turkeyOnly: p.get('tr') === '1',
    scope: (scope === 'tek_merkezli' || scope === 'cok_merkezli' ? scope : '') as Scope,
    multiOnly: p.get('cok') === '1',
    intlOnly: p.get('ulus') === '1',
    branches: (p.get('brans') ?? '').split(',').map((b) => b.trim()).filter(Boolean),
    design: p.get('tasarim') ?? '',
    section: p.get('bolum') ?? '',
  }
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

/** Kaydın aranabilir metni; nesne başına bir kez hesaplanır (bkz. search.ts). */
function matchesQuery(s: Filterable, tokens: string[]) {
  if (tokens.length === 0) return true
  const text = searchText(s, [
    s.titleTr,
    s.titleOrig,
    s.title,
    s.journal,
    s.summary,
    s.oneLiner,
    s.pmid,
    s.doi,
    s.tags ?? [],
    s.authors,
    s.institutions ?? [],
    s.disciplines ?? [],
  ])
  return matchesTokens(text, tokens)
}

const CADENCE_LABEL: Record<string, string> = {
  daily: 'Günlük güncelleme',
  weekly: 'Haftalık tarama',
  biweekly: 'İki haftalık tarama',
  monthly: 'Aylık tarama',
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
  const initialFilters = useMemo(readFilters, [])
  const [query, setQuery] = useState(initialFilters.query)
  const [tag, setTag] = useState(initialFilters.tag)
  const [interest, setInterest] = useState<'all' | 'direct' | 'indirect'>(initialFilters.interest)
  const [turkeyOnly, setTurkeyOnly] = useState(initialFilters.turkeyOnly)
  const [scope, setScope] = useState<Scope>(initialFilters.scope)
  const [multiOnly, setMultiOnly] = useState(initialFilters.multiOnly)
  const [intlOnly, setIntlOnly] = useState(initialFilters.intlOnly)
  const [branches, setBranches] = useState<string[]>(initialFilters.branches)
  const [design, setDesign] = useState(initialFilters.design)
  const [section, setSection] = useState(initialFilters.section)

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
    const put = (key: string, value: string) => {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    }
    put('sayi', date)
    put('sayfa', detailsOpen ? 'kaynaklar' : '')
    put('q', query.trim())
    put('konu', tag)
    put('ilgi', interest === 'all' ? '' : interest)
    put('tr', turkeyOnly ? '1' : '')
    put('kapsam', scope)
    put('cok', multiOnly ? '1' : '')
    put('ulus', intlOnly ? '1' : '')
    put('brans', branches.join(','))
    put('tasarim', design)
    put('bolum', section)
    window.history.replaceState({}, '', url)
  }, [date, detailsOpen, query, tag, interest, turkeyOnly, scope, multiOnly, intlOnly, branches, design, section])

  // Geri/ileri tuşları ve paylaşılan bağlantılar filtreleri geri yükler.
  useEffect(() => {
    const onPop = () => {
      const f = readFilters()
      setQuery(f.query)
      setTag(f.tag)
      setInterest(f.interest)
      setTurkeyOnly(f.turkeyOnly)
      setScope(f.scope)
      setMultiOnly(f.multiOnly)
      setIntlOnly(f.intlOnly)
      setBranches(f.branches)
      setDesign(f.design)
      setSection(f.section)
      setDetailsOpen(readDetails())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const prevDate = useRef(date)
  useEffect(() => {
    // İlk açılışta adresten gelen filtreler korunur; sıfırlama yalnızca sayı değişince yapılır.
    if (prevDate.current === date) return
    prevDate.current = date
    setQuery('')
    setTag('')
    setInterest('all')
    setTurkeyOnly(false)
    setScope('')
    setMultiOnly(false)
    setIntlOnly(false)
    setBranches([])
    setDesign('')
    setSection('')
    window.scrollTo({ top: 0 })
  }, [date])

  // Girdi alanı beklemeden yazılabilsin: süzme, ertelenmiş sorgu ile yapılır.
  const deferredQuery = useDeferredValue(query)
  const tokens = useMemo(() => tokenize(deferredQuery), [deferredQuery])
  const filtered = useMemo(() => {
    if (!issue) return { direct: [] as Study[], indirect: [] as Indirect[] }
    const keep = (s: Filterable & { design?: string }) => {
      if (design && s.design !== design) return false
      if (tag && !(s.tags ?? []).includes(tag)) return false
      if (turkeyOnly && !s.turkey) return false
      if (scope && s.scope !== scope) return false
      if (multiOnly && !s.multidisciplinary) return false
      if (intlOnly && !s.international) return false
      if (branches.length > 0 && !branches.some((b) => (s.disciplines ?? []).includes(b))) return false
      return matchesQuery(s, tokens)
    }
    return {
      direct: byDateDesc(issue.direct.filter(keep)),
      indirect: byDateDesc(issue.indirect.filter(keep)),
    }
  }, [issue, tag, tokens, turkeyOnly, scope, multiOnly, intlOnly, branches, design])

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

  const designOptions = useMemo(() => {
    if (!issue) return []
    const counts = new Map<string, number>()
    for (const s of issue.direct) counts.set(s.design, (counts.get(s.design) ?? 0) + 1)
    return DESIGN_ORDER.filter((d) => counts.has(d.key)).map((d) => ({
      key: d.key,
      label: d.label,
      count: counts.get(d.key) ?? 0,
    }))
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
  // Tasarım süzgeci yalnızca doğrudan kartlara uygulanır; seçiliyken dolaylı liste gizlenir.
  const showIndirect = interest !== 'direct' && !design

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
        detailsOpen={detailsOpen}
        onToggleDetails={toggleDetails}
      />


      <div className="shell" hidden={!detailsOpen}>
        <section className="details-panel" id="kaynaklar" aria-label="Kaynaklar ve detaylar">
            <Hero issue={issue} variant="full" heading="h2" title="Kaynaklar ve detaylar" />
            <section className="section details-sources">
              <div className="section-head">
                <h3>Kaynaklar</h3>
                <p className="section-note">
                  {CADENCE_LABEL[issue.cadence ?? ''] ?? 'Tarama'} · Dönem:{' '}
                  {shortDate(issue.windowStart)} – {shortDate(issue.windowEnd)} ·{' '}
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
        design={design}
        onDesign={setDesign}
        designOptions={designOptions}
        branchOptions={branchOptions}
        section={section}
        onSection={openSection}
        sectionOptions={sectionOptions}
        result={
          query || tag || scope || multiOnly || intlOnly || turkeyOnly || branches.length > 0 || design || interest !== 'all'
            ? { direct: filtered.direct.length, indirect: filtered.indirect.length }
            : null
        }
        onClear={clearFilters}
      />

      <div className="shell">
        <main className="content">
          <section id="dogrudan" className="section section--bare">
            {!showDirect ? null : filtered.direct.length === 0 ? (
              <p className="empty">Bu filtreye uyan doğrudan makale yok.</p>
            ) : (
              filtered.direct.map((s) => <StudyCard key={s.pmid} study={s} tokens={tokens} />)
            )}

            {showDirect && issue.unavailable && issue.unavailable.length > 0 && (
              <div className="unavailable">
                <p className="tag-label">Tam metne erişilemedi (kart yazılmadı)</p>
                <TitleList items={byDateDesc(issue.unavailable)} empty="" limit={6} tokens={tokens} />
              </div>
            )}
          </section>

          <section id="dolayli" className="section section--bare">
            {!showIndirect ? null : filtered.indirect.length === 0 ? (
              <p className="empty">Bu filtreye uyan dolaylı makale yok.</p>
            ) : (
              <ul className="indirect">
                {filtered.indirect.map((s) => (
                  <li key={s.pmid}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="indirect-title">
                      <Highlight text={s.title} tokens={tokens} />
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
              <External items={issue.external} tokens={tokens} />
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
            <TitleList
              items={byDateDesc(issue.videoCase)}
              empty="Bu dönemde video veya olgu kaydı bulunmadı."
              limit={12}
              showAuthors
              tokens={tokens}
            />
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
              <TitleList items={byDateDesc(issue.cardiac)} empty="Kardiyak içerikli kayıt bulunmadı." limit={8} tokens={tokens} />
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
            <TitleList items={byDateDesc(issue.offTopic)} empty="Konu dışı kayıt bulunmadı." limit={10} tokens={tokens} />
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
