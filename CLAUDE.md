@AGENTS.md

# Mobile-First Design Requirements

Every component and layout change must work well on narrow viewports (320px+) before considering desktop.

## Rules

- **Mobile-first Tailwind**: write base styles for mobile, add `sm:` / `md:` / `lg:` breakpoint overrides for larger screens. Never write desktop-only styles without a mobile fallback.
- **No fixed widths on containers**: use `max-w-*` (which caps at large sizes) rather than `w-*` (which forces a fixed width).
- **Overflow discipline**: any horizontally-scrollable region (tables, wide grids) must be wrapped in `overflow-x-auto`. The scrollable child must use `min-w-full` or an explicit `min-w-*` so it doesn't collapse.
- **Grid columns**: never hard-code a column count that exceeds what fits on a 320px screen. Default to `grid-cols-1`, then promote with `sm:grid-cols-2` or `sm:grid-cols-3` as appropriate.
- **Text sizing**: large display numbers (`text-3xl`+) should use a smaller base size and scale up (`text-2xl sm:text-4xl`).
- **Touch targets**: interactive elements (buttons, list items, inputs) must be at least 44×44 CSS px on mobile.
- **Padding/margin**: use responsive padding (`p-4 sm:p-10`) on outermost containers so content has breathing room on small screens without wasting space on large ones.
- **Test at 375px**: before marking any UI task done, verify layout at 375px width (iPhone SE / standard mobile) in the browser preview. Check for horizontal scrollbars, clipped text, and overflowing elements.

# Accessibility — Contrast Requirements

All features built must meet WCAG 2.1 AA contrast standards.

## Rules

- **Normal text** (under 18pt / under 14pt bold): minimum contrast ratio of **4.5:1** against its background.
- **Large text** (18pt+ or 14pt+ bold): minimum contrast ratio of **3:1**.
- **UI components and icons** (buttons, inputs, borders, graphical elements): minimum **3:1** against adjacent colors.
- **Approved text color pairings on white/near-white backgrounds**: `text-zinc-500` (4.6:1) for secondary labels; `text-zinc-600` (7.6:1) or darker for headings and primary content. Never use `text-zinc-400` (2.5:1) for any visible text.
- **Amber warnings on white**: use `text-amber-700` (4.9:1) minimum — never `text-amber-600` (3.1:1).
- **Emerald positive states on white**: use `text-emerald-700` (5.4:1) minimum — never `text-emerald-600` (3.7:1).
- **Placeholder text**: use `placeholder:text-zinc-500` minimum — `placeholder:text-zinc-400` fails.
- **Input borders**: use `border-zinc-400` minimum for form inputs to meet non-text contrast.
- **Verify with browser DevTools**: use the accessibility panel or a contrast checker before marking any UI task done.
