import type { Metadata } from 'next'
import { getAllSystems, getManufacturers } from '@/lib/data/getSystems'
import { LibraryPageClient } from '@/components/library/LibraryPageClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Building Product Library | BuildQuote',
  description:
    'Browse building product systems from leading manufacturers — cladding, decking, roofing, interior linings and more. Add to your list and request a quote from local South West WA suppliers.',
  openGraph: {
    title: 'Building Product Library | BuildQuote',
    description:
      'Browse building product systems from leading manufacturers. Add to your list and request a quote from local South West WA suppliers.',
    url: 'https://buildquote.com.au/library',
    siteName: 'BuildQuote',
    locale: 'en_AU',
    type: 'website',
  },
}

export default async function LibraryPage() {
  const [systems, manufacturers] = await Promise.all([getAllSystems(), getManufacturers()])

  const categories = Array.from(
    new Set(systems.map(s => s.category || 'Other'))
  ).sort()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Building Product Library',
    description: 'Browse building product systems from leading manufacturers available through BuildQuote.',
    url: 'https://buildquote.com.au/library',
    publisher: { '@type': 'Organization', name: 'BuildQuote', url: 'https://buildquote.com.au' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main style={{ fontFamily: 'var(--font-barlow), sans-serif', background: '#f5f7f9', minHeight: '100vh' }}>
        {systems.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '15px' }}>No products in the library yet.</p>
          </div>
        ) : (
          <LibraryPageClient initialSystems={systems} categories={categories} manufacturerList={manufacturers} />
        )}
      </main>
    </>
  )
}
