# XAI Skin Health — UX Enhancement Plan

*Senior UI/UX design brief — delightful, calm, clinically-trustworthy.*

The app is already structurally solid: rose palette, Daily Habits, Sun Protection, vital ring cards, Monitor section, Notifications inbox. This plan layers polish on top **without** redesigning IA. Everything here is additive, opt-in, and respects the "calm medical" tone — animations are subtle, never carnival.

---

## 1. Design Principles (guard-rails)

| Principle | Practical rule |
|---|---|
| **Calm over flashy** | No animation > 600ms. Ease-out for entrances, ease-in-out for loops. |
| **Purposeful motion** | Every animation teaches state: progress, success, warning. Never decorative-only except in *Delight Moments* (rare, earned). |
| **Skin over screen** | The body silhouette is the hero. Everything else supports it. |
| **One surprise per session** | Confetti fires at most once per streak milestone per day. Over-use kills magic. |
| **Accessibility first** | All animations respect `AccessibilityInfo.isReduceMotionEnabled()` and fall back to static states. |

---

## 2. Scope — Seven Work Streams

### Stream A — Micro-Interactions
Small button/input/chip reactions that make the app feel alive.

- **Chip press** (water/sleep `+250ml`, `+15m`): spring scale `1 → 0.94 → 1.02 → 1` (120ms), ring advances with animated `strokeDashoffset` instead of hard snap.
- **Quick-log Sun Protection**: button emits a soft radial glow once on tap, gauge fill slides left-to-right (not instant reset).
- **Status badge**: on status-change (Stable→Check), badge does a brief color-crossfade + 1 tiny pulse.
- **Toggle / checkbox**: check icon draws itself (SVG path animation) rather than popping.
- **Delete swipe** on lesion row: reveals delete action with spring; confirm with a subtle shake on cancel.

**Files to touch**
- `components/vitals/VitalRingCard.tsx` — wrap Circle's `strokeDashoffset` in `Animated.Value` / reanimated `withTiming`.
- `components/ui/AppButton.tsx` — add `pressed` scale using `Pressable` + `Animated.View`.
- `components/home/SunProtectionCard.tsx` — animate gauge fill width.

---

### Stream B — Reminder UI (subtle, not annoying)
Rethink how reminders *appear* so they invite action, not dread.

- **Inline pill under vitals** ("You're 0.5 L below today's goal") instead of a separate banner — appears only if >2 reminder hours have passed and goal unmet.
- **Soft breathing pulse** (2.2s loop, 3% scale, 10% opacity) on the reapply CTA *only* when overdue. Stops on first tap of the day.
- **Smart muting**: if user logged water in the last 20 min, suppress the next hydration reminder in-app (still schedules system).
- **One-tap snooze** in the notification row: long-press → "Remind in 1h" chip slides in from the right.
- **Notification rows** already have read/unread; add a gentle left-edge color bar (meta.color) instead of full-tinted background for unread.

**New file**: `components/home/GentleNudge.tsx` — the inline pill.

---

### Stream C — Body Silhouette (front/back with tappable regions)
The star feature. Currently lesions are a flat list — giving them a spatial home elevates the whole product.

- **New screen**: `/(tabs)/body` (or embed in Home). Two toggleable SVG silhouettes (front / back), simple line art in rose.
- **Regions**: head, face, neck, chest, abdomen, left/right upper arm, left/right forearm, left/right hand, back, left/right thigh, left/right calf, left/right foot. Each `<Path>` is a tappable hit region with `onPress`.
- **Dots**: each saved lesion renders as a colored dot (status color) at stored `{x, y, side: 'front'|'back'}`. Tapping a dot opens the lesion details sheet; tapping empty region opens "Add lesion here" flow.
- **Dot micro-animation**: on mount, dots fade-in staggered (50ms each); urgent dots get a slow ring-pulse.
- **Persist coordinates** on the lesion record — extend `Lesion` with optional `bodyPoint?: { x, y, side }`.

**New files**
- `components/body/BodyMap.tsx`
- `components/body/BodySilhouetteFront.tsx` (raw SVG)
- `components/body/BodySilhouetteBack.tsx`
- `components/body/LesionDot.tsx`

**Schema change**: add `bodyPoint` optional field to lesion create/update API + local type.

---

### Stream D — Smooth Transitions Between Screens
Replace default stack-slide feel with coherent motion grammar.

- **Home ↔ History**: shared-element transition on the lesion card thumbnail (reanimated `sharedTransitionTag`).
- **Camera → Result**: fade-through white (40ms white flash → result slides up), reinforces the "capture" metaphor.
- **Auth stack**: cross-fade (already `animationEnabled: false` — switch to `slide_from_right` with duration 220 and a subtle scale on the exiting screen).
- **Modal sheets**: use `presentationStyle: 'formSheet'` on iOS consistently; custom backdrop fade on Android.

**Files**
- `app/_layout.tsx`, `app/(auth)/_layout.tsx`, `app/(tabs)/_layout.tsx` — `screenOptions.animation`.
- `app/(tabs)/camera.tsx` — capture-flash overlay.

---

### Stream E — Skeleton Loaders (replace spinners)
Spinners communicate "wait". Skeletons communicate "here is what is arriving".

- **History list**: 3 shimmer rows (image block + 2 text bars) while `loading && lesions.length === 0`.
- **UV card**: shimmer gauge bars + numeric bar while loading.
- **Vital ring**: ring draws from 0 on first load (already there) + text bars shimmer for 200ms.
- **Notifications**: 4 shimmer rows on first open.

**New file**: `components/ui/Skeleton.tsx` — a reanimated shimmer block (gradient translate loop).

**Replace** every `<ActivityIndicator>` on primary content screens with Skeleton. Keep ActivityIndicator for inline button loading.

---

### Stream F — "Delight Moments" (WOW)

1. **Streak confetti** — when the Self-Exam streak hits 3/7/14/30 days, fire confetti (use `react-native-confetti-cannon` or a lightweight custom emoji rain of 🎉 + rose hearts) for ~1.8s. Fire at most once per milestone per day; persist `lastConfettiMilestone` in AsyncStorage.
2. **Scan-complete pulse** — when camera finishes and result appears, a slow 600ms rose-tinted pulse blooms outward from the image center (single wave, not looping). Signals "got it".
3. **Hydration goal reached** — ring briefly overshoots to 105% then settles to 100% with a ✨ sparkle burst on the ring.
4. **Sun protection logged** — smile icon briefly animates (simple bounce + tiny sparkle) when logApplication is called.
5. **Empty-state wink** — the `EmptyState` icon gently bobs every 4s (3px vertical) when visible, then stops after 3 cycles.

**New files**
- `components/fx/Confetti.tsx` (lightweight, no deps if feasible — emoji particles via reanimated).
- `components/fx/PulseRing.tsx` — reusable expanding ring.
- `components/fx/SparkleBurst.tsx` — 6 star particles spraying out.

**Guard**: all of the above check `useReduceMotion()` and degrade to a single static checkmark flash.

---

### Stream G — Tiny icon animations
Unobtrusive life in the UI chrome.

- **Bell icon** (PageHeader): when a new unread arrives while app open, icon does a single swing (±8°) — not continuous.
- **Droplet icon** (hydration card header): gentle drip every ~6s when below 50% target.
- **Moon icon**: slow 360° rotation once on card mount; static afterward.
- **Sun (UV card)**: rays rotate 4° over 8s loop if UVI > 3 (visual cue of "active sun").
- **Check-circle on "All caught up"** (notifications): draw-in path animation on first appearance.

**Technique**: all via reanimated `useSharedValue` + `withRepeat`/`withSequence`. Keep durations long and amplitudes small.

---

## 3. Implementation Order (what to build, in what order)

Phased so each shipment is a coherent UX upgrade.

### Phase 1 — Foundations (low risk, high impact)
1. `Skeleton.tsx` + replace spinners on History, UV, Notifications.
2. Reduce-motion hook: `hooks/useReduceMotion.ts`.
3. Micro-interaction baseline: wrap `AppButton` and chips with spring press.
4. Transition polish in `_layout.tsx` files.

### Phase 2 — Reminder & Delight
5. `GentleNudge.tsx` inline pill.
6. `PulseRing.tsx` + scan-complete pulse in camera result.
7. Animated ring fill in `VitalRingCard` (reanimated-driven `strokeDashoffset`).
8. Tiny icon animations (bell, droplet, moon, sun).

### Phase 3 — Body Silhouette (biggest feature)
9. Design SVG silhouettes (front/back) as component files.
10. `BodyMap.tsx` with region hit-tests.
11. Extend lesion type + API with `bodyPoint`.
12. `LesionDot.tsx` with stagger + urgent pulse.
13. New tab / home surface for BodyMap.

### Phase 4 — Big Delight
14. `Confetti.tsx` streak celebration.
15. `SparkleBurst.tsx` on goal-reached.
16. Sun protection logged bounce.

---

## 4. Tech choices

- **Animations**: `react-native-reanimated` (already in deps — SDK 54 supports it). Avoid new heavy deps.
- **Confetti**: try custom reanimated emoji particles first (~80 lines); only pull in a lib if we need physics.
- **SVG**: `react-native-svg` (already in deps for rings).
- **Persistence**: extend existing `AsyncStorage` keys — no schema migrations needed; new keys are optional.
- **Reduce motion**: `AccessibilityInfo.isReduceMotionEnabled()` + listener.

---

## 5. Done-looks-like

- Every tap on a counter chip feels springy.
- Loading states never show a bare spinner on the main screens.
- Opening History from Home feels like the card expands, not a new page.
- First hydration goal of the day triggers sparkles + haptic.
- 7-day streak fires confetti exactly once.
- Body silhouette shows every recorded lesion in its anatomical position.
- Reduce-motion users get identical information, zero animation.

---

## 6. Out of scope (intentionally)

- Redesigning the color system — palette stays.
- Replacing navigation library.
- Backend schema overhaul — only the optional `bodyPoint` field is added.
- Gamification beyond the 3/7/14/30 streak milestones.
