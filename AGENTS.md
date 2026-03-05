# Codex - Spire Project Guide

## Project Snapshot

- Spire is a Go + Echo + GORM backend with a Vue 2.7 + Vue Router 3 + BootstrapVue 2 frontend.
- The app is not a generic CRUD admin panel. It is an EverQuest-focused editing toolkit with a hybrid visual language: Dashkit shell plus custom EQ window/chrome components.
- A large amount of backend and frontend surface area is generated from database schema and Swagger. Before editing, determine whether the file is hand-authored or generated.

## Architecture That Matters

### Backend

- Dependency injection is wired with Google Wire in `boot/wire.go`.
- HTTP routes are grouped through `internal/http/routes` and mounted in `internal/http/http.go`.
- Most database-backed REST endpoints are generated CRUD controllers under `internal/http/crudcontrollers`.
- Database resolution is dynamic. `internal/database/resolver.go` routes requests either to the local EQEmu DB or to the authenticated user's active remote connection, and can switch between default/content/logs DBs based on the model's `Connection()` value.
- Permissions are inferred from route shapes in `internal/permissions/service.go`. CRUD naming conventions matter because permission resources are auto-derived from route prefixes and expected route counts.

### Frontend

- The frontend is Vue 2 Options API, not Vue 3 Composition API. Do not introduce Composition API patterns, Pinia, script setup, or Vue 3-only syntax.
- App bootstrap lives in `frontend/src/main.ts` and `frontend/src/App.vue`.
- Global state is mostly ad hoc:
  - app-wide events use a plain Vue event bus in `frontend/src/app/event-bus/event-bus.ts`
  - local persistence uses `LocalSettings` and raw `localStorage`
  - auth/user context uses static helpers in `frontend/src/app/user/UserContext.ts`
  - the Vuex store exists but is basically unused
- Routing is centralized in `frontend/src/router.ts`; page titles, scroll restoration, and route change events are handled there.

## Generated Code Boundaries

### Treat these as generated or generation-adjacent

- `internal/models/*.go`
- `internal/models/models.go`
- `internal/http/crudcontrollers/*.go`
- `frontend/src/app/api/**`
- `docs/swagger*`
- `boot/*` files that are controller-injector outputs after generation

### Source-of-truth files for generation

- `.generate-db-relationships.yml` controls model relationship generation.
- `.generate-model-config.yml` controls ignored tables and alternate DB connections.
- `internal/model/templates/*` controls generated backend CRUD/controller/form output.
- `openapi-generator-config.yaml` controls frontend API client generation.

### Regeneration workflow

- Full pipeline: `make generate-api-pipeline`
- Models/controllers only: `go run main.go make:models --with-controllers`
- Swagger only: `make generate-swagger`
- Frontend axios client only: `make generate-axios-client-local`

### Practical rule

- Do not hand-edit generated API client files unless the user explicitly wants a one-off patch and understands regeneration will overwrite it.
- If behavior should persist, update the generator inputs or templates, then regenerate.
- The generated OpenAPI client explicitly warns not to edit it manually.

## Frontend Conventions

### API usage

- For generated endpoints, use `new SomeApi(...SpireApi.cfg())`.
- For manual endpoints, use `SpireApi.v1()` or `SpireApi.newAxiosWithConfig()`.
- `SpireApi` owns auth headers, timing/debug logging, and 401 handling. Reuse it instead of creating standalone axios instances.
- `UserContext` caches the current user behind a mutex. If auth state changes, reset/reload through the existing helpers rather than duplicating fetch logic.

### Editor pattern

- The major editors (`ItemEditor.vue`, `SpellEditor.vue`, `NpcEditor.vue`, etc.) are large hand-authored components, not generated forms.
- They usually follow this shape:
  - left pane for tabs/forms
  - right pane for preview cards, selectors, and sub-editors
  - URL query state persists the selected tab
  - editor load/reset logic runs in `created()` or `$route` watchers
- Field descriptions usually come from domain helpers like:
  - `frontend/src/app/items.ts`
  - `frontend/src/app/spells.ts`
  - `frontend/src/app/npcs.ts`
- Before adding new labels/tooltips/derived behavior, check those helper files first instead of scattering new metadata across the component tree.

### Dirty-state and field highlighting

- Editor dirty tracking is DOM-driven, not reactive-state-driven.
- `frontend/src/app/forms/edit-form-field-util.ts` marks inputs/selects/textareas by DOM id with CSS classes like `pulsate-highlight-modified`.
- If you rename/remove an input `id`, you can silently break:
  - modified-field highlighting
  - reset-to-original flows
  - sub-editor highlighting
  - save warnings / dirty tab indicators
- When adding fields that are edited indirectly via selectors or modal panes, call `setFieldModifiedById(...)` and keep the target input id stable.

### UI and styling

- Prefer existing EQ shell components like `eq-window`, `eq-tabs`, `eq-tab`, `eq-checkbox`, and preview panes over generic Bootstrap cards.
- The app uses global CSS layers loaded in `main.ts`:
  - BootstrapVue
  - app custom CSS
  - Dashkit theme
  - EQ UI CSS
  - global overrides
- Visual changes should preserve the existing EQ/Dashkit hybrid instead of flattening the UI into a generic SaaS dashboard.
- Many screens depend on background textures and image assets for correct appearance. If a component looks visually broken, inspect the actual image assets before assuming CSS/layout is wrong.

### Vue 2 caveats

- Scoped CSS through multiple component layers is fragile; `::v-deep` is often required.
- Many components rely on direct DOM access, `window` listeners, `document.onkeydown`, and event bus subscriptions. When changing lifecycle behavior, check `created`, `mounted`, `beforeDestroy`, and `destroyed` carefully to avoid leaks or stale handlers.

## Backend and Data Model Conventions

### CRUD/query behavior

- CRUD endpoints expose filters through query-string conventions rather than bespoke request bodies.
- `frontend/src/app/api/spire-query-builder.ts` is the canonical frontend encoder for:
  - `where`
  - `whereOr`
  - `select`
  - `groupBy`
  - `orderBy`
  - `includes`
  - `limit`
  - `page`
- When adding list/filter UI, reuse `SpireQueryBuilder` instead of inventing new parameter formats.

### Relationship loading

- Relationship preload paths are generated from `.generate-db-relationships.yml`.
- Use `/models` or the Model Relationship Explorer to inspect the generated relationship names before guessing include strings.
- If an include path feels missing or awkward, the real fix is usually the relationship config, not frontend workaround code.

### Permission coupling

- Permission resources are inferred from route prefixes and expected CRUD route counts in `internal/permissions/service.go`.
- Renaming CRUD route prefixes, adding extra routes under the same resource, or deviating from the generated route shape can change permission behavior.
- Non-CRUD DB-manipulating routes usually need manual registration in `RegisterManualResources()`.

## Testing Reality

- Automated coverage is light.
- Backend tests are sparse and mostly focused on utility packages, not end-to-end CRUD behavior.
- Frontend automated coverage is Playwright-based and currently centered on specific flows like the AA editor and spawn editor.
- The Playwright tests rely heavily on API mocking, and route handlers are intentionally registered in LIFO-aware order. If you add new tests, follow the existing mock pattern instead of assuming a real backend is running.
- For UI changes, favor targeted Playwright coverage when a bug is visual or interaction-heavy. For simple backend logic, add or extend Go tests if there is an existing package-level test pattern.

## Diagnosis Workflow That Works Well Here

1. Check whether the target file is generated.
2. Look for an existing editor/viewer/sub-editor that already solves the same problem.
3. Check helper metadata files (`items.ts`, `spells.ts`, `npcs.ts`, constants, relationship config) before adding new one-off logic.
4. For frontend issues, inspect the actual DOM ids, global CSS classes, and image assets.
5. For backend/API issues, confirm whether the fix belongs in generator inputs, generated templates, or hand-authored controllers.

## EQ Progress Bar / Cast Bar

### How the EQ progress bar works visually

`EQProgressBar.vue` renders two layers:

1. Outer div (`.eq-progress-bar`) - the track background
   - `background-image: url(progress_bar_bottom.png)` is almost entirely transparent. It relies on the EQ window's `super_fancy_bg.png` texture showing through to create a visible track.
2. Inner div (fill) - solid `background-color` that animates `width: 0% -> 100%`
   - `::before` pseudo-element uses `progress_bar_top.png` as the glass overlay (border + tick marks), sized to `calc(fill-width + 8px)`, positioned at `-4px` left / `-2px` top relative to the fill div.

Critical: `progress_bar_top.png` is attached to the fill div, so it always moves with the fill. This looks correct only when the surrounding EQ background provides a stationary visual anchor.

### The "border moves with the bar" bug

Symptoms: the decorative border and tick marks shrink or move as the fill drains instead of staying at full bar width.

Root cause: `progress_bar_top.png` is scoped to the fill div. CSS on the parent container cannot make that overlay stationary.

Correct fix in `LoaderCastBarTimer.vue`:

- wrap `<eq-progress-bar>` in a `position: relative` container
- add a sibling `.cast-bar-frame` overlay using `progress_bar_top.png` at full width
- suppress the fill div's moving `::before` with `::v-deep .eq-progress-bar > div::before { display: none }`

### Why background-color fixes looked ineffective

- The track background is nearly transparent.
- If a parent container blocks the EQ texture, the track appears invisible.
- That is a symptom, not the cause of the moving-border bug.

### Vue 2 scoped CSS lesson

- Scoped selectors through nested component chains are unreliable for this kind of override.
- Use `::v-deep` for nested component styling.
- Inline style on the component element is the most reliable fallback when styles must reach the final root node.

### Diagnosis lesson

1. Read the actual image assets before theorizing.
2. Compare against a known-good existing usage first.
3. Distinguish structure bugs from simple styling bugs.
4. If two CSS attempts fail, re-check the diagnosis instead of trying more CSS variants.
