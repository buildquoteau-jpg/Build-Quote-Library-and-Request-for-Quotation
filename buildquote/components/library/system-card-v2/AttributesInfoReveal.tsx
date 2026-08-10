// Attributes and Information screen — ported from Data Studio's System
// Card V2 (components/system-card-v2/AttributesInfoReveal.tsx), retyped
// against this app's own LibrarySystem. Every real, non-null technical
// attribute the data model holds; fields that don't exist for a given
// system are correctly absent rather than printed as filler.
//
// One field from the Data Studio source is intentionally dropped: this
// app's LibrarySystem has no `applications` column (that's a Data-Studio-
// only addition not yet in this app's schema) — so there's no Applications
// block here. Nothing else changed.

import type { LibrarySystem } from '@/lib/data/getSystems'
import styles from './RevealsBody.module.css'

export function hasAttributesContent(system: LibrarySystem): boolean {
  if (system.description) return true
  if (system.moisture_resistant || system.bal_rating || system.fire_rating || system.acoustic_rating || system.structural_grade || system.australian_made != null) return true
  if (system.custom_technical_attributes && system.custom_technical_attributes.length > 0) return true
  if (system.notes) return true
  return false
}

type PillTone = 'moisture' | 'bal' | 'fire' | 'acoustic' | 'structural' | 'australian' | 'colourways'
  | 'custom0' | 'custom1' | 'custom2' | 'custom3' | 'custom4'

const CUSTOM_TONES: PillTone[] = ['custom0', 'custom1', 'custom2', 'custom3', 'custom4']

export function AttributesInfoReveal({ system }: { system: LibrarySystem }) {
  // Every attribute-like fact about the system as one flat list of pills --
  // previously split three ways (a floating badge row, a Performance pill
  // row, and an Additional specification table), which Melia flagged as a
  // "triple up". Moisture resistant, in particular, used to appear in both
  // the badge row and Performance at once. Now there's exactly one pill per
  // fact, all under the Performance heading.
  const pills: { text: string; tone: PillTone }[] = []
  if (system.moisture_resistant) pills.push({ text: 'Moisture resistant', tone: 'moisture' })
  if (system.bal_rating) pills.push({ text: system.bal_rating, tone: 'bal' })
  if (system.fire_rating) pills.push({ text: `FRL ${system.fire_rating}`, tone: 'fire' })
  if (system.acoustic_rating) pills.push({ text: system.acoustic_rating, tone: 'acoustic' })
  if (system.structural_grade) pills.push({ text: system.structural_grade, tone: 'structural' })
  if (system.australian_made) pills.push({ text: 'Australian made', tone: 'australian' })
  if (system.system_colours.length > 0) {
    pills.push({ text: `${system.system_colours.length} colourway${system.system_colours.length !== 1 ? 's' : ''}`, tone: 'colourways' })
  }
  // Cycle through a dedicated palette so custom attributes read as distinct
  // facts, not one uniform grey block -- Melia flagged them all being the
  // same colour as still looking flat next to the named ratings' hues.
  system.custom_technical_attributes?.forEach((attr, i) => {
    pills.push({ text: `${attr.label}: ${attr.value}`, tone: CUSTOM_TONES[i % CUSTOM_TONES.length] })
  })

  return (
    <>
      {system.description && (
        <div className={styles.specGroup}>
          <p className={styles.specGroupLabel}>Description</p>
          <div className={styles.specBox}>
            <p className={styles.descriptionText}>{system.description}</p>
          </div>
        </div>
      )}

      {pills.length > 0 && (
        <div className={styles.specGroup}>
          <p className={styles.specGroupLabel}>Performance</p>
          <div className={styles.attributePillRow}>
            {pills.map((p, i) => (
              <span key={`${p.tone}-${i}`} className={styles.attributePill} data-tone={p.tone}>{p.text}</span>
            ))}
          </div>
        </div>
      )}

      {system.notes && (
        <div className={styles.specGroup}>
          <p className={styles.specGroupLabel}>Notes</p>
          <p className={styles.descriptionText}>{system.notes}</p>
        </div>
      )}
    </>
  )
}
