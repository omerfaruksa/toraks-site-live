import type { Trial } from '../types'

export default function Trials({ trials }: { trials: Trial[] }) {
  if (trials.length === 0) {
    return <p className="empty">Bu dönemde yeni kaydedilen veya sonuçlanan torasik cerrahi çalışması bulunmadı.</p>
  }

  return (
    <div className="table-wrap">
      <table className="trials">
        <thead>
          <tr>
            <th scope="col">Kayıt</th>
            <th scope="col">Başlık</th>
            <th scope="col">Faz</th>
            <th scope="col">Durum</th>
            <th scope="col">Tarih</th>
            <th scope="col">Hedef örneklem</th>
            <th scope="col">Birincil sonlanım</th>
            <th scope="col">Sponsor / ülke</th>
          </tr>
        </thead>
        <tbody>
          {trials.map((t) => (
            <tr key={t.nct}>
              <td data-label="Kayıt">
                <a href={`https://clinicaltrials.gov/study/${t.nct}`} target="_blank" rel="noreferrer">
                  {t.nct}
                </a>
              </td>
              <td data-label="Başlık">{t.title}</td>
              <td data-label="Faz">{t.phase}</td>
              <td data-label="Durum">{t.status}</td>
              <td data-label="Tarih">{t.dates}</td>
              <td data-label="Hedef örneklem">{t.enrollment}</td>
              <td data-label="Birincil sonlanım">{t.primary}</td>
              <td data-label="Sponsor / ülke">{t.sponsor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
