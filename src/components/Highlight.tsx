import { Fragment } from 'react'
import { highlight } from '../search'

/** Arama terimlerini metin içinde işaretler; terim yoksa düz metin döner. */
export default function Highlight({ text, tokens }: { text: string; tokens?: string[] }) {
  if (!tokens || tokens.length === 0) return <>{text}</>
  const segments = highlight(text, tokens)
  return (
    <>
      {segments.map((segment, i) =>
        segment.match ? (
          <mark key={i}>{segment.text}</mark>
        ) : (
          <Fragment key={i}>{segment.text}</Fragment>
        ),
      )}
    </>
  )
}
