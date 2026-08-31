'use client'

// System Card V2 — a compact card object that unfolds. The cover is always
// visible at the top; beneath it, independent labelled bars reveal their
// content directly underneath themselves when tapped, and fold back up when
// tapped again. Any number can be open at once. Ported from Data Studio's
// System Card V2 (components/system-card-v2/SystemCardV2Experience.tsx),
// retyped against this app's own LibrarySystem/Stockist and wired to the
// real ShoppingListProvider via the optional onAddToList prop (see
// StockistsReveal.tsx) instead of the sandbox's placeholder-only selection
// preview. Replaces SystemCardUI.tsx only at this one call site
// (app/library/[manufacturer]/[system]/SystemCardWrapper.tsx) —
// SystemCardUI.tsx/HeroGallery.tsx are untouched and still fully present.

import { useState } from 'react'
import type { LibrarySystem, Stockist } from '@/lib/data/getSystems'
import { Cover } from './Cover'
import { SelectionProvider } from './SelectionContext'
import { SystemCardSection } from './SystemCardSection'
import { ChooseReveal } from './ChooseReveal'
import { AttributesInfoReveal, hasAttributesContent } from './AttributesInfoReveal'
import { GuidesResourcesReveal } from './GuidesResourcesReveal'
import { ComponentsAccessoriesReveal } from './ComponentsAccessoriesReveal'
import { StockistsReveal } from './StockistsReveal'
// AskAboutProductReveal: unused while the "Ask about this product" section
// below is commented out — see the note at the top of AskAboutProductReveal.tsx.
import { MaterialsListBar } from './MaterialsListBar'
import type { ShoppingListItem } from './useMaterialsListRows'
import { shareSystemCard } from './shareCard'
import styles from './RevealsBody.module.css'

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" /><line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
    </svg>
  )
}


const SECTION_IDS = ['choose', 'attributes', 'ask', 'guides', 'components', 'stockists'] as const
type SectionId = typeof SECTION_IDS[number]

export function SystemCardV2Experience({ system, stockists = [], onAddToList, cardUrl }: {
  system: LibrarySystem
  stockists?: Stockist[]
  onAddToList?: (items: ShoppingListItem[]) => void
  cardUrl?: string
}) {
  const manufacturer = { name: system.manufacturer?.name ?? 'Manufacturer' }

  // A Set of open section ids, not one currentStep — several sections must
  // be able to stay open simultaneously. Starts empty: the card's resting/
  // shareable state is fully closed.
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set())
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle')

  function toggleSection(id: SectionId) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleShare() {
    const outcome = await shareSystemCard({
      title: `${system.name} — ${manufacturer.name} System Card`,
      text: system.description ?? system.name,
      url: cardUrl ?? window.location.href,
    })
    if (outcome === 'copied') {
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 2000)
    }
  }

  const noProfiles = system.system_colours.length === 0 && system.system_profiles.length === 0
  const noComponents = system.system_components.length === 0

  return (
    <SelectionProvider>
      <div style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>
        <div className={styles.page}>
          <div className={styles.card}>
            <Cover manufacturer={manufacturer} system={system} cardUrl={cardUrl} />

            <div className={styles.sectionsList}>
              <SystemCardSection
                id="choose"
                title="Colours. Profiles. Finishes."
                open={openSections.has('choose')}
                onToggle={() => toggleSection('choose')}
                disabled={noProfiles}
              >
                <ChooseReveal colours={system.system_colours} profiles={system.system_profiles} />
              </SystemCardSection>

              <SystemCardSection
                id="attributes"
                title="Applications"
                open={openSections.has('attributes')}
                onToggle={() => toggleSection('attributes')}
                disabled={!hasAttributesContent(system)}
              >
                <AttributesInfoReveal system={system} />
              </SystemCardSection>

              {/* "Ask about this product" hidden from the card by request
                  (2026-08-31) — see the note at the top of
                  AskAboutProductReveal.tsx. Uncomment to bring it back.
              {system.manufacturer?.slug && (
                <SystemCardSection
                  id="ask"
                  title="Ask about this product"
                  open={openSections.has('ask')}
                  onToggle={() => toggleSection('ask')}
                >
                  <AskAboutProductReveal manufacturerSlug={system.manufacturer.slug} systemSlug={system.slug} />
                </SystemCardSection>
              )}
              */}

              <SystemCardSection
                id="guides"
                title="Guides and Resources"
                open={openSections.has('guides')}
                onToggle={() => toggleSection('guides')}
              >
                <GuidesResourcesReveal system={system} />
              </SystemCardSection>

              <SystemCardSection
                id="components"
                title="Components and Accessories"
                open={openSections.has('components')}
                onToggle={() => toggleSection('components')}
                disabled={noComponents}
              >
                <ComponentsAccessoriesReveal system={system} />
              </SystemCardSection>

              <SystemCardSection
                id="stockists"
                title="Stockists"
                open={openSections.has('stockists')}
                onToggle={() => toggleSection('stockists')}
              >
                <StockistsReveal system={system} stockists={stockists} />
              </SystemCardSection>

              <MaterialsListBar system={system} onAddToList={onAddToList} />

              <div className={styles.cardClose}>
                <button type="button" className={styles.barNext} onClick={handleShare}>
                  <ShareIcon />
                  {shareState === 'copied' ? 'Link copied' : 'Share System Card'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SelectionProvider>
  )
}
