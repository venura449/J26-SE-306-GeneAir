---
version: alpha
name: Claymorphism
description: A soft blue clay shadcn/ui theme — blue primary, cool gray canvas, bold rounded shadows, and playful tactile depth.
colors:
  background: "#e0e0e0"
  foreground: "#1d293d"
  card: "#fafafa"
  primary: "#2563eb"
  primary-foreground: "#ffffff"
  secondary: "#d4d4d4"
  secondary-foreground: "#4b5666"
  muted: "#ededed"
  muted-foreground: "#6c727e"
  accent: "#60a5fa"
  accent-foreground: "#dbeafe"
  destructive: "#f14444"
  border: "#d4d4d4"
  input: "#d4d4d4"
  ring: "#2563eb"
  sidebar: "#d4d4d4"
  sidebar-foreground: "#1d293d"
  sidebar-primary: "#2563eb"
  sidebar-accent: "#ededed"
  chart-1: "#2563eb"
  chart-2: "#60a5fa"
  chart-3: "#93c5fd"
  chart-4: "#1d4ed8"
  chart-5: "#1e3a8a"
  dark-background: "#111827"
  dark-foreground: "#e5eefc"
  dark-card: "#172033"
  dark-primary: "#60a5fa"
  dark-secondary: "#26364f"
  dark-muted: "#1e2b41"
  dark-muted-foreground: "#a8bad3"
  dark-accent: "#2563eb"
  dark-border: "#314563"
  dark-sidebar: "#1b2940"
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  serif:
    fontFamily: Lora
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.65
  mono:
    fontFamily: Roboto Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  xs: 14px
  sm: 16px
  md: 18px
  lg: 20px
  xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 48px
  section: 64px
  gutter: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: 14px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.lg}"
    padding: 14px
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 14px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: 24px
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 14px
  sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
---

# Claymorphism

A premade shadcn/ui theme by [tweakcn](https://tweakcn.com). Install tokens with `npx shadcn@latest add @shadcnblocks/theme/claymorphism`, then keep this DESIGN.md in the project root (or `.agents/`) so coding agents stay on-brand.

## Overview

Claymorphism feels like pressing buttons into soft modeling clay: cool gray canvas, near-white cards that puff upward, bold blue primary, and thick colored shadows that give every element a tactile, almost physical presence. The background (`#e0e0e0`) is intentionally mid-tone — not white, not dark — creating a neutral clay surface from which UI elements appear molded.

The system is **playful, tactile, and rounded**. It suits creative tools, educational platforms, consumer productivity apps, lifestyle products, and any interface that wants to feel delightful and approachable rather than corporate or technical. The generous radius (1.25rem base!) and thick blurred shadows are the defining visual signature.

Emotional targets: friendly, tangible, craft-like — never flat-corporate, never sharp-developer, never clinical.

## Colors

The palette pairs a **saturated blue primary** with a **cool neutral clay stage**. Blue brings clarity and trust; the gray canvas grounds it.

- **Primary (`#2563eb`):** Clear royal blue — primary buttons, links, focus rings, and brand moments. In dark mode, lifts to sky blue (`#60a5fa`) for visibility.
- **Accent (`#60a5fa`):** Soft sky blue — secondary highlights, chart accents, and decorative moments. Adds depth to the blue family.
- **Secondary (`#d4d4d4`):** Mid-gray — secondary buttons, sidebar, quiet structural fills.
- **Foreground (`#1d293d`):** Dark navy-ink — body text. Slightly blue-shifted for warmth against gray.
- **Background (`#e0e0e0`):** Clay gray canvas — the defining color. Mid-tone creates the "clay slab" from which elements extrude.
- **Card (`#fafafa`):** Near-white surfaces that pop above the gray canvas — the "raised clay" layer.
- **Muted (`#ededed`):** Light gray for quiet chrome, wells, and recessed areas.
- **Border (`#d4d4d4`):** Same as secondary — subtle edge definition, not the primary separator (shadows do that work here).
- **Destructive (`#f14444`):** Bright red for errors — clear and distinct from the violet palette.

Dark mode shifts to a warm brown-charcoal (`#1e1a16`) with lifted violet and muted warm borders. The clay feel persists through warm undertones.

## Typography

**Plus Jakarta Sans** is the primary face — display through body. **Lora** provides an optional serif for editorial moments. **Roboto Mono** covers code.

- **Display / headlines:** Plus Jakarta Sans Bold, tight tracking. Rounded and friendly.
- **Body:** Plus Jakarta Sans Regular at 16px with 1.6 line-height. Geometric and approachable.
- **Labels / UI chrome:** Plus Jakarta Sans Medium. Sentence case; friendly tone.
- **Serif:** Lora for optional editorial callouts — not in dense UI chrome.
- **Mono:** Roboto Mono for code blocks and technical fragments.

Avoid sharp condensed faces, heavy slab serifs, or monospace-everywhere aesthetics. Claymorphism's type is soft, rounded, and human.

## Layout

Use a **generous playful rhythm**: 8px base, airy spacing, and breathing room around every element.

- Prefer a max-width content column (~1100px) with comfortable gutters.
- Cards are the hero element — give them room to breathe with their thick shadows.
- Don't overcrowd. Each card or group should feel like a discrete physical object sitting on the clay surface.
- Marketing pages: bold headline, playful illustration space, one or two CTA buttons.
- App shells: gray sidebar, near-white content. Keep navigation items well-spaced to maintain the tactile metaphor.
- Density: low-medium. Claymorphism requires more whitespace than flat themes to let the depth language read.

## Elevation & Depth

Depth is **bold and defining** — Claymorphism's signature is thick, offset, colored shadows that make elements feel physically extruded.

- Shadow offset includes lateral shift (`2px` x-offset) and generous blur (`10px` spread `4px`).
- Shadow color is a muted purple-gray (`hsl(240 4% 60%)`) — not neutral black, which reinforces the colored-clay metaphor.
- Cards should feel like they're floating 4–8px above the surface. This is not subtle — lean into it.
- Background → Card → Primary Button creates a clear 3-layer depth stack.
- Avoid flat, borderline-invisible shadows. If shadows look like any other theme, you've lost the clay identity.
- Dark mode: shadows darken and warm slightly; the extruded feel should persist.

## Shapes

Corner radius is **very generous** — base `--radius` is `1.25rem` (20px).

- Buttons, inputs, and controls: ~20px (`rounded-lg`).
- Cards and large panels: ~24px (`rounded-xl`).
- Smaller chips and badges: 14–16px.
- Pills: full rounding for truly circular or capsule elements.
- The large radius is non-negotiable — it's what makes elements look molded rather than cut. Do not tighten to standard 8px.

## Components

Built for the shadcn/ui token contract. Prefer semantic tokens (`bg-primary`, `text-muted-foreground`) over raw hex in component code.

- **Primary button:** Violet fill, white label, bold shadow underneath. Should feel pressable like a physical button.
- **Secondary button:** Gray fill, dark text, subtle shadow. Companion actions.
- **Outline / ghost:** Navy text on transparent with border; still uses the generous radius.
- **Cards:** Near-white surface, thick colored shadow, very rounded corners. The core visual unit.
- **Inputs:** Near-white or card-colored fields with rounded corners and soft inner shadow or border.
- **Sidebar:** Gray clay surface; items are well-spaced with rounded hover states.
- **Charts:** Series order violet → purple → lavender → deep indigo → dark indigo. Monochromatic violet family.
- **Badges:** Violet or purple fills with generous rounding. Small rounded pills.
- **Toggles/switches:** Extra-rounded — the clay metaphor makes toggle controls feel particularly satisfying.

## Do's and Don'ts

**Do**

- Do maintain the mid-tone gray canvas — it's the clay foundation of the entire metaphor.
- Do use thick, offset, colored shadows on cards and interactive elements.
- Do keep the 20px+ radius everywhere — consistency sells the tactile illusion.
- Do use violet as the primary accent with purple as a supporting tone.
- Do allow generous whitespace between clay "objects."

**Don't**

- Don't flatten shadows to near-invisible — the depth is the identity.
- Don't reduce radius to standard 8px — that destroys the clay feel instantly.
- Don't use pure-white backgrounds (no clay surface) or pure-black text (too harsh for the soft palette).
- Don't overcrowd cards — elements need physical breathing room.
- Don't introduce sharp, angular decorative elements or hard geometric patterns.
- Don't mix in a secondary warm/cool accent color that fights the violet family.
