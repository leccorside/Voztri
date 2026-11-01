---
name: Urban Mobility Kinetic System
colors:
  surface: '#fbf8ff'
  surface-dim: '#d4d8f7'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f2ff'
  surface-container: '#ececff'
  surface-container-high: '#e5e7ff'
  surface-container-highest: '#dde1ff'
  on-surface: '#151a31'
  on-surface-variant: '#494457'
  inverse-surface: '#2a2f47'
  inverse-on-surface: '#f0efff'
  outline: '#7b7489'
  outline-variant: '#cbc3da'
  surface-tint: '#6e1aff'
  primary: '#4f00c3'
  on-primary: '#ffffff'
  primary-container: '#6a00ff'
  on-primary-container: '#dacaff'
  inverse-primary: '#cfbdff'
  secondary: '#7b22de'
  on-secondary: '#ffffff'
  secondary-container: '#9546f9'
  on-secondary-container: '#fffbff'
  tertiary: '#4b377a'
  on-tertiary: '#ffffff'
  tertiary-container: '#634f94'
  on-tertiary-container: '#dbcbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#cfbdff'
  on-primary-fixed: '#22005d'
  on-primary-fixed-variant: '#5300cc'
  secondary-fixed: '#eddcff'
  secondary-fixed-dim: '#d8b9ff'
  on-secondary-fixed: '#290055'
  on-secondary-fixed-variant: '#6200bc'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#220950'
  on-tertiary-fixed-variant: '#4f3b7e'
  background: '#fbf8ff'
  on-background: '#151a31'
  surface-variant: '#dde1ff'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-xl:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Montserrat
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0em
  body-lg:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-lg:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.03em
  label-md:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-xs:
    fontFamily: Montserrat
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system defines an agile, premium, mobile-first experience for smart urban mobility. It unites technological precision, rapid intuitive navigation, and effortless urban commute confidence.

### Brand Personality & Emotional Core
- **Technological & Intuitive:** Seamless interaction models that anticipate commuter needs with fluid transitions and minimal cognitive load.
- **Dynamic & Kinetic:** Fluid purple gradients and vibrant electric accents evoke continuous momentum and velocity through urban landscapes.
- **Trustworthy & Premium:** Clean structural hierarchy, high-contrast dark accents, and refined atmospheric elevations establish stability and security during urban journeys.

### Aesthetic Movement & Visual Language
The design style balances **High-Tech Modernism** with subtle **Tactile Glassmorphism** layered directly over customized geospatial cartography. Rather than flat corporate layouts, the UI utilizes floating cards, soft atmospheric backdrops, rounded containers (16px to 24px), and purposeful neon purple pathing vectors to differentiate itself as an advanced urban transit suite.

## Colors

The color palette centers around electric violet hues anchored by deep midnight navy, optimized for mobile ride-hailing interactions and active navigation.

### Palette Architecture
- **Primary (`#6A00FF` - Roxo Principal):** Core brand driver, active interaction states, dominant CTAs, and active category highlights.
- **Secondary (`#9B4DFF` - Roxo Claro):** Motion gradients, active focus rings, secondary indicators, and map route termination points.
- **Tertiary (`#C9B2FF` - Lavanda):** Subtle pill backgrounds, interactive vehicle category badges, selected borders, and muted highlight chips.
- **Neutral Dark (`#0B1026` - Azul Escuro):** Primary text color, high-emphasis icons, bottom sheets in dark mode, and base for the night map layer.
- **Neutral Light (`#F4F6FA` - Cinza Claro):** Canvas surfaces, input field fills, inactive toggle capsules, and day mode sheet foundations.
- **Surface Pure (`#FFFFFF`):** Floating card surfaces, bottom sheet elevations, modal backdrops, and active toggle markers.

### Map & Route Gradient Tokens
Map paths and key action transitions utilize an explicit linear gradient:
- **Transit Active Gradient:** `linear-gradient(135deg, #6A00FF 0%, #9B4DFF 100%)`
- **Route Ambient Glow:** `rgba(106, 0, 255, 0.35)`
- **Map Base - Dark:** `#0B1026` with water/block geometry at `#121938`
- **Map Base - Light:** `#F4F6FA` with clean street grid strokes in `#E5E9F2`

## Typography

The type system relies exclusively on **Montserrat**, providing a bold, geometric, and contemporary stance that guarantees quick legibility during motion and one-handed mobile navigation.

### Hierarchy & Scale Rules
- **Display & Large Headlines:** Used for quick promotional hooks, onboarding splashes, and trip arrival announcements. Characterized by heavy weights (700 to 800) and slight negative tracking (`-0.02em` to `-0.03em`) for high impact.
- **Headlines & Titles (20px - 26px):** Primary mobile vehicle category titles, destination address inputs, and driver/vehicle name tags.
- **Body Text:** Neutral `#0B1026` at 14px to 16px with neutral tracking for optimal readability across quick-glance contextual trip logs.
- **Labels & Microcopy:** Used for ride status pills, ETA indicators, and vehicle plate badges. Bold weights (600 to 700) ensure instant recognition even at tiny scales (10px - 12px).

## Layout & Spacing

A strict 8-point rhythmic grid with a 4-point sub-grid governs all layout measurements, optimized for floating surfaces above interactive map canvasses.

### Form Factor Behavior
- **Mobile Handheld (0 - 599px):**
  - Full-bleed interactive map underlying persistent floating interface elements.
  - Lateral page margins: `16px` (`margin`).
  - Dynamic bottom sheets clamp between `25vh` (collapsed overview), `50vh` (ride tier selection), and `90vh` (expanded trip details/destinations).
  - Floating action buttons and navigation docks sit decoupled from bottom screen borders with an `8px` to `16px` inset from the home indicator.
- **Tablet & Dashboard Formats (600px - 1023px):**
  - Margins expand to `24px`.
  - Sheet transitions into a left-aligned floating card dock (`380px` fixed width) leaving the map surface fully actionable on the right.
- **Desktop & Fleet Admin (1024px+):**
  - 12-column layout with `24px` gutters and `32px` margins. Side navigation bar docked at `280px`.

## Elevation & Depth

Visual depth is produced using tactile, multi-stop ambient shadows layered over maps, avoiding harsh borders to preserve an airy, floating feel.

### Elevation Hierarchy
- **Level 0 (Canvas Base):** Vector map layers (clean light or dark navy palette). Zero shadow.
- **Level 1 (Inline Elements & Controls):** Unselected ride category cards, search input fields, and pill chips.
  - Shadow: `0px 2px 8px rgba(11, 16, 38, 0.04)`
  - Border: `1px solid rgba(11, 16, 38, 0.06)`
- **Level 2 (Active Cards & Floating Menus):** Selected vehicle category, address suggestions dropdown, and driver ETA badges.
  - Shadow: `0px 8px 24px rgba(106, 0, 255, 0.12), 0px 2px 6px rgba(11, 16, 38, 0.04)`
  - Border: `1.5px solid #6A00FF`
- **Level 3 (Floating Bottom Sheets & Floating Nav Bars):** Detached bottom sheets, persistent navigation capsules.
  - Shadow: `0px 16px 40px rgba(11, 16, 38, 0.14), 0px 4px 12px rgba(106, 0, 255, 0.08)`
  - Surface: `#FFFFFF` or `rgba(255, 255, 255, 0.95)` with `16px` backdrop-filter blur.
- **Level 4 (Modals & Confirmation Panels):** Fare confirmation dialogs, payment selectors, emergency triggers.
  - Shadow: `0px 24px 48px rgba(11, 16, 38, 0.22)`
  - Scrim: `rgba(11, 16, 38, 0.65)` with `8px` backdrop blur.

## Shapes

The design system enforces a smooth, aerodynamic curvature across all containers, adhering strictly to a `16px` to `24px` radius language for mobile touch targets and sheets.

### Corner Radii Guidelines
- **Small Controls & Chips (`rounded` / `8px` - `12px`):** Status pills, mini vehicle type markers, badge tags, and mini icon containers.
- **Interactive Component Containers (`rounded-lg` / `16px`):** Ride category selector cards, search fields, floating route buttons, and driver identification cards.
- **Major Surfaces & Sheets (`rounded-xl` / `24px`):** Top corners of sliding bottom sheets, fare confirmation dialogs, floating navigation bars, and map preview overlays.
- **Action Caps / Floating Pills (`rounded-full` / `9999px`):** Primary action call-to-actions, category filters, and quick counter buttons.

## Components

### Buttons & CTAs
- **Primary Action Button:** Height `56px`. Full-width inside bottom sheets. Background gradient `linear-gradient(135deg, #6A00FF 0%, #9B4DFF 100%)`. Border radius `20px` or full pill. Text Montserrat 16px SemiBold `#FFFFFF`. Shadow: `0 8px 20px rgba(106, 0, 255, 0.35)`. Hover/Press creates scale down `0.98` with deepened purple glow.
- **Secondary / Ghost Button:** Height `48px`. Background `#F4F6FA` or transparent with `1.5px` border in `#C9B2FF`. Text `#6A00FF`.
- **Floating Icon Action Buttons (FAB):** `52px × 52px` circular surface, `#FFFFFF`, holding purple navigation icons with Level 2 elevation for location centering and route toggles.

### Ride Category Cards
- **Dimensions:** Horizontal listing cards (`88px` height) or multi-column grid (`110px × 100px`).
- **Inactive State:** Background `#FFFFFF`, border `1px solid #F4F6FA`, subtle icon tint in `#0B1026`, body text in `#0B1026`, ETA info in muted gray (`#6E768E`).
- **Active / Selected State:** Background `linear-gradient(180deg, #FFFFFF 0%, #F8F5FF 100%)`, border `2px solid #6A00FF`, price label highlighted with `#6A00FF`, subtle inner badge showing vehicle category with `#C9B2FF` background fill.

### Floating Bottom Sheets
- **Structure:** Detached or docked mobile surface with `24px` top border radius.
- **Grabber Indicator:** Pill handle centered at top: `40px × 4px`, color `rgba(11, 16, 38, 0.15)`.
- **Internal Spacing:** `24px` padding on sides, vertical cadence of `16px` between input fields, category lists, and final confirmation action.

### Status Badges & Chips
- **Active Ride Pill:** Background `#C9B2FF` at `20%` opacity, text `#6A00FF`, dot indicator with `#6A00FF` pulsing animation.
- **Arrival / ETA Badge:** High contrast dark capsule (`#0B1026`), text `#FFFFFF` with estimated arrival time in bold Montserrat.

### Input Fields & Search Bars
- **Ride Destination Input:** Height `54px`, corner radius `16px`, background `#F4F6FA`, border `1px solid transparent`.
- **Focus State:** Background `#FFFFFF`, border `1.5px solid #6A00FF`, shadow `0 4px 14px rgba(106, 0, 255, 0.10)`. Prefix indicator features custom purple waypoint dot (`#6A00FF`) or start pin icon.

### Floating Bottom Navigation Bar
- **Form:** Floating capsule suspended `16px` above the bottom screen margin, spanning calc(100% - 32px).
- **Surface:** `#FFFFFF` with Level 3 elevation, border radius `24px`.
- **Navigation Items:** 4 distinct tabs (Home, Corridas, Mensagens, Perfil). Active tab features `#6A00FF` icon fill with an electric lavender soft pill backdrop (`#C9B2FF` at 25% opacity).