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

type RatingTone = 'moisture' | 'bal' | 'fire' | 'acoustic' | 'structural' | 'australian'

export function AttributesInfoReveal({ system }: { system: LibrarySystem }) {
  // Colour-coded pills, one per attribute type -- restores the look
  // SystemCardUI.tsx (V1) used (see AttributePills there): each rating
  // gets its own hue rather than sitting in a shared label/value table.
  const ratings: { text: string; tone: RatingTone }[] = []
  if (system.moisture_resistant) ratings.push({ text: 'Moisture resistant', tone: 'moisture' })
  if (system.bal_rating) ratings.push({ text: system.bal_rating, tone: 'bal' })
  if (system.fire_rating) ratings.push({ text: `FRL ${system.fire_rating}`, tone: 'fire' })
  if (system.acoustic_rating) ratings.push({ text: system.acoustic_rating, tone: 'acoustic' })
  if (system.structural_grade) ratings.push({ text: system.structural_grade, tone: 'structural' })
  if (system.australian_made) ratings.push({ text: 'Australian made', tone: 'australian' })

  const badges: { label: string; tone: 'performance' | 'neutral' }[] = []
  if (system.moisture_resistant) badges.push({ label: 'Moisture resistant', tone: 'performance' })
  if (system.system_colours.length > 0) {
    badges.push({ label: `${system.system_colours.length} colourway${system.system_colours.length !== 1 ? 's' : ''}`, tone: 'neutral' })
  }

  return (
    <>
      {badges.length > 0 && (
        <div className={styles.badgeRow}>
          {badges.map(b => <span key={b.label} className={styles.badge} data-tone={b.tone}>{b.label}</span>)}
        </div>
      )}

      {system.description && (
        <div className={styles.specGroup}>
          <p className={styles.specGroupLabel}>Description</p>
          <div className={styles.specBox}>
            <p className={styles.descriptionText}>{system.description}</p>
          </div>
        </div>
      )}

      {ratings.length > 0 && (
        <div className={styles.specGroup}>
          <p className={styles.specGroupLabel}>Performance</p>
          <div className={styles.attributePillRow}>
            {ratings.map(r => (
              <span key={r.tone} className={styles.attributePill} data-tone={r.tone}>{r.text}</span>
            ))}
          </div>
        </div>
      )}

      {system.custom_technical_attributes && system.custom_technical_attributes.length > 0 && (
        <div className={styles.specGroup}>
          <p className={styles.specGroupLabel}>Additional specification</p>
          <div className={styles.specBox}>
            {system.custom_technical_attributes.map(a => (
              <div key={a.label} className={styles.specRow}>
                <span className={styles.specRowLabel}>{a.label}</span>
                <span className={styles.specRowValue}>{a.value}</span>
              </div>
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
