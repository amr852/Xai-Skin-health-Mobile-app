# UI Floral Pass + New Screens — Design Spec
**Date:** 2026-05-09  
**Scope:** Xai Skin Health `MyApp/` — profile, camera chrome, camera review region cards, history sessions segment, register token alignment  
**Approach:** Option A — floral-band headers + sessions in History segment, no new routes

---

## 1. Constraints

- `DECORATION_BUDGET` hard rule: each decorative element appears in at most **2** places.
- No new decoration *types* introduced — only existing tokens (`Gradient.floralBand`, `Hairline`, `Petal`, `Overlay.*`).
- `FloralBand` is a new budget entry: allowed on `profile.hero` and `history.sessionCard` only.
- All colors, spacing, radius, shadow must use `theme.ts` tokens — no raw hex or `rgba()` literals.
- No new routes. No new tabs. No structural nav changes.

---

## 2. Profile Screen (`app/(tabs)/profile.tsx`)

### 2.1 Avatar hero strip
- Replace `backgroundColor: C.bg` on `heroBlock` with a `LinearGradient` using `Gradient.floralBand` (`['#FAF6F3', '#F3EBE5']`), vertical, covering the full hero block.
- Avatar outer ring border: `C.headerAvatarRing` (`#9B3058`) at `borderWidth: 2` — was `C.border`.
- Avatar inner circle: unchanged (`C.primary` bg, white initials).
- No `Petal` or `Crest` added to profile — budget is already at capacity for those elements.

### 2.2 Divider
- Add `<Hairline>` between the hero block and the quick actions row.
- This satisfies `DECORATION_BUDGET.Hairline: ['profile.section', 'history.filterBar']` — `profile.section` is already in the budget map, so no budget change needed.

### 2.3 Section labels
- No change to content. Verify `fontFamily` uses `FontFamily.bodyBold` and color is `C.primary` (already correct per audit).

### 2.4 DECORATION_BUDGET update
Add to `theme.ts`:
```ts
FloralBand: ['profile.hero', 'history.sessionCard'],
```

---

## 3. Camera Chrome (`app/(tabs)/camera.tsx`)

### 3.1 Intro phase (`scanPhase === 'intro'`)
- Outer screen bg: `C.bg` (already correct — verify no overrides).
- Instruction container: `C.surface` card bg, `C.border` border `1pt`, `Radius.xl`, `Shadow.xs`, `Space[5]` padding.
- Each instruction bullet: replace plain text prefix with a `View` dot (`width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.primary, marginTop: 6`) — not a new decoration type, just a styled list marker.
- "Start Scan" / "Choose from Library" buttons: use `AppButton` `variant="primary"` / `variant="secondary"` at `size="lg"`. Ensure no inline `backgroundColor` overrides.

### 3.2 Live camera overlay (`scanPhase === 'camera'`)
- Torch and flip icon containers: `backgroundColor: Overlay.scrimSoft` — replace any hardcoded `rgba(0,0,0,…)`.
- Capture button outer ring: `borderColor: Overlay.whiteSubtle`, `borderWidth: 3`.
- Capture button inner fill: `backgroundColor: C.surface`.
- Gallery picker pill: `backgroundColor: C.surfaceAlt`, `C.primary` icon, `Radius.md` corners, `Space[2]` padding.
- All icon sizes: `IconSize.lg` (22) for torch/flip, `IconSize['2xl']` (36) for capture icon.

### 3.3 Review phase (`scanPhase === 'review'`) — region cards
- `ImageWithBboxOverlay` remains at top, unchanged.
- Below image: if `analysis?.lesions?.length > 0`, render a `RegionCard` list.

**RegionCard sub-component** (inline in `camera.tsx`):
```
Props: { index: number; lesion_id?: string; severity?: string;
         diagnosis?: { label: string; score: number }; bbox?: { conf: number } }
```
- Container: `C.surface` bg, `C.border` border `1pt`, `Radius.lg`, `Shadow.xs`, `Space[4]` padding, `Space[3]` bottom margin.
- Row top: "Region N" label (`FontFamily.bodySemibold`, `FontSize.sm`, `C.text`) + severity badge (reuse `statusMeta` pattern from history.tsx — same colors).
- Row body: diagnosis label + `·` + score `%` on one line (`FontFamily.body`, `FontSize.sm`, `C.textSub`).
- Row footer: "Detector conf: XX.X%" (`FontFamily.body`, `FontSize.xs`, `C.muted`).

**Section header** above cards:
- `"N regions detected"` — `FontFamily.bodySemibold`, `FontSize.sm`, `C.primary`, `Space[3]` bottom margin.
- If `lesions.length === 0`: render single muted row `"No regions detected"` (`C.textHint`).

---

## 4. History — Sessions Segment (`app/(tabs)/history.tsx`)

### 4.1 Segment control
- Change `SegmentControl` values from status-only to `['Lesions', 'Sessions']` as a top-level mode switch.
- Existing status filter (`All | Stable | Check | Urgent`) remains — shown only when mode is `Lesions`.
- State variable: `historyMode: 'Lesions' | 'Sessions'` (default `'Lesions'`).

### 4.2 `useScanSessions` hook (`hooks/useScanSessions.ts`) — new file
```ts
type ScanSession = {
  _id: string;
  createdAt: string;
  lesionCount: number;
  lesions: Array<{
    lesion_id: string;
    severity?: string;
    diagnosis?: { label: string; score: number };
    bbox?: { x1: number; y1: number; x2: number; y2: number; conf: number };
  }>;
  imageUrl?: string;
}
```
- Calls `GET /scan-sessions` via `apiFetch` (existing `lib/api.ts`).
- Returns `{ sessions, loading, error, refresh }`.
- Fetched on screen focus via `useFocusEffect` (same pattern as lesions).

### 4.3 `SessionCard` sub-component (inline in `history.tsx`)
- Background: `LinearGradient` with `Gradient.floralBand` colors, `Radius.xl`, `Shadow.xs`.
- Layout: date string left (`FontFamily.bodySemibold`, `FontSize.sm`, `C.text`) + lesion-count badge right (`C.primaryLight` bg, `C.primary` text, `Radius.full`, `Badge.paddingH/V`).
- Thumbnail: single `ImageWithBboxOverlay` (or plain `Image` if no bbox data) at 64pt height, `Radius.sm`, clipped. `ScanSession` provides bbox *coordinates* not crop URLs — no individual crops. If `imageUrl` absent, placeholder `View` with `C.surfaceAlt` bg + `Feather 'image'` icon (`IconSize.xl`).
- Tap: opens `LesionRegionsModal`. Adapt it to accept either `{ item: Lesion }` (existing) or `{ lesions: ScanSession['lesions']; imageUrl?: string }` (session). Union the prop type — single modal, two call sites.

### 4.4 Sessions tab empty/loading states
- Loading: `ActivityIndicator` centered, `color={C.primary}`.
- Empty: existing `<EmptyState>` component with message `"No scan sessions yet"`.
- Error: inline error text `C.urgentText`, `FontSize.sm`.

---

## 5. Register Screen Token Alignment (`app/(auth)/register.tsx`)

### 5.1 Form card
- `backgroundColor: C.surface`, `borderWidth: 1`, `borderColor: C.border`, shadow `Shadow.xs` — match login.tsx card exactly.

### 5.2 Gender pills
- Selected: `backgroundColor: C.primaryLight`, `borderColor: C.borderFocus`, text `C.primary`, `FontFamily.bodySemibold`.
- Unselected: `backgroundColor: C.surfaceAlt`, `borderColor: C.border`, text `C.muted`, `FontFamily.body`.

### 5.3 Calendar widget
- Selected day cell: `backgroundColor: C.primary`, text `#fff`, `Radius.full`.
- Today (unselected): `borderWidth: 1`, `borderColor: C.borderSage`, `Radius.full`.
- Month nav arrows: `C.primary` color, `C.primaryLight` bg, `Radius.md`.
- Header row (day names): `FontFamily.bodyBold`, `FontSize.xs`, `C.muted`.
- Year picker list: selected year `C.primary` text + `C.primaryLight` bg row.

### 5.4 Error banner
- Matches login.tsx `errorBox`: `C.urgentBg` bg, `borderLeftWidth: 3`, `borderLeftColor: C.urgentText`.

### 5.5 Audit rule
- All remaining raw `#` hex strings in `register.tsx` → nearest `C.*` token. No functional changes.

---

## 6. Data Flow

```
camera.tsx
  └── analyzeImage() → AnalyzeImageResult { lesions[] }
        └── RegionCard list (inline, review phase)

history.tsx
  ├── useLesions()       → Lesions segment (existing)
  └── useScanSessions()  → Sessions segment (new hook)
        └── SessionCard → LesionRegionsModal (adapted)

profile.tsx
  └── LinearGradient (floralBand) → avatar hero (visual only, no data change)

register.tsx
  └── token alignment only (no logic change)
```

---

## 7. Files to Create

| File | Purpose |
|------|---------|
| `MyApp/hooks/useScanSessions.ts` | Fetch + cache scan sessions from `/scan-sessions` |

---

## 8. Files to Modify

| File | Changes |
|------|---------|
| `MyApp/constants/theme.ts` | Add `FloralBand` to `DECORATION_BUDGET` |
| `MyApp/app/(tabs)/profile.tsx` | `LinearGradient` hero strip, rose avatar ring, `Hairline` divider |
| `MyApp/app/(tabs)/camera.tsx` | Intro card, overlay tokens, `RegionCard` inline component |
| `MyApp/app/(tabs)/history.tsx` | `Lesions \| Sessions` segment, `useScanSessions`, `SessionCard`, adapted `LesionRegionsModal` |
| `MyApp/app/(auth)/register.tsx` | Token alignment: card, gender pills, calendar, error banner |

---

## 9. Out of Scope

- `camera.web.tsx` parity — deferred.
- Automated tests — deferred.
- Wiring `POST /scan-sessions` from camera (existing `/lesions/analyze` flow unchanged).
- Any backend changes.
