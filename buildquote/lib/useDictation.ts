'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Live speech-to-text using the Web Speech API.
 *
 * - Streams interim results so text appears *as you speak* (like iOS dictation),
 *   not only at the end.
 * - `toggle(base)` starts dictation appending to `base`, or stops if already
 *   listening — fixing the "mic won't turn off" problem.
 * - Reports the full running string (base + finalised + interim) via `onText`.
 *
 * Note: iOS Safari only fires final results on some versions, so interim text
 * may not stream on every iPhone — but the toggle/stop and append behaviour
 * still work, and the native keyboard dictation remains available as a fallback.
 */
export function useDictation(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)

  const recRef = useRef<any>(null)
  const baseRef = useRef('')
  const finalRef = useRef('')
  const onTextRef = useRef(onText)

  useEffect(() => { onTextRef.current = onText })

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    )
  }, [])

  const stop = useCallback(() => {
    const r = recRef.current
    recRef.current = null
    if (r) { try { r.stop() } catch { /* already stopped */ } }
    setListening(false)
  }, [])

  const toggle = useCallback((base = '') => {
    // Already running → stop.
    if (recRef.current) { stop(); return }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    const r = new SR()
    r.lang = 'en-AU'
    r.continuous = true
    r.interimResults = true

    baseRef.current = base ? base.replace(/\s*$/, '') + ' ' : ''
    finalRef.current = ''

    r.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript
        if (e.results[i].isFinal) finalRef.current += seg + ' '
        else interim += seg
      }
      onTextRef.current((baseRef.current + finalRef.current + interim).replace(/\s+/g, ' ').trimStart())
    }
    r.onerror = () => { recRef.current = null; setListening(false) }
    r.onend = () => { recRef.current = null; setListening(false) }

    recRef.current = r
    try { r.start(); setListening(true) }
    catch { recRef.current = null; setListening(false) }
  }, [stop])

  // Stop dictation if the component unmounts.
  useEffect(() => () => {
    const r = recRef.current
    if (r) { try { r.stop() } catch { /* noop */ } }
  }, [])

  return { supported, listening, toggle, stop }
}
