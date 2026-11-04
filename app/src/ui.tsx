import { createContext, useEffect, useState } from 'react'

export interface Actions {
  activate: (id: string) => void
  toggle: (id: string) => void
  review: (id: string) => void
}
export const ActionsCtx = createContext<Actions>({ activate() {}, toggle() {}, review() {} })

export function SlideImg({ src, label, className }: { src: string; label: string; className?: string }) {
  const [bad, setBad] = useState(false)
  useEffect(() => setBad(false), [src])
  if (!src || bad) return <div className={'ph ' + (className ?? '')}>{label}</div>
  return <img className={className} src={src} alt={label} loading="lazy" draggable={false} onError={() => setBad(true)} />
}

export function useLocalState<T>(key: string, init: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(key); if (s != null) return JSON.parse(s) as T } catch { /* ignore */ }
    return init
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* ignore */ } }, [key, v])
  return [v, setV]
}
