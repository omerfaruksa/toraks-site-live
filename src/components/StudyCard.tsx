import type { Study } from '../types'
import { formatDate } from '../data'

export default function StudyCard({ study }: { study: Study }) {
  const detailRows: [string, string][] = [
    ['Tasarım', study.designLabel],
    ['Örneklem', study.sample],
    ['Karşılaştırma', study.comparison],
    ['Sonlanımlar', study.outcomes],
    ['Takip', study.followUp],
    ['Veri dönemi', study.dataPeriod],
  ]

  return (
    <article className="card" id={`pmid-${study.pmid}`}>
      <h4 className="card-title">{study.titleTr}</h4>
      {study.titleOrig && <p className="card-orig">{study.titleOrig}</p>}

      <p className="card-meta">
        <span className="card-journal">{study.journal}</span>
        <span className="dot" aria-hidden="true" />
        <span>Giriş {formatDate(study.entryDate)}</span>
        {study.pmid && (
          <>
            <span className="dot" aria-hidden="true" />
            <a href={study.url} target="_blank" rel="noreferrer">
              PMID {study.pmid}
            </a>
          </>
        )}
        {study.doi && (
          <>
            <span className="dot" aria-hidden="true" />
            <a href={`https://doi.org/${study.doi}`} target="_blank" rel="noreferrer">
              DOI
            </a>
          </>
        )}
        <span className="dot" aria-hidden="true" />
        <span className={`access access-${study.access}`}>
          {study.access === 'open' ? 'Açık tam metin' : 'Yalnızca özet'}
        </span>
        {study.turkey && <span className="tr-badge">Türkiye'den</span>}
        {study.scopeLabel && <span className="scope-badge">{study.scopeLabel}</span>}
      </p>

      {study.tags.length > 0 && (
        <ul className="pills">
          {study.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}

      <div className="card-people">
        <p>
          <span className="people-key">Yazarlar</span>
          <span className="people-val">{study.authors || 'belirtilmemiş'}</span>
        </p>
        <p>
          <span className="people-key">Kurumlar</span>
          <span className="people-val">
            {study.institutions && study.institutions.length > 0
              ? study.institutions.join(' · ')
              : 'belirtilmemiş'}
          </span>
        </p>
      </div>

      {(study.disciplines?.length || study.international) && (
        <p className="card-branches">
          {study.disciplines && study.disciplines.length > 0 && (
            <>
              <span className="people-key">Branşlar</span>
              <span className="people-val">{study.disciplines.join(' · ')}</span>
            </>
          )}
          {study.international && (
            <span className="intl-note">
              {study.disciplines?.length ? ' · ' : ''}Uluslararası işbirliği
              {study.countries && study.countries.length > 1 ? ` (${study.countries.slice(0, 3).join(', ')})` : ''}
            </span>
          )}
        </p>
      )}

      {study.summary && <p className="card-summary">{study.summary}</p>}

      <p className="main-result">
        <span className="mr-label">Ana sonuç</span>
        {study.mainResult || 'belirtilmemiş'}
      </p>

      <details className="card-details">
        <summary>Ayrıntılar</summary>
        <dl className="fields">
          {detailRows.map(([label, value]) => (
            <div className="field" key={label}>
              <dt>{label}</dt>
              <dd>{value || 'belirtilmemiş'}</dd>
            </div>
          ))}
        </dl>
      </details>

      {study.note && <p className="card-note">{study.note}</p>}
    </article>
  )
}
