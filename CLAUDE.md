# Claude Code — Lessons Learned

## EQ Progress Bar / Cast Bar

### How the EQ progress bar works visually

`EQProgressBar.vue` renders two layers:

1. **Outer div** (`.eq-progress-bar`) — the track background
   - `background-image: url(progress_bar_bottom.png)` — **almost entirely transparent** (only a few dark pixels at the edges/bottom tick marks). It relies on the EQ window's `super_fancy_bg.png` texture showing through to create a visible track.
2. **Inner div** (fill) — solid `background-color` that animates `width: 0% → 100%`
   - `::before` pseudo-element — `progress_bar_top.png` glass overlay (border + tick marks), sized to `calc(fill-width + 8px)`, positioned at `-4px` left / `-2px` top relative to the fill div.

**Critical**: `progress_bar_top.png` is attached to the **fill div**, so it always moves with the fill. This is by design when the bar is inside a visible EQ window (the static track texture provides a visual anchor). When the containing background blocks the EQ texture, the moving overlay is the only visible element and looks broken.

### The "border moves with the bar" bug

**Symptoms**: The decorative border and tick marks shrink/move as the fill drains instead of staying at full bar width.

**Root cause**: `progress_bar_top.png` (the `::before`) is scoped to the fill div — it can never be stationary through CSS alone on the container. Every attempt to fix this via parent container CSS (wrappers, `position: absolute` on the fill, `background-color` overrides) was treating a symptom.

**Correct fix** (in `LoaderCastBarTimer.vue`):
- Wrap `<eq-progress-bar>` in a `position: relative` container
- Add a sibling `div.cast-bar-frame` at `z-index: 2` with `progress_bar_top.png` at full width (`width: calc(100% + 8px)`, `background-size: 100% 100%`)
- Suppress the fill's moving `::before` via `::v-deep .eq-progress-bar > div::before { display: none }`

This is the only fix that addresses the root cause.

### Why background-color fixes appeared to have "no effect"

The EQ window's `super_fancy_bg.png` texture normally shows through the nearly-transparent track background. When a containing element (e.g. a rank card with `background: rgba(18,31,53,0.35)`) blocks that texture, the track becomes invisible — but this was a **symptom**, not the root cause of the border moving.

### Vue 2 scoped CSS and deep component chains

- A scoped rule like `.parent .eq-progress-bar { ... }` becomes `.parent[data-v-xxx] .eq-progress-bar[data-v-xxx]`. For two levels of component nesting (AaEditor → LoaderCastBarTimer → EQProgressBar), the `data-v-xxx` propagation may not reach the final DOM root reliably.
- Use `::v-deep` (e.g. `.parent ::v-deep .eq-progress-bar`) to avoid this.
- Use **inline style on the component element** (`<loader-cast-bar-timer style="...">`) as the most reliable fallback — Vue 2 merges it through the component chain onto the root DOM element.

### Diagnosis approach that works

1. **Read the actual asset files** before theorising. Running pixel analysis on `progress_bar_bottom.png` immediately revealed it was nearly transparent — hours of CSS debugging could have been skipped.
2. **Look at working examples first**. ItemEditor and SpellEditor had working cast bars. The structural difference (no blocking container background, EQ window texture visible) explained everything.
3. **Distinguish visual bugs from layout bugs**. "The border moves with the bar" looked like a layout/width bug but was actually a structural CSS issue — the overlay element was attached to the wrong DOM node.
4. **When CSS fixes don't work after 2 attempts, question the diagnosis** — don't keep trying variations of the same approach.
