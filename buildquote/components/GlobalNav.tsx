'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { label: 'Home',                  href: '/',           external: false },
  { label: 'Send a Quote',          href: '/rfq',        external: false },
  { label: 'Products',              href: '/products',   external: false },
  { label: 'Builder Portal',        href: '/dashboard',  external: false },
  { label: 'Manufacturers Portal',  href: 'https://mfp.buildquote.com.au', external: true },
  { label: 'Privacy Policy',        href: '/privacy',    external: false },
  { label: 'Terms of Use',          href: '/terms',      external: false },
]

export function GlobalNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [pathname])

  if (pathname === '/' || pathname === '/coming-soon') return null

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 100,
      }}
    >
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          alignItems: 'center',
          justifyContent: 'center',
          width: '42px',
          height: '42px',
          background: '#ffffff',
          border: '1px solid #d1d9e0',
          borderRadius: '10px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        }}
      >
        <span style={{
          display: 'block', width: '18px', height: '2px',
          background: '#185D7A', borderRadius: '2px',
          transition: 'transform 0.2s, opacity 0.2s',
          transform: open ? 'translateY(7px) rotate(45deg)' : 'none',
        }} />
        <span style={{
          display: 'block', width: '18px', height: '2px',
          background: '#185D7A', borderRadius: '2px',
          transition: 'opacity 0.2s',
          opacity: open ? 0 : 1,
        }} />
        <span style={{
          display: 'block', width: '18px', height: '2px',
          background: '#185D7A', borderRadius: '2px',
          transition: 'transform 0.2s',
          transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none',
        }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '220px',
          background: '#ffffff',
          border: '1px solid #d1d9e0',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          <div style={{ padding: '8px 16px 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>
            buildquote.com.au
          </div>

          {NAV_LINKS.map((link) => {
            const isActive = !link.external && pathname === link.href
            return (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? '_blank' : '_self'}
                rel={link.external ? 'noopener noreferrer' : undefined}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 16px',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#185D7A' : '#334155',
                  background: isActive ? '#f0f9ff' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = '#f5f7f9' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
              >
                {link.label}
                {link.external && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.35, flexShrink: 0 }}>
                    <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </a>
            )
          })}
          <div style={{ height: '6px' }} />
        </div>
      )}
    </div>
  )
}
