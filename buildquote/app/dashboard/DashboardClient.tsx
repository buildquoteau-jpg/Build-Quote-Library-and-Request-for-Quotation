'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import JobsTab from '@/components/builder/JobsTab'
import SuppliersTab from '@/components/builder/SuppliersTab'
import FavouriteProductsTab from '@/components/builder/FavouriteProductsTab'
import ProfilePanel from '@/components/builder/ProfilePanel'
import QuotesTab from '@/components/builder/QuotesTab'
import { DemoNoticeBox } from '@/components/DemoNoticeBox'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getGuestProfile, syncGuestWorkspaceToAccount } from '@/lib/guestWorkspace'

type Tab = 'jobs' | 'suppliers' | 'products' | 'profile' | 'quotes'

interface Props {
  user: User | null
  profile: any | null
}

export default function DashboardClient({ user, profile }: Props) {
  const [tab, setTab] = useState<Tab>('jobs')
  const [profileOpen, setProfileOpen] = useState(false)
  const [highlightProject, setHighlightProject] = useState<string | undefined>()
  const [guestName, setGuestName] = useState('')
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false)
  const [syncNotice, setSyncNotice] = useState(false)

  useEffect(() => {
    // Support deep-linking directly to a tab (e.g. /dashboard?tab=quotes)
    const params = new URLSearchParams(window.location.search)
    const initialTab = params.get('tab') as Tab | null
    if (initialTab && ['jobs', 'suppliers', 'products', 'quotes', 'profile'].includes(initialTab)) {
      setTab(initialTab)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      const gp = getGuestProfile()
      setGuestName(gp.builder_name || gp.company_name || '')
      try {
        if (sessionStorage.getItem('bq_guest_banner_dismissed') === '1') {
          setGuestBannerDismissed(true)
        }
      } catch {}
      return
    }
    // Signed in — migrate any work created during a guest session seamlessly
    const supabase = createSupabaseBrowserClient()
    syncGuestWorkspaceToAccount(supabase, user.id).then((synced) => {
      if (synced) setSyncNotice(true)
    })
  }, [user])

  const displayName = user
    ? (profile?.builder_name || profile?.company_name || user.email)
    : (guestName || 'Builder')

  function handleViewQuotesForJob(projectRef: string) {
    setHighlightProject(projectRef)
    setTab('quotes')
  }

  function dismissGuestBanner() {
    setGuestBannerDismissed(true)
    try { sessionStorage.setItem('bq_guest_banner_dismissed', '1') } catch {}
  }

  return (
    <div className="h-screen bg-page flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-navy text-white px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between shadow-md flex-shrink-0">
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight">
              Build<span className="text-brand">Quote</span>
            </h1>
            <span className="text-white/50 text-xs font-semibold tracking-wide">Builder Portal</span>
            {!user && (
              <span className="hidden sm:inline-block rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/85">
                Guest Mode · No Login
              </span>
            )}
          </div>
          <p className="text-white font-bold text-sm mt-0.5 truncate max-w-[180px] sm:max-w-none">G&apos;day, {displayName}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/library"
            className="text-white/80 hover:text-white text-xs sm:text-sm font-medium transition hidden sm:inline"
          >
            Product Library
          </a>
          <a
            href="/rfq"
            className="bg-brand hover:bg-brand-hover text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-xl transition"
          >
            + New RFQ
          </a>
          {!user ? (
            <a
              href="/login?next=%2Fdashboard"
              className="border border-white/30 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl transition whitespace-nowrap"
            >
              Sign in
            </a>
          ) : (
            <button
              onClick={() => setProfileOpen(true)}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 transition flex items-center justify-center"
              aria-label="My profile"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-subtle bg-surface flex-shrink-0 z-10">
        <div
          className="max-w-7xl mx-auto px-4 flex overflow-x-auto"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {([
            { key: 'jobs',      label: 'Current Jobs',       short: 'Jobs' },
            { key: 'suppliers', label: 'Preferred Suppliers', short: 'Suppliers' },
            { key: 'products',  label: 'Favourite Products',  short: 'Products' },
            { key: 'quotes',    label: 'My Quote Requests',    short: 'Quotes' },
            { key: 'profile',   label: 'My Profile',          short: 'Profile' },
          ] as { key: Tab; label: string; short: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 whitespace-nowrap px-3 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition ${
                tab === t.key
                  ? 'border-navy text-navy'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border'
              }`}
            >
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {!user && !guestBannerDismissed && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy/20 bg-navy/5 px-4 py-2.5 text-xs sm:text-sm text-navy">
            <p className="m-0 leading-snug">
              <strong>No login needed to get started.</strong> Add jobs, suppliers, favourite products and build quote requests right here — create a free account anytime (or before sending your first RFQ) to sync across devices.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/register?next=%2Fdashboard"
                className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition"
              >
                Create free account
              </a>
              <button
                type="button"
                onClick={dismissGuestBanner}
                aria-label="Dismiss notice"
                className="px-1.5 py-1 text-navy/60 hover:text-navy font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {syncNotice && (
          <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-xs sm:text-sm text-green-800">
            <span>✓ Your guest jobs, suppliers and saved details have been synced to your account.</span>
            <button type="button" onClick={() => setSyncNotice(false)} className="font-bold text-green-700 hover:underline">Dismiss</button>
          </div>
        )}

        <div className="-mx-1 mb-2">
          <DemoNoticeBox
            storageKey="portal-welcome"
            badge="Pre-launch"
            title="Welcome to the BuildQuote Builder Portal"
            body="BuildQuote is pre-launch — please have a look around. When the BuildQuote Product Library launches, you'll be the first to know. Help us out: tell us the 3 manufacturers you'd most like to see in the Library."
            ctaLabel="Name your 3 manufacturers"
            submitType="Builder survey — 3 manufacturers"
            successMessage="Thanks for your input — we'll be in touch."
            maxWidth="100%"
            defaults={{ email: user?.email ?? '' }}
            fields={[
              { name: 'manufacturer_1', label: 'Manufacturer 1', required: true, placeholder: 'e.g. James Hardie' },
              { name: 'manufacturer_2', label: 'Manufacturer 2', placeholder: 'e.g. Colorbond' },
              { name: 'manufacturer_3', label: 'Manufacturer 3', placeholder: 'e.g. Weathertex' },
              { name: 'email', label: 'Your email', type: 'email', required: true },
            ]}
          />
        </div>
        {tab === 'jobs'      && <JobsTab builderId={user?.id ?? null} onViewQuotesForJob={handleViewQuotesForJob} />}
        {tab === 'suppliers' && <SuppliersTab builderId={user?.id ?? null} />}
        {tab === 'products'  && <FavouriteProductsTab builderId={user?.id ?? null} />}
        {tab === 'quotes'    && (
          <QuotesTab
            builderId={user?.id ?? null}
            highlightProject={highlightProject}
            onClearHighlight={() => setHighlightProject(undefined)}
          />
        )}
        {tab === 'profile'   && (
          <ProfilePanel
            user={user}
            profile={profile}
            onClose={() => setTab('jobs')}
            onGuestProfileSaved={(name) => setGuestName(name)}
            inline
          />
        )}
      </div>
      </div>

      {/* Profile panel */}
      {profileOpen && (
        <ProfilePanel
          user={user}
          profile={profile}
          onClose={() => setProfileOpen(false)}
          onGuestProfileSaved={(name) => setGuestName(name)}
        />
      )}
    </div>
  )
}
