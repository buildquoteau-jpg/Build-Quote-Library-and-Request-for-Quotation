import type { Metadata } from 'next'
import { getAllSystems, getManufacturers } from '@/lib/data/getSystems'
import { getAllPublishedSystems } from '@/lib/data/publishedCards'
import { LibraryPageClient } from '@/components/library/LibraryPageClient'

// ISR — revalidated on demand by /api/revalidate-card when a card publishes.
export const revalidate = 3600

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
  const [legacySystems, publishedSystems, manufacturers] = await Promise.all([
    getAllSystems(),
    getAllPublishedSystems(),
    getManufacturers(),
  ])

  // Hybrid-published snapshots win over legacy systems rows with the same
  // manufacturer + slug so re-published cards never show as duplicates.
  const publishedKeys = new Set(publishedSystems.map(s => `${s.manufacturer?.slug}/${s.slug}`))
  const systems = [
    ...publishedSystems,
    ...legacySystems.filter(s => !publishedKeys.has(`${s.manufacturer?.slug}/${s.slug}`)),
  ]

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
