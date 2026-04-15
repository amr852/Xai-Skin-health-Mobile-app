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

### Stream C — (removed) Body Silhouette
Dropped. Caused instability on device and the flat lesion list is sufficient for now.

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

### Stream F — "Delight Moments" (scoped down)

Heavy particle effects (confetti, sparkle burst, pulse ring) were removed after causing render instability on real devices. Remaining delight is kept in-element and cheap:

1. **Capture flash** — short white-overlay flash on shutter press (implemented in `camera.tsx` with a single reanimated shared value).
2. **Sun-protection icon bounce** — small scale pulse on the sunscreen icon when `logApplication` fires (implemented in `SunProtectionCard.tsx`, guarded by `useReduceMotion`).
3. **Empty-state wink** — optional future addition if needed.

**Guard**: all motion checks `useReduceMotion()` and degrades to a static state.

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

### Phase 2 — Reminder & small delight
5. `GentleNudge.tsx` inline pill.
6. Capture flash in camera result.
7. Animated ring fill in `VitalRingCard` (RN `Animated` + SVG `strokeDashoffset`).
8. Sun-icon rotation on UV card when UVI > 3.
9. Sun-protection icon bounce on log.

---

## 4. Tech choices

- **Animations**: `react-native-reanimated` (already in deps — SDK 54 supports it). Avoid new heavy deps. Do **not** mix `react-native` `Animated` and `react-native-reanimated` `Animated` on the same view tree — pick one per component.
- **SVG**: `react-native-svg` (already in deps for rings).
- **Persistence**: extend existing `AsyncStorage` keys — no schema migrations needed; new keys are optional.
- **Reduce motion**: `AccessibilityInfo.isReduceMotionEnabled()` + listener.

---

## 5. Done-looks-like

- Every tap on a counter chip feels springy.
- Loading states never show a bare spinner on the main screens.
- Opening History from Home feels like the card expands, not a new page.
- Reduce-motion users get identical information, zero animation.

---

## 6. Out of scope (intentionally)

- Redesigning the color system — palette stays.
- Replacing navigation library.
- Backend schema overhaul — only the optional `bodyPoint` field is added.
- Gamification beyond the 3/7/14/30 streak milestones.
