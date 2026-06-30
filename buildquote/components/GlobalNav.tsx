'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const MFP = 'https://search.buildquote.com.au'

const NAV_LINKS = [
  { label: 'Home',                href: '/',                          external: false },
  { label: 'Product Library',     href: '/library',                   external: false },
  { label: 'Supplier Directory',  href: `${MFP}/supplierdirectory`,  external: true  },
  { label: 'Builder Portal',      href: '/dashboard',                 external: false },
  { label: 'Start a Quote',       href: '/rfq',                       external: false },
]

const INTERNAL_LINKS = [
  { label: 'Supplier Portal', href: 'https://search.buildquote.com.au',        external: true },
  { label: 'Data Studio',     href: 'https://studio.buildquote.com.au',     external: true },
]

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy', external: false },
  { label: 'Terms of Use',   href: '/terms',   external: false },
]

export function GlobalNav() {
  const [open, setOpen] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(!!data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  if (pathname === '/' || pathname === '/coming-soon') return null

  // Pages with a sticky TopBar need the hamburger to float below it
  const hasTopBar = pathname === '/rfq'
  const topOffset = hasTopBar ? '68px' : '16px'

  const allLinks = [
    ...NAV_LINKS,
    null, // divider
    ...LEGAL_LINKS,
    null, // divider
    'internal-header' as const,
    ...INTERNAL_LINKS,
  ]

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: topOffset, right: '16px', zIndex: 100 }}
    >
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        style={{
          display: 'flex', flexDirection: 'column', gap: '5px',
          alignItems: 'center', justifyContent: 'center',
          width: '42px', height: '42px',
          background: '#ffffff', border: '1px solid #d1d9e0',
          borderRadius: '10px', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        }}
      >
        <span style={{ display: 'block', width: '18px', height: '2px', background: '#185D7A', borderRadius: '2px', transition: 'transform 0.2s, opacity 0.2s', transform: open ? 'translateY(7px) rotate(45deg)' : 'none' }} />
        <span style={{ display: 'block', width: '18px', height: '2px', background: '#185D7A', borderRadius: '2px', transition: 'opacity 0.2s', opacity: open ? 0 : 1 }} />
        <span style={{ display: 'block', width: '18px', height: '2px', background: '#185D7A', borderRadius: '2px', transition: 'transform 0.2s', transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: '170px', background: '#ffffff',
          border: '1px solid #d1d9e0', borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          maxHeight: 'calc(100vh - 100px)',
          overflowX: 'hidden', overflowY: 'auto',
        }}>
          <div style={{ height: '4px' }} />

          {allLinks.map((link, i) =>
            link === null ? (
              <div key={`divider-${i}`} style={{ margin: '3px 0', borderTop: '1px solid #e5e7eb' }} />
            ) : link === 'internal-header' ? (
              <div key="internal-header" style={{ padding: '4px 12px 2px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                Team Links
              </div>
            ) : (
              <a
                key={link.href}
                href={link.href}
                target={link.external ? '_blank' : '_self'}
                rel={link.external ? 'noopener noreferrer' : undefined}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: (!link.external && pathname === link.href) ? 700 : 500,
                  color: (!link.external && pathname === link.href) ? '#185D7A' : '#334155',
                  background: (!link.external && pathname === link.href) ? '#f0f9ff' : 'transparent',
                  textDecoration: 'none', transition: 'background 0.12s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; if (pathname !== link.href) el.style.background = '#f5f7f9' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; if (pathname !== link.href) el.style.background = 'transparent' }}
              >
                {link.label}
                {link.external && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.35, flexShrink: 0 }}>
                    <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </a>
            )
          )}

          {isSignedIn && (
            <>
              <div style={{ margin: '3px 0', borderTop: '1px solid #e5e7eb' }} />
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', padding: '8px 14px',
                  fontSize: '13px', fontWeight: 500,
                  color: '#dc2626', background: 'transparent',
                  border: 'none', cursor: 'pointer', transition: 'background 0.12s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
              </button>
            </>
          )}

          <div style={{ height: '4px' }} />
        </div>
      )}
    </div>
  )
}
