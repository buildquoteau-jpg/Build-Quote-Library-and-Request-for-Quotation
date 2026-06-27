'use client'

import { useState } from 'react'
import type { LibrarySystem, LibraryProfile, LibraryColour, LibraryComponent } from '@/lib/data/getSystems'

// Strip trailing " System" / " Systems" from display names
function stripSystem(name: string): string {
  return name.replace(/\s+systems?$/i, '').trim()
}

// ── Shopping list item type (exported for ShoppingListProvider) ───────────────

export type ShoppingListItem = {
  id: string
  name: string
  sku: string
  desc: string
  uom: string
  qty: number
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  system: LibrarySystem
  onAddToList?: (items: ShoppingListItem[]) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDims(p: LibraryProfile): string {
  const parts: string[] = []
  if (p.length_mm)  parts.push(`${p.length_mm}mm`)
  if (p.width_mm)   parts.push(`${p.width_mm}mm`)
  if (p.height_mm && !p.length_mm) parts.push(`${p.height_mm}mm`)
  if (p.thickness_mm) parts.push(`${p.thickness_mm}mm`)
  return parts.join(' × ')
}

function fmtUom(uom: string | null): string {
  if (!uom) return ''
  const map: Record<string, string> = {
    sheet: 'SHEET', roll: 'ROLL', ea: 'EACH', each: 'EACH',
    lm: 'LIN.M', m2: 'M²', kg: 'KG', box: 'BOX', pack: 'PACK', length: 'LENGTH',
  }
  return map[uom.toLowerCase()] ?? uom.toUpperCase()
}

function formatGroupKey(key: string): string {
  return /^\d+(\.\d+)?$/.test(key) ? `${key}mm` : key
}

function extractNums(s: string): number[] {
  return (s.match(/\d+(?:\.\d+)?/g) || []).map(Number)
}

// ── Checkbox ──────────────────────────────────────────────────────────────────

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      width: '22px', height: '22px', borderRadius: '6px',
      background: checked ? '#185D7A' : '#fff',
      border: `2px solid ${checked ? '#185D7A' : '#d1d5db'}`,
    }}>
      {checked && (
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  )
}

// ── Profile grouping ──────────────────────────────────────────────────────────

type ProfileGroupItem = { label: string; profile: LibraryProfile; idx: number }
type ProfileGroup     = { key: string; items: ProfileGroupItem[] }

function groupProfiles(profiles: LibraryProfile[]): ProfileGroup[] {
  if (profiles.length === 0) return []

  const names     = profiles.map(p => (p.profile_name || p.name || '').trim())
  const tokenized = names.map(n => n.split(/\s+/))
  const maxLen    = Math.max(...tokenized.map(t => t.length))

  if (names.some(n => n.includes(' — '))) {
    const map = new Map<string, ProfileGroupItem[]>()
    for (let i = 0; i < profiles.length; i++) {
      const sep   = names[i].indexOf(' — ')
      const key   = sep !== -1 ? names[i].slice(0, sep) : ''
      const label = sep !== -1 ? names[i].slice(sep + 3) : names[i]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push({ label, profile: profiles[i], idx: i })
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }))
  }

  function buildMap(fromEnd: boolean, n: number) {
    const map = new Map<string, ProfileGroupItem[]>()
    for (let i = 0; i < profiles.length; i++) {
      const t = tokenized[i]; const len = t.length
      let key: string, label: string
      if (fromEnd) {
        key   = t.slice(Math.max(0, len - n)).join(' ')
        label = t.slice(0, Math.max(0, len - n)).join(' ').replace(/\s*[x×]\s*$/, '').trim() || names[i]
      } else {
        key   = t.slice(0, n).join(' ')
        label = t.slice(n).join(' ') || names[i]
      }
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push({ label, profile: profiles[i], idx: i })
    }
    return map
  }

  function findMinN(fromEnd: boolean): number {
    for (let n = 1; n < maxLen; n++) {
      const counts = new Map<string, number>()
      for (const t of tokenized) {
        const k = fromEnd ? t.slice(Math.max(0, t.length - n)).join(' ') : t.slice(0, n).join(' ')
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
      if (Array.from(counts.values()).some(c => c > 1)) return n
    }
    return 0
  }

  const prefixN = findMinN(false)
  const suffixN = findMinN(true)
  const prefixMap = prefixN > 0 ? buildMap(false, prefixN) : null
  const suffixMap = suffixN > 0 ? buildMap(true, suffixN)  : null

  let chosen: Map<string, ProfileGroupItem[]> | null = null
  if (prefixMap && suffixMap) {
    chosen = suffixMap.size < prefixMap.size ? suffixMap : prefixMap
  } else {
    chosen = prefixMap ?? suffixMap
  }

  if (chosen) return Array.from(chosen.entries()).map(([key, items]) => ({ key, items }))
  return [{ key: '', items: profiles.map((p, i) => ({ label: names[i], profile: p, idx: i })) }]
}

// ── Profile row ───────────────────────────────────────────────────────────────

function ProfileRow({ label, profile, idx, selected, onToggle }: {
  label: string
  profile: LibraryProfile
  idx: number
  selected: Set<number>
  onToggle: (idx: number) => void
}) {
  const isSel = selected.has(idx)
  const dims  = fmtDims(profile)
  const uom   = fmtUom(profile.uom)
  const sku   = profile.product_code

  const labelNums     = extractNums(label)
  const dimsNums      = extractNums(dims)
  const labelOverlaps = labelNums.length > 0 && labelNums.every((n, i) => dimsNums[i] === n)

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: labelOverlaps ? 'center' : 'flex-start',
    justifyContent: 'space-between', gap: '10px', width: '100%', textAlign: 'left',
    padding: '9px 12px',
    background: isSel ? '#eef6fa' : '#f9fafb',
    border: `1.5px solid ${isSel ? '#185D7A' : '#e5e7eb'}`,
    borderRadius: '10px', cursor: 'pointer', transition: 'all 0.12s',
  }

  // Single-line layout matching shopping list columns: label+dims | SKU | UOM | checkbox
  const displayLabel = labelOverlaps ? dims : label
  const displaySpecs = labelOverlaps ? '' : dims

  return (
    <button type="button" onClick={() => onToggle(idx)} style={{ ...rowStyle, alignItems: 'center' }}>
      {/* Profile / Specs */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '13px', fontWeight: isSel ? 700 : 600, color: isSel ? '#0f2d3d' : '#111827' }}>
          {displayLabel}
        </span>
        {displaySpecs && (
          <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>{displaySpecs}</span>
        )}
      </div>
      {/* SKU */}
      {sku && (
        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#4b5563', background: isSel ? '#d4ecf5' : '#f3f4f6', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
          {sku}
        </span>
      )}
      {/* UOM badge */}
      {uom && (
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: isSel ? '#fff' : '#185D7A', background: isSel ? '#185D7A' : '#eef6fa', border: `1px solid ${isSel ? '#185D7A' : '#b6dcea'}`, padding: '2px 7px', borderRadius: '5px', flexShrink: 0, minWidth: '44px', textAlign: 'center' }}>
          {uom}
        </span>
      )}
      <Checkbox checked={isSel} />
    </button>
  )
}

// ── Profile group block ───────────────────────────────────────────────────────

function ProfileGroupBlock({ groupKey, systemName, showSystemName, items, defaultOpen, selected, onToggle }: {
  groupKey: string
  systemName: string
  showSystemName: boolean
  items: ProfileGroupItem[]
  defaultOpen: boolean
  selected: Set<number>
  onToggle: (idx: number) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (!groupKey) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map(({ label, profile, idx }) => (
          <ProfileRow key={idx} label={label} profile={profile} idx={idx} selected={selected} onToggle={onToggle} />
        ))}
      </div>
    )
  }

  const fmtKey     = formatGroupKey(groupKey)
  const keyAlreadyIn = systemName.toLowerCase().includes(fmtKey.toLowerCase().replace('mm', ''))
  const displayKey = showSystemName
    ? (keyAlreadyIn ? systemName : `${systemName} ${fmtKey}`)
    : fmtKey

  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', background: 'none', border: 'none',
        cursor: 'pointer', padding: '10px 0 8px', textAlign: 'left', minHeight: '44px',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', paddingLeft: '10px', borderLeft: '3px solid #185D7A', marginRight: '6px' }}>
          {displayKey}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#185D7A', flexShrink: 0 }}>
          {open ? '▲' : `▼ ${items.length}`}
        </span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '4px' }}>
          {items.map(({ label, profile, idx }) => (
            <ProfileRow key={idx} label={label} profile={profile} idx={idx} selected={selected} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Profiles section ──────────────────────────────────────────────────────────

function ProfilesSection({ profiles, systemName, selected, onToggle }: {
  profiles: LibraryProfile[]
  systemName: string
  selected: Set<number>
  onToggle: (idx: number) => void
}) {
  if (profiles.length === 0) return null
  const groups      = groupProfiles(profiles)
  const defaultOpen = profiles.length <= 3
  const multiGroup  = groups.length > 1
  const useHeaders  = multiGroup || !defaultOpen

  return (
    <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155', marginBottom: '0.75rem' }}>
        Profiles · {profiles.length} variant{profiles.length !== 1 ? 's' : ''}
      </div>
      {!multiGroup && (
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', paddingLeft: '10px', borderLeft: '3px solid #185D7A', marginBottom: '8px' }}>
          {(() => {
            const key = groups[0]?.key ?? ''
            const fmtKey = formatGroupKey(key)
            const alreadyIn = key && systemName.toLowerCase().includes(fmtKey.toLowerCase())
            return (!useHeaders && key && !alreadyIn) ? `${systemName} ${fmtKey}` : systemName
          })()}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {!useHeaders ? (
          groups.flatMap(({ items }) => items).map(({ label, profile, idx }) => (
            <ProfileRow key={idx} label={label} profile={profile} idx={idx} selected={selected} onToggle={onToggle} />
          ))
        ) : (
          groups.map(({ key, items }) => (
            <ProfileGroupBlock
              key={key || '__all__'}
              groupKey={key}
              systemName={systemName}
              showSystemName={multiGroup}
              items={items}
              defaultOpen={defaultOpen}
              selected={selected}
              onToggle={onToggle}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Components section ────────────────────────────────────────────────────────

function ComponentsSection({ components, selected, onToggle }: {
  components: LibraryComponent[]
  selected: Set<number>
  onToggle: (idx: number) => void
}) {
  const [open, setOpen] = useState(false)
  if (components.length === 0) return null

  return (
    <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', cursor: 'pointer', textAlign: 'left',
        background: '#eef6fa', border: '1.5px solid #b8d9e8',
        borderRadius: '10px', padding: '12px 14px', minHeight: '48px',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#185D7A' }}>
          Accessories &amp; Components · {components.length}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#185D7A', flexShrink: 0, marginLeft: '8px' }}>
          {open ? '▲ Hide' : '▼ Show'}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {components.map((comp, i) => {
            const c = comp.components
            const isSel = selected.has(i)
            return (
              <button key={i} type="button" onClick={() => onToggle(i)} style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                gap: '10px', width: '100%', textAlign: 'left', padding: '12px',
                background: isSel ? '#eef6fa' : '#f9fafb',
                border: `1.5px solid ${isSel ? '#185D7A' : '#e5e7eb'}`,
                borderRadius: '10px', cursor: 'pointer', transition: 'all 0.12s',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: isSel ? 700 : 600, color: isSel ? '#0f2d3d' : '#111827', lineHeight: 1.3 }}>
                    {c?.name ?? comp.role}
                  </div>
                  <div style={{ marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {comp.role && c?.name && (
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{comp.role}</span>
                    )}
                    {c?.description && (
                      <span style={{ fontSize: '12px', color: '#4b5563' }}>{c.description}</span>
                    )}
                    {c?.sku && (
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#4b5563', background: isSel ? '#d4ecf5' : '#f3f4f6', padding: '1px 5px', borderRadius: '4px' }}>
                        {c.sku}
                      </span>
                    )}
                  </div>
                </div>
                <Checkbox checked={isSel} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Attribute pills ───────────────────────────────────────────────────────────

function AttributePills({ system }: { system: LibrarySystem }) {
  const badges: { label: string; bg: string; color: string }[] = []

  if (system.bal_rating)         badges.push({ label: system.bal_rating,            bg: '#fff7ed', color: '#c2410c' })
  if (system.fire_rating)        badges.push({ label: `FRL ${system.fire_rating}`,  bg: '#fef2f2', color: '#b91c1c' })
  if (system.moisture_resistant) badges.push({ label: 'Moisture resistant',          bg: '#f0f9ff', color: '#0369a1' })
  if (system.acoustic_rating)    badges.push({ label: system.acoustic_rating,        bg: '#faf5ff', color: '#7e22ce' })
  if (system.structural_grade)   badges.push({ label: system.structural_grade,       bg: '#f0fdf4', color: '#15803d' })
  if (system.australian_made)    badges.push({ label: 'Australian made',             bg: '#f0fdf4', color: '#166534' })
  if (system.notes?.toLowerCase().includes('primed') || system.notes?.toLowerCase().includes('site paint'))
    badges.push({ label: 'Pre-primed / site painted', bg: '#f8fafc', color: '#475569' })

  if (badges.length === 0) return null

  return (
    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {badges.map((b, i) => (
          <span key={i} style={{
            display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 99,
            fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.02em',
            background: b.bg, color: b.color, border: `1px solid ${b.color}33`,
          }}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Colours section ───────────────────────────────────────────────────────────

function ColoursSection({ colours, selected, onSelect }: {
  colours: LibraryColour[]
  selected: string | null
  onSelect: (name: string) => void
}) {
  if (colours.length === 0) return null
  return (
    <div style={{ marginTop: '1.25rem' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155', marginBottom: '0.6rem' }}>
        Select Colour (optional)
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {colours.map((c, i) => {
          const isSel = selected === c.colour_name
          return (
            <button key={i} type="button" onClick={() => onSelect(c.colour_name)} style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              fontSize: '13px', fontWeight: isSel ? 700 : 500,
              background: isSel ? '#eef6fa' : '#f8fafc',
              color: isSel ? '#185D7A' : '#374151',
              border: `${isSel ? '2px' : '1px'} solid ${isSel ? '#185D7A' : '#e2e8f0'}`,
              padding: c.image_url ? '4px 10px 4px 4px' : '5px 12px',
              borderRadius: '20px', lineHeight: 1.4, cursor: 'pointer',
              transition: 'all 0.12s',
            }}>
              {c.image_url && (
                <span style={{
                  display: 'inline-block', width: '20px', height: '20px',
                  borderRadius: '50%', flexShrink: 0,
                  background: `url(${c.image_url}) center/cover`,
                  border: '1px solid rgba(0,0,0,0.1)',
                }} />
              )}
              {c.colour_name}
              {isSel && <span style={{ fontSize: '11px' }}>✓</span>}
              {c.is_stocked === false && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af' }}>EOI</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function SystemCardUI({ system, onAddToList }: Props) {
  const [selectedProfiles,   setSelectedProfiles]   = useState<Set<number>>(new Set())
  const [selectedComponents, setSelectedComponents] = useState<Set<number>>(new Set())
  const [selectedColour,     setSelectedColour]     = useState<string | null>(null)

  const posX = system.hero_image_position_x ?? 50
  const posY = system.hero_image_position_y ?? 50

  function toggleProfile(idx: number) {
    setSelectedProfiles(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  }
  function toggleComponent(idx: number) {
    setSelectedComponents(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  }

  function handleAddToList() {
    if (!onAddToList) return
    const items: ShoppingListItem[] = []

    system.system_profiles.forEach((p, idx) => {
      if (!selectedProfiles.has(idx)) return
      const base = stripSystem(system.name)
      const profileLabel = (p.profile_name || p.name || '').trim()
      // Only append profileLabel if its first word isn't already in the base name
      const firstWord = profileLabel.split(/\s+/)[0]?.toLowerCase() ?? ''
      const alreadyIn = firstWord && base.toLowerCase().includes(firstWord)
      const name = (!alreadyIn && profileLabel) ? `${base} ${profileLabel}` : base
      const dims = fmtDims(p)
      items.push({
        id: `${Date.now()}-p${idx}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        sku: p.product_code ?? '',
        desc: dims,
        uom: fmtUom(p.uom) || 'EA',
        qty: 1,
      })
    })

    system.system_components.forEach((comp, idx) => {
      if (!selectedComponents.has(idx)) return
      const c = comp.components
      items.push({
        id: `${Date.now()}-c${idx}-${Math.random().toString(36).slice(2, 6)}`,
        name: c?.name ?? comp.role,
        sku: c?.sku ?? '',
        desc: c?.description ?? '',
        uom: c?.uom?.toUpperCase() ?? 'EA',
        qty: 1,
      })
    })

    if (items.length > 0) {
      onAddToList(items)
      setSelectedProfiles(new Set())
      setSelectedComponents(new Set())
    }
  }

  const hasSelections = selectedProfiles.size > 0 || selectedComponents.size > 0
  const totalSelected = selectedProfiles.size + selectedComponents.size

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #d1d9e0',
      borderRadius: '12px',
      overflow: 'hidden',
      fontFamily: 'var(--font-barlow), sans-serif',
    }}>

      {/* Hero */}
      <div style={{
        position: 'relative',
        height: '220px',
        background: system.hero_image_url?.trim()
          ? undefined
          : 'linear-gradient(135deg, #185D7A 0%, #0f3d52 100%)',
        overflow: 'hidden',
      }}>
        {system.hero_image_url?.trim() && (
          <img
            src={system.hero_image_url.trim()}
            alt={system.name}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: `${posX}% ${posY}%`,
            }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,30,45,0.88) 0%, rgba(15,30,45,0.2) 60%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px 18px' }}>
          {system.manufacturer && (
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: '4px' }}>
              {system.manufacturer.name}
            </div>
          )}
          <h1 style={{
            fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: '#fff',
            margin: 0, lineHeight: 1.15, letterSpacing: '-0.01em',
            fontFamily: 'var(--font-barlow-condensed), sans-serif',
          }}>
            {stripSystem(system.name)}
          </h1>
          {(system.category || system.subcategory) && (
            <div style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
              {[system.category, system.subcategory].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 20px 24px' }}>

        {system.description && (
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.65, margin: 0 }}>
            {system.description}
          </p>
        )}

        {/* Profile + component count */}
        {(system.system_profiles.length > 0 || system.system_components.length > 0) && (
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '8px 0 0' }}>
            {system.system_profiles.length > 0
              ? `${system.system_profiles.length} profile${system.system_profiles.length !== 1 ? 's' : ''}`
              : ''}
            {system.system_profiles.length > 0 && system.system_components.length > 0 ? ' · ' : ''}
            {system.system_components.length > 0
              ? `${system.system_components.length} component${system.system_components.length !== 1 ? 's' : ''}`
              : ''}
          </p>
        )}

        <ColoursSection
          colours={system.system_colours}
          selected={selectedColour}
          onSelect={name => setSelectedColour(prev => prev === name ? null : name)}
        />

        <ProfilesSection
          profiles={system.system_profiles}
          systemName={stripSystem(system.name)}
          selected={selectedProfiles}
          onToggle={toggleProfile}
        />

        <ComponentsSection
          components={system.system_components}
          selected={selectedComponents}
          onToggle={toggleComponent}
        />

        <AttributePills system={system} />

        {/* Action buttons */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Add to list */}
          {onAddToList && (
            <button
              type="button"
              onClick={handleAddToList}
              disabled={!hasSelections}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '13px 16px', fontSize: '14px', fontWeight: 700,
                color: hasSelections ? '#fff' : '#9ca3af',
                background: hasSelections ? '#185D7A' : '#f1f5f9',
                border: `1.5px solid ${hasSelections ? '#185D7A' : '#e2e8f0'}`,
                borderRadius: '10px', cursor: hasSelections ? 'pointer' : 'default',
                transition: 'all 0.15s', boxSizing: 'border-box',
              }}
            >
              {hasSelections
                ? `Add ${totalSelected} item${totalSelected !== 1 ? 's' : ''} to shopping list`
                : 'Select profiles or components above'}
            </button>
          )}

          {/* See local stockists — coming soon */}
          <span style={{ ...ghostLinkStyle, opacity: 0.45, cursor: 'default', userSelect: 'none' }}>
            See local stockists
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginLeft: '6px' }}>Coming soon</span>
          </span>

          {/* Manufacturer website */}
          {system.website_url && (
            <a href={system.website_url} target="_blank" rel="noopener noreferrer" style={ghostLinkStyle}>
              See {stripSystem(system.name)} on {system.manufacturer?.name ?? 'manufacturer'} website
              <ExternalIcon />
            </a>
          )}

          {/* Install guides */}
          {(system.install_guide_urls ?? []).map((guide, i) => (
            <a key={i} href={guide.url} target="_blank" rel="noopener noreferrer" style={ghostLinkStyle}>
              See {stripSystem(system.name)} installation guide
              <ExternalIcon />
            </a>
          ))}

          {/* Design guide */}
          {system.design_guide_url && (
            <a href={system.design_guide_url} target="_blank" rel="noopener noreferrer" style={ghostLinkStyle}>
              See {stripSystem(system.name)} design guide
              <ExternalIcon />
            </a>
          )}

          {/* Tech data */}
          {system.tech_data_url && (
            <a href={system.tech_data_url} target="_blank" rel="noopener noreferrer" style={ghostLinkStyle}>
              See {stripSystem(system.name)} technical guide
              <ExternalIcon />
            </a>
          )}

        </div>

      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const ghostLinkStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  padding: '13px 16px', fontSize: '14px', fontWeight: 600,
  color: '#185D7A', background: '#eef6fa', border: '1.5px solid #b6dcea',
  borderRadius: '10px', textDecoration: 'none', boxSizing: 'border-box',
}

function ExternalIcon({ color = '#185D7A' }: { color?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
      <path d="M2 10L10 2M10 2H4M10 2V8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
