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

      {issue.coverage && issue.coverage.length > 0 && (
        <details className="sources-wide journal-details">
          <summary>Dergi kapsama tablosu ({issue.coverage.length} dergi)</summary>
          <div className="coverage-wrap">
            <table className="coverage">
              <thead>
                <tr>
                  <th>Dergi</th>
                  <th>Grup</th>
                  <th>Bu sayı</th>
                  <th>30 gün</th>
                  <th>Son kayıt</th>
                  <th>Kaynak</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {issue.coverage.map((c) => (
                  <tr
                    key={c.journal}
                    className={c.count7 > 0 ? 'is-hit' : c.status === "PubMed'de yok" ? 'is-missing' : ''}
                  >
                    <td>{c.journal}</td>
                    <td>{c.group}</td>
                    <td>{c.count7}</td>
                    <td>{c.count30}</td>
                    <td>{c.lastEntry || '—'}</td>
                    <td>{c.source}</td>
                    <td className="cov-status">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted-text">
            "Bu sayı" bu sayıya alınan kayıt sayısıdır (içerik filtresi uygulanmış). "30 gün" son
            30 günde PubMed'e giren kayıt sayısı, "Son kayıt" en son PubMed giriş tarihidir ([edat]);
            bu iki sütun filtresizdir ve dergi toplu yükleme yaptığında haftalık sayı sıfır kalabilir.
            "Kaynak" sütunu derginin hangi kanaldan tarandığını gösterir: PubMed, Crossref DOI
            kayıtları, dergi RSS akışı veya makine okunur akış bulunamadı (none).
          </p>
        </details>
      )}

      {sources.note && <p className="muted-text sources-wide">{sources.note}</p>}
    </div>
  )
}
