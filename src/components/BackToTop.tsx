import { useEffect, useState } from 'react'

/**
 * Sayfanın altında beliren "en üste git" şeridi.
 * Kaydırma ilerlemesini ince bir çizgi ve yüzde olarak gösterir; eşik
 * geçilmeden görünmez, böylece kısa sayfalarda yer kaplamaz.
 */
export default function BackToTop() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0)
      setVisible(window.scrollY > 600)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  if (!visible) return null
  const percent = Math.round(progress * 100)

  return (
    <button
      type="button"
      className="to-top"
      onClick={() => {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
      }}
      aria-label={`Sayfanın başına dön, sayfanın yüzde ${percent} kadarı görüntülendi`}
    >
      <span className="to-top-track" aria-hidden="true">
        <span className="to-top-fill" style={{ transform: `scaleX(${progress})` }} />
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
        <path d="M12 19V6M6 12l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="to-top-label">En üste git</span>
      <span className="to-top-pct" aria-hidden="true">{percent}%</span>
    </button>
  )
}
