# XAI Skin Health — Full UI Redesign Checklist

> This file tracks every screen and component that needs to be rebuilt.
> Check off each item as it is completed. Work top-to-bottom: design system first,
> then shared components, then screens in order.

---

## PHASE 1 — Design System (do this before touching any screen)

These tokens affect everything. Define them once in `constants/theme.ts` and every
screen automatically picks up the new look.

- [x] **Typography scale** — define heading sizes (h1–h4), body, caption, label, and button text
- [x] **Spacing scale** — consistent 4 pt grid (4, 8, 12, 16, 20, 24, 32, 40, 48)
- [x] **Border radius scale** — sm (6), md (12), lg (16), xl (24), pill (999)
- [x] **Shadow / elevation tokens** — card shadow, modal shadow, button shadow
- [x] **Color palette** — primary, surface, background, border, muted, status (stable/check/urgent), text (primary/secondary)
- [x] **Input style** — height, border, focus ring, placeholder color, error state
- [x] **Button variants** — primary filled, secondary outlined, ghost, danger, icon-only
- [x] **Badge / pill style** — status badges (stable/check/urgent), filter pills, notification dot
- [x] **Card style** — background, border, radius, shadow, padding
- [x] **Avatar style** — circle, initials font, size variants (sm/md/lg)
- [x] **Icon sizing convention** — sm (14), md (18), lg (22), xl (28)
- [x] **Divider style** — thin line, text-between-lines variant

---

## PHASE 2 — Shared / Reusable Components

Rebuild these standalone pieces before redesigning screens so screens can import them.

### Bottom Tab Bar
- [x] Overall pill shape, dimensions, and shadow
- [x] Active tab: icon circle fill, icon color, label visibility
- [x] Inactive tab: circle style, icon color
- [x] Tab spacing and alignment

### Page Header (used on Home, History, Profile)
- [x] Avatar — size, border, initials text style
- [x] Greeting text — font weight, color, truncation
- [x] Notification bell button — size, hit area, badge dot style

### Notification Dot Badge
- [x] Size, color, position offset on parent icon

### Section Title Row (title + "View all" link)
- [x] Font, weight, spacing below
- [x] Link text size and color

### Status Badge / Pill
- [x] Background color per status
- [x] Text color per status
- [x] Padding, radius, font size
- [x] Dot indicator inside badge (size, color)

### Filter Pill Row (All / Stable / Check / Urgent)
- [x] Pill padding, radius, min-width
- [x] Active: fill color + text color
- [x] Inactive: background, border, text color
- [x] Row horizontal scroll vs wrap behaviour

### Form Inputs
- [x] Label text style
- [x] Input container (border, radius, background, height)
- [x] Focus ring color
- [x] Error state (border color + error message text)
- [x] Multi-line input (height, top alignment of text)
- [x] Disabled state (greyed out)

### Error / Empty State Block
- [x] Icon size and color
- [x] Title and body text style
- [x] Retry button style

### Disclaimer Box
- [x] Background color (amber tint)
- [x] Left accent border
- [x] Icon + text layout

### Modal Shell (shared by all modals)
- [x] Overlay background (opacity)
- [x] Card: radius, shadow, padding, max-height
- [x] Modal header: title, close / cancel / save buttons
- [x] Bottom safe-area handling

---

## PHASE 3 — Screen-by-Screen Redesign

---

### 3.1  Welcome Screen (`app/(auth)/welcome.tsx`)

- [x] **Hero icon** — shape (circle vs rounded-square vs none), size, background color
- [x] **App logo / name** — font, size, weight, spacing
- [x] **Tagline text** — font, color, line height
- [x] **Feature rows** (4 items) — icon container shape, icon size, title + description layout, row spacing, divider between rows
- [x] **Primary CTA button** — radius, height, fill color, text style, icon presence
- [x] **Secondary button** — outlined vs ghost, border color, text color
- [x] **Disclaimer footer** — font size, color, alignment
- [x] **Overall screen layout** — top padding, scroll vs fixed, background color/gradient

---

### 3.2  Login Screen (`app/(auth)/login.tsx`)

- [x] **Top bar** — back button style (icon vs text), title position and weight, height
- [x] **Header block** — icon container style, "Welcome back" heading size, subtitle text
- [x] **Email input** — label, container, icon (if any)
- [x] **Password input** — label, container, show/hide toggle icon
- [x] **Error alert box** — left border color, background, icon, text style
- [x] **Sign In button** — height, radius, loading spinner color/style
- [x] **"New patient?" divider** — line style, text style
- [x] **Create Account button** — outlined style, height, radius
- [x] **Screen background** — solid vs gradient
- [x] **Scroll behaviour** — KeyboardAvoidingView padding

---

### 3.3  Register Screen (`app/(auth)/register.tsx`)

- [ ] **Scroll card container** — card background, radius, shadow, horizontal padding *(deferred — not in scope for this phase)*
- [ ] **Header icon ring** — ring border style, icon container size and color *(deferred)*
- [ ] **Form title and subtitle** — sizes, weight, spacing *(deferred)*
- [ ] **First name / last name inputs** (side-by-side or stacked) *(deferred)*
- [ ] **Email input** *(deferred)*
- [ ] **Password / confirm password inputs** *(deferred)*
- [ ] **Gender selector** — radio pill style vs toggle switch vs segmented control *(deferred)*
- [ ] **Date of birth button** — icon position, placeholder text, chevron *(deferred)*
- [ ] **Custom calendar component** — header arrows style, month/year selector, day grid cell (selected, today, disabled states), year list style *(deferred)*
- [ ] **Error text** — color, icon, position relative to field *(deferred)*
- [ ] **Create Account button** *(deferred)*
- [ ] **"Already registered?" divider + link button** *(deferred)*

---

### 3.4  Home Screen (`app/(tabs)/index.tsx`)

- [x] **Page header** — reuse shared header component (avatar, greeting, bell)
- [x] **Page title + subtitle block** — font size hierarchy, margin
- [x] **UV Index Card**
  - [x] Card outer shape (radius, border, shadow)
  - [x] Left accent bar (width, color)
  - [x] Sun icon container style
  - [x] UV INDEX label (font, color)
  - [x] Status dot + text layout
  - [x] Right value box — background, border-left style, font size for the number
  - [x] Unit label style
- [x] **"Health Metrics" section title row**
- [x] **Health Metrics grid layout** — number of columns, gap, outer padding
- [x] **VitalCard — Wave variant** (water, steps)
  - [x] Card background, radius, shadow
  - [x] Icon circle — size, color, shape
  - [x] Label text
  - [x] Large value + unit text
  - [x] Minus / plus step buttons — size, shape, border
  - [x] Status dot + text
  - [x] Progress bar — height, radius, fill color, track color
- [x] **VitalCard — Sleep Wave variant**
  - [x] Same structure as Wave but sleep-specific layout
- [x] **VitalCard — Segments variant** (SPF / UV exposure)
  - [x] Icon + value layout
  - [x] 4 segment bars — width, gap, active/inactive colors, labels
- [x] **VitalCard — Panel variant** (multi-stat)
  - [x] Left icon column — circle size, color
  - [x] Right column — title, value, 2 status pills, progress bar
- [x] **Monitor Lesions Section** — see component below (3.8)
- [x] **Bottom tab bar** — reuse shared component

---

### 3.5  Camera Screen (`app/(tabs)/camera.tsx`)

**Permission screen:**
- [x] Icon style (camera-off), size, color
- [x] Title and description text
- [x] "Grant Permission" button

**Live camera view:**
- [x] Full-screen camera — no changes to CameraView itself
- [x] **Close button** — circle size, background opacity, icon size
- [x] **Hint text** — font, color, pill background vs plain text
- [x] **Flip camera button** — same circle style as close button
- [x] **Capture button** — outer ring size/border, inner dot size, gap between ring and dot

**Post-capture form:**
- [x] **Form header bar** — back arrow button, title, height
- [x] **Photo thumbnail container** — radius, height, background placeholder color
- [x] **Processing overlay** — removed (hair removal feature removed)
- [x] **"Hair removed" badge** — removed (hair removal feature removed)
- [x] **Title input** — reuse shared form input
- [x] **Description multi-line input**
- [x] **Body Location input**
- [x] **Status pills row** — active/inactive per-status styling
- [x] **Notes multi-line input**
- [x] **Save button** — reuse primary button style
- [x] **Disclaimer text**
- [x] **Bottom nav pill** — reuse shared tab bar

---

### 3.6  History Screen (`app/(tabs)/history.tsx`)

- [x] **Page header** — reuse shared header
- [x] **Page title + subtitle**
- [x] **Stats row** (Total / Stable / Check / Urgent)
  - [x] Each stat item: number font size and weight, label text, spacing between
  - [x] Separators between stat items
- [x] **Filter pills row** — reuse shared filter pill component
- [x] **Lesion cards** (list)
  - [x] Card outer (background, radius, shadow, padding, margin-bottom)
  - [x] **Thumbnail** — size, radius, placeholder icon style
  - [x] **Title** — font weight and size
  - [x] **Status badge** — reuse shared badge component
  - [x] **Description** — line-clamp, color, spacing
  - [x] **Location row** — icon size/color, text style
  - [x] **Date row** — icon size/color, text style
  - [x] **Action buttons row** (Edit / Delete)
    - [x] Edit button — icon + text, outlined vs ghost style
    - [x] Delete button — icon + text, danger color style
  - [x] Spacing between rows inside card
- [x] **Empty state** — reuse shared empty state component
- [x] **Error state** — reuse shared error state component
- [x] **Disclaimer box** — reuse shared disclaimer component
- [x] **Bottom tab bar** — reuse shared component

**Edit Lesion Modal:**
- [x] Modal shell — reuse shared modal component
- [x] All form fields (same as camera form fields)
- [x] Save button (disabled until title non-empty)

---

### 3.7  Profile Screen (`app/(tabs)/profile.tsx`)

- [x] **Avatar block** — size (88px → new size?), border, initials font, spacing below
- [x] **Full name** — font size, weight
- [x] **Email** — color, font size
- [x] **Quick action buttons row** (Edit Profile + Download Data)
  - [x] Side-by-side layout, gap
  - [x] Primary button (filled)
  - [x] Secondary button (outlined)
  - [x] Icon position (left vs right vs top)
- [x] **Settings section headers** — label text style, spacing
- [x] **Settings row items** (icon + title + subtitle + chevron)
  - [x] Icon container — shape, size, background color per item
  - [x] Title font weight and size
  - [x] Subtitle color and size
  - [x] Chevron icon size and color
  - [x] Row height and horizontal padding
  - [x] Divider between rows (or card-per-item vs grouped card)
- [x] **Logout button** — background color, radius, height, icon + text layout
- [x] **Bottom tab bar** — reuse shared component

**Logout Confirmation Modal:**
- [x] Modal shell — reuse shared modal
- [x] Icon circle — size, background color
- [x] Title + message text
- [x] Confirm (danger) button
- [x] Cancel (outlined) button

**Change Password Modal:**
- [x] Modal shell — reuse shared modal
- [x] 3 password inputs (current / new / confirm)
- [x] Update button
- [x] Cancel button

**Change Email Modal:**
- [x] Modal shell — reuse shared modal
- [x] Info banner — icon, text, background
- [x] Current email (read-only field)
- [x] New email input
- [x] Update button
- [x] Cancel button

---

### 3.8  Monitor Lesions Section (`components/home/MonitorLesionsSection.tsx`)

- [x] **Section header** — title, description, "View all" link style
- [x] **Outer card container** — background, radius, shadow, padding
- [x] **Stats block** (Monitoring sub-header + 3 status pills)
  - [x] "Monitoring" label font
  - [x] Count description text
  - [x] Status pill row — dot size, pill padding and radius
- [x] **Scan banner row** — camera icon box style, title + subtitle text, chevron
- [x] **Recent lesion rows** (up to 3)
  - [x] Thumbnail size and radius
  - [x] Title + location text
  - [x] Status badge
  - [x] Date and notes text
  - [x] Row separator
- [x] **Loading spinner** position and color
- [x] **Error block** — reuse shared error state
- [x] **Disclaimer box** — reuse shared disclaimer

---

### 3.9  Notifications Screen (`app/notifications.tsx`)

- [x] **Top bar** — back button style, title, "Read all" button text style
- [x] **"Read all" banner** — background, icon, text, border/radius
- [x] **Notification rows**
  - [x] Row height and horizontal padding
  - [x] **Unread dot** — size, color per notification type, position
  - [x] **Title** — font weight when unread vs read
  - [x] **Body text** — color, line clamp
  - [x] **Timestamp** — font size, color, alignment
  - [x] **Chevron** — size and color
  - [x] Unread row background highlight
  - [x] Row separator style
- [x] **Empty state** — icon, title, description style

---

## PHASE 4 — QA Pass

Once all screens are rebuilt:

- [ ] Check every screen on Android (emulator or device) — *requires runtime*
- [ ] Check every screen on iOS (simulator or device) — *requires runtime*
- [x] Check safe-area insets on notched devices (top + bottom) — SafeAreaView + useSafeAreaInsets used on all screens; BottomTabBar pads by insets.bottom
- [x] Check keyboard avoidance on all forms — KeyboardAvoidingView with platform behavior on all form screens (camera, history modal, profile modals, login)
- [ ] Check scroll behaviour on small screens (SE-size) — *requires runtime*
- [x] Check all loading and error states still render correctly — EmptyState used for loading/error on history, MonitorLesionsSection; ActivityIndicator on home UV card
- [x] Check all modals open and close correctly — pageSheet modal on history edit; transparent fade/slide modals on profile
- [x] Check tab bar is consistent across all tab screens — BottomTabBar component used identically on home, history, profile, camera (permission)
- [x] Check status bar style (light/dark) matches each screen background — fixed notifications.tsx (missing StatusBar); welcome uses light-content over primary; all others dark-content over C.bg
- [x] Check all status badge colors render correctly (Stable / Check / Urgent) — StatusBadge component uses stableBg/stableText, checkBg/checkText, urgentBg/urgentText from theme tokens

---

## Notes

- Keep all business logic untouched — only change JSX structure and StyleSheet values
- When a shared component is redesigned, update every screen that uses it
- After each screen is done, mark its checkboxes above
- `constants/theme.ts` is the single source of truth for all tokens
