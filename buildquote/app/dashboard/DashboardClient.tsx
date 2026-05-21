'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import JobsTab from '@/components/builder/JobsTab'
import SuppliersTab from '@/components/builder/SuppliersTab'
import FavouriteProductsTab from '@/components/builder/FavouriteProductsTab'
import ProfilePanel from '@/components/builder/ProfilePanel'
import QuotesTab from '@/components/builder/QuotesTab'

type Tab = 'jobs' | 'suppliers' | 'products' | 'profile' | 'quotes'

interface Props {
  user: User
  profile: any
}

export default function DashboardClient({ user, profile }: Props) {
  const [tab, setTab] = useState<Tab>('jobs')
  const [profileOpen, setProfileOpen] = useState(false)

  const displayName = profile?.builder_name || profile?.company_name || user.email

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <div className="bg-navy text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            Build<span className="text-brand">Quote</span>
            <span className="text-white/60 font-normal text-sm ml-2">Builder Portal</span>
          </h1>
          <p className="text-white/70 text-xs mt-0.5">G'day, {displayName}</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/rfq"
            className="bg-brand hover:bg-brand-hover text-white text-sm font-bold px-4 py-2 rounded-xl transition"
          >
            + New RFQ
          </a>
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
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-subtle bg-surface sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex">
          {([
            { key: 'jobs',      label: 'Current Jobs' },
            { key: 'suppliers', label: 'Preferred Suppliers' },
            { key: 'products',  label: 'Favourite Products' },
            { key: 'quotes',    label: 'My Quotes' },
            { key: 'profile',   label: 'My Profile' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-4 text-sm font-semibold border-b-2 transition ${
                tab === t.key
                  ? 'border-navy text-navy'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {tab === 'jobs'      && <JobsTab builderId={user.id} onViewQuotes={() => setTab('quotes')} />}
        {tab === 'suppliers' && <SuppliersTab builderId={user.id} />}
        {tab === 'products'  && <FavouriteProductsTab builderId={user.id} />}
        {tab === 'quotes'    && <QuotesTab builderId={user.id} />}
        {tab === 'profile'   && (
          <ProfilePanel user={user} profile={profile} onClose={() => setTab('jobs')} inline />
        )}
      </div>

      {/* Profile panel */}
      {profileOpen && (
        <ProfilePanel
          user={user}
          profile={profile}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  )
}
