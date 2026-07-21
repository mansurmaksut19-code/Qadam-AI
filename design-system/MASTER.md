# QADAM AI visual system

QADAM is a calm document-forensics product for students, not a generic AI dashboard. The
interface should feel like a careful reviewer marking a paper contract: warm paper surfaces,
graphite text, restrained teal actions, amber attention notes, and red reserved for high-priority
findings.

## Foundations

- Typography: IBM Plex Sans for interface copy; Literata for the primary promise and report
  headings. Keep body text at 16px or larger and line length near 68 characters.
- Colors: use CSS tokens from `globals.css`. Never encode severity with color alone; pair it with
  an icon and explicit Russian text such as “Высокий приоритет”.
- Surfaces: use one raised paper card for the main task. Avoid excessive cards, gradients, glass
  effects, and purple “AI” styling.
- Spacing: use the 4/8/12/16/24/32/48px token rhythm. Main content max width is 1180px.
- Shape: 8px controls, 14px content cards, 20px primary task surfaces. Shadows are soft and rare.

## Interaction

- Every control is at least 44px high, keyboard-operable, and has a visible 3px focus ring.
- Use native inputs, buttons, details, and dialog behavior before ARIA recreations.
- Keep the visible button label during loading and add `aria-busy`; dynamic messages use live
  regions. Respect `prefers-reduced-motion`.
- Drag-and-drop can enhance file selection but must never replace the native file input.

## Content hierarchy

1. State the one job: check a Kazakhstan rental contract before signing.
2. Explain privacy and the legal-assistance boundary next to upload, not in hidden fine print.
3. In reports, show summary and next actions before evidence. Every strong claim links to an
   official source and the exact contract excerpt.
