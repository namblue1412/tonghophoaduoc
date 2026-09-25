---
name: MedChem ELN Design System
description: Specialized Electronic Lab Notebook interface for Medicinal Chemistry & Organic Synthesis
colors:
  surface-canvas: "#f8fafc"
  surface-card: "#ffffff"
  surface-panel: "#f1f5f9"
  border-subtle: "#e2e8f0"
  border-strong: "#cbd5e1"
  text-primary: "#0f172a"
  text-secondary: "#475569"
  text-tertiary: "#64748b"
  brand-primary: "#0f766e" # Deep lab teal
  brand-primary-hover: "#115e59"
  brand-primary-light: "#f0fdfa"
  brand-accent: "#0284c7" # Precision sky/cyan
  lab-spc: "#10b981" # Main product fraction green
  selection-teal: "#0d9488" # Browser selection teal
  thumb-slate: "#94a3b8" # Scrollbar thumb
  dark-slate: "#1e293b" # High-contrast slate text
  state-success: "#15803d" # Forest green
  state-success-light: "#f0fdf4"
  state-warning: "#b45309" # Amber reagent
  state-warning-light: "#fffbeb"
  state-danger: "#b91c1c" # Crimson hazard
  state-danger-light: "#fef2f2"
typography:
  family-sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  family-mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.brand-primary-hover}"
---

# Design System & Craft Directives

## 1. Design Direction & Product Identity
- **Mode: OPERATE**. Every element is designed to serve a chemical experiment workflow. No decorative animations that don't convey state.
- **Reject AI-Generated SaaS Slop**:
  - NO purple/violet gradients across cards or hero headers.
  - NO nested cards inside cards of identical visual weight.
  - NO kickers / eyebrow labels above headers.
  - NO gradient text. Emphasis comes from weight and size.
  - NO washed-out gray text on colored badge backgrounds. On colored backgrounds, text must be either high-contrast white (`#ffffff`) or a deep saturated tint of that background color.

## 2. Typography & Numerical Precision
- **Chemical Data & Numbers**: All chemical weights ($m$), molecular weights ($MW$), moles ($n$), equivalents ($eq$), retention factors ($R_f$), volumes ($V$), and yields ($\%$) MUST use `font-mono tabular-nums`.
- **Text Hierarchy**:
  - H1/H2: High-contrast `text-slate-900`, `font-bold` or `font-extrabold`.
  - Body: `text-slate-800`, line-height relaxed for instructions.
  - Labels & Metas: `text-slate-600 font-medium`.

## 3. Laboratory Physical Affordances
- **Minimum Touch Target**: $\ge 44\text{px} \times 44\text{px}$ on all interactive buttons, inputs, tabs, and toggles for gloved one-hand smartphone usage.
- **TLC Image Visualization**: 3 distinct spectral channels (UV 254nm absorption, UV 365nm fluorescence, Chemical stain) displayed side-by-side with clear channel indicators.
- **Column Test Tube Rack**: Tube matrix with synchronized pooled tags (`SPC` - Main Product / `SPP` - Byproduct) and color-coded state indicators without clickable cycling distraction.
