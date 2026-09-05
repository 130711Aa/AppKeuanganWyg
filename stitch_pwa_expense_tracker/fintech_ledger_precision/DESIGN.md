---
name: Fintech Ledger Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#855300'
  on-tertiary: '#ffffff'
  tertiary-container: '#e29100'
  on-tertiary-container: '#523200'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  mono-currency-lg:
    fontFamily: JetBrains Mono
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  mono-currency-md:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit-1: 0.25rem
  unit-2: 0.5rem
  unit-3: 0.75rem
  unit-4: 1rem
  unit-5: 1.25rem
  unit-6: 1.5rem
  unit-8: 2rem
  unit-10: 2.5rem
  unit-12: 3rem
  mobile-margin: 1rem
  mobile-gutter: 0.75rem
  desktop-max-w: 480px
---

## Brand & Style
The design system embodies crisp fintech minimalism engineered specifically for modern mobile-first progressive web apps. It communicates immediate fiscal clarity, discipline, and calm mastery over personal finances. The aesthetic prioritizes rapid data assimilation, high-contrast visual signifiers, and ergonomic tactile interactions calibrated for single-thumb execution. 

Key principles:
- **Zero Ambiguity:** Financial telemetry, balances, and transaction thresholds are communicated with absolute visual hierarchy and zero decorative noise.
- **Physical Ergonomics:** Interactive controls adhere to native mobile conventions with minimum 44px hit-boxes, thumb-zone placement, and distinct haptic/visual states.
- **Controlled Density:** Ample breathing room paired with dense, structured tabular feeds so users can review ledgers effortlessly without cognitive fatigue.

## Colors
The palette balances institutional slate anchors with vibrant status indicators to deliver instantaneous cash flow recognition:

- **Primary (`#10B981`, Deep Emerald `#059669`):** Represents positive cashflow, income events, savings targets, and confirmed actions. Used strategically for positive value affirmations and primary floating triggers.
- **Secondary (`#0F172A` Slate Dark):** Serves as high-contrast display text, active bottom navigation nodes, primary button backgrounds, and deep structural surfaces.
- **Warning & Danger Accents:** 
  - Warning (`#F59E0B` Amber): Triggers automatically at 80% category or monthly budget consumption.
  - Danger (`#EF4444` Crimson): Applied when a budget ceiling reaches 100%+ or for negative transaction values and destructive actions.
- **Surfaces & Neutral Spectrum:** 
  - Base Canvas: `#F8FAFC` (Slate 50)
  - Card & Container Surface: `#FFFFFF` with secondary canvas fills at `#F1F5F9` (Slate 100)
  - Subtle Dividing Borders: `#E2E8F0` (Slate 200)
  - Secondary/Supporting Copy: `#64748B` (Slate 500)
  - Body & Heading Copy: `#0F172A` (Slate 900)

## Typography
The typography system pairs **Inter** for all communicative UI copy and qualitative context with **JetBrains Mono** for numerical values, financial balances, and currency figures. 

Rules of application:
- Numeric metrics (amounts, balances, account tallies) must always render in tabular figures (`font-variant-numeric: tabular-nums`) or `JetBrains Mono` to prevent horizontal jitter during real-time updates and ledger scans.
- `label-caps` is always set in uppercase to denote meta-labels (e.g., "CURRENT BILLING CYCLE", "UNCATEGORIZED").
- On small viewport mobile breakpoints (<380px), switch primary net worth readouts from `display-hero` down to `display-hero-mobile` to avoid line-wrapping large currency notations.

## Layout & Spacing
The application leverages a strict **fluid-constrained grid** tailored for progressive web app paradigms:

- **Mobile Viewports (<640px):** Single-column stack governed by `mobile-margin` (16px) dynamic edge insets. Interactive controls adhere to a 4px baseline rhythm. Bottom safe-area spacing (`env(safe-area-inset-bottom)`) is strictly enforced beneath navigation arrays.
- **Desktop/Tablet Breakpoints (≥640px):** Because this is a mobile-first expense utility, desktop views render as a centered, high-performance viewport shell pinned to `desktop-max-w` (480px), presenting a clean mobile frame with ambient backing or an expandable dual-column master-detail layout.
- **Touch Targets:** Any interactable surface (buttons, quick-tag chips, pagination nodes, list items) requires an explicit minimum physical touch dimension of 44x44px, using padded transparent hitboxes when visual footprints are smaller.

## Elevation & Depth
Elevation is articulated through **ambient-tinted micro-shadows** and **crisp slate hairline borders**, bypassing muddy drop-shadows in favor of lightweight, clean performance:

- **Surface Level 0 (Base Canvas):** `#F8FAFC`. Completely flat; non-elevated backdrop.
- **Surface Level 1 (Cards, Ledger Items):** `#FFFFFF` fill bounded by a 1px solid `#F1F5F9` or `#E2E8F0` hairline border, accompanied by a subtle tinted shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Surface Level 2 (Floating Action Buttons, Active Filters):** `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)`.
- **Surface Level 3 (Bottom Sheets, Modals, Fixed Nav):** Pure `#FFFFFF` with glassmorphic top-edge border (`border-t border-slate-200/80`) paired with an ambient backdrop blur (`backdrop-filter: blur(16px); background: rgba(255, 255, 255, 0.92)`). Shadow: `0 -10px 25px -5px rgba(15, 23, 42, 0.06)`.

## Shapes
The design uses generous, organic radii (`roundedness: 2`) to make financial tracking feel approachable while maintaining mathematical precision:

- **Main Dashboard Cards:** Master cards, spending summaries, and metric containers utilize `rounded-2xl` (1rem / 16px).
- **Interactive Buttons & Form Fields:** Standardized on `rounded-xl` (0.75rem / 12px) for a natural, thumb-friendly physical form.
- **Status Tags & Category Badges:** Configured as `rounded-full` (capsule format) to contrast against structural card geometry.
- **Segmented Control & Bottom Nav Shell:** Contoured with `rounded-2xl` for floating docks or `rounded-t-2xl` when docked to the mobile screen footer.

## Components

### Buttons
- **Primary:** Background `#0F172A`, foreground `#FFFFFF`, height 48px, `rounded-xl`. Active state triggers a subtle scale compression (`scale-[0.98]`).
- **Primary Success (Add Income / Affirmative):** Background `#10B981`, foreground `#FFFFFF`, hover `#059669`.
- **Secondary / Ghost:** Background `#F1F5F9`, foreground `#0F172A`, height 48px, `rounded-xl`. Border: 1px solid `#E2E8F0`.

### Cards & Ledger Containers
- **Metric Cards:** `#FFFFFF` background, `rounded-2xl` radius, padded at `1.25rem`. Must contain explicit typographic grouping: small uppercase category title, hero balance in JetBrains Mono, and a comparative delta badge below.
- **Category Progress Cards:** Includes a built-in progress track (`bg-slate-100`, height 6px, `rounded-full`). Track fills with `#10B981` (<80%), `#F59E0B` (80%–99%), or `#EF4444` (≥100%).

### List Items (Transactions)
- Height minimum: 60px.
- Left-aligned icon wrapper: 40x40px container, `rounded-xl`, tinted background corresponding to category color.
- Middle column: Primary merchant/label (`headline-sm`), subtext timestamp/category (`body-sm` in `#64748B`).
- Right-aligned amount: Mono currency label with dynamic tint (`#10B981` with `+` for deposits; `#0F172A` with `−` for normal debits; `#EF4444` when exceeding budget caps).

### Form Inputs & Currency Entry
- **Standard Input:** Height 48px, `rounded-xl`, background `#FFFFFF`, border 1.5px solid `#E2E8F0`. Focus state: border `#0F172A`, subtle outline ring `rgba(15, 23, 42, 0.05)`.
- **Hero Money Entry:** Frameless input, font size 40px JetBrains Mono, centered text alignment with prefix currency symbol permanently anchored.

### Chips & Filter Pills
- Capsule height 36px, horizontal padding `1rem`, `rounded-full`.
- Default: Background `#F1F5F9`, text `#64748B`.
- Selected: Background `#0F172A`, text `#FFFFFF`, font weight 600.

### Bottom Navigation Bar
- Fixed bottom dock with height 64px + safe-area padding. Translucent frosted surface (`rgba(255, 255, 255, 0.90)` with `backdrop-blur-md`).
- 4 primary navigation slots with 48x48px touch bounding boxes.
- Center or auxiliary floating quick-action button (FAB) for "Add Transaction": 52x52px, `rounded-full`, background `#10B981`, `#FFFFFF` iconography, elevated with emerald ambient glow.