# AU One Studio

**Low-code / no-code enterprise platform** — the core engine of AU One ERP.
Build forms, approval workflows, automations, databases and dashboards through
configuration, without writing code.

Version 1.0 · single-repo, **no frameworks, no build tools, no dependencies.**

---

## How to run

**On a phone / any machine:** just open `index.html` in a browser.

The app is split into many files but uses **classic `<script>` includes with a
shared global namespace** (the Module Pattern) rather than ES modules. Classic
scripts load fine over `file://`, so there is **no server or build step** — tap
`index.html` and it runs. (ES-module `import` would have required a web server;
we deliberately avoided it so the project opens offline on site.)

For production you can serve the folder from any static host, or later run it
through a bundler — the file boundaries are already clean.

---

## Why this structure

```
au-one-studio/
├─ index.html                 # shell + ordered <link>/<script> includes only
├─ assets/
│  ├─ css/                    # styling split by concern (tokens → components → responsive)
│  │  ├─ variables.css        #   design tokens + light/dark theme palettes
│  │  ├─ base.css             #   reset, typography, scrollbars
│  │  ├─ layout.css           #   app shell, sidebar, topbar, grid
│  │  ├─ components.css       #   buttons, cards, inputs, tables, modal, timeline
│  │  ├─ workflow.css         #   visual workflow node canvas
│  │  ├─ data-views.css       #   table / kanban / calendar / skeletons
│  │  └─ mobile.css           #   FAB, bottom nav, bottom-sheet, responsive rules
│  └─ js/
│     ├─ core/                # platform primitives — no business logic
│     │  ├─ utils.js          #   helpers + inlined Lucide icon set + svg()
│     │  ├─ event-bus.js      #   Observer pattern; the decoupling backbone (Bus, AUS)
│     │  ├─ storage.js        #   Storage adapter (localStorage today; Supabase/REST later)
│     │  ├─ config.js         #   field-type registry, seed data, field factory
│     │  ├─ router.js         #   event delegation + action handlers (Command pattern)
│     │  └─ main.js           #   seeding, keyboard, pull-to-refresh, boot()
│     ├─ engines/             # one responsibility each; reusable by any module
│     │  ├─ validation-engine.js
│     │  ├─ form-engine.js        # config → live form + formula evaluation
│     │  ├─ workflow-engine.js    # build runtime approval steps + conditions
│     │  ├─ permission-engine.js
│     │  ├─ approval-engine.js    # submit / approve / reject / route + automation hooks
│     │  ├─ notification-engine.js
│     │  └─ plugin-engine.js      # Factory/DI registry — modules self-register here
│     ├─ builders/            # the low-code authoring surfaces
│     │  ├─ form-builder.js       # drag-and-drop field builder + inspector + rules
│     │  ├─ workflow-builder.js   # VISUAL workflow node designer
│     │  ├─ form-settings.js      # form meta + permission matrix
│     │  └─ submit-form.js        # live form renderer (all field widgets, validation)
│     └─ ui/                  # rendered views (presentation only)
│        ├─ app.js               # state, theme, modal/toast, nav, render router
│        ├─ dashboard.js
│        ├─ data-views.js        # cards / table / kanban / calendar + filters
│        ├─ request-detail.js    # approval chain, values, timeline
│        ├─ templates.js
│        └─ settings.js
```

**The rule:** `core` knows nothing about business logic; `engines` each own one
concern and never render; `ui`/`builders` render but delegate all logic to
engines; everything talks through `Bus` (the event bus) or the `AUS` namespace,
never by reaching into another module's internals.

---

## Architecture (the platform primitives)

| Layer | Pattern | Purpose |
|---|---|---|
| **Event Bus** (`Bus`) | Observer | Engines/plugins publish & subscribe instead of calling each other — loose coupling. |
| **Storage** (`Store`) | Adapter | Every engine reads/writes via `list/get/upsert/remove`. Swap the 4 method bodies for **Supabase / REST / GraphQL / offline** without touching anything else. |
| **Plugin Engine** (`Plugins`) | Factory + DI | Future ERP modules (Construction, Finance, HR, QAQC…) call `Plugins.register({...})` and contribute forms, templates, workflows and field types through an injected context — **no core edits, no duplicated code**. |
| **Config Registry** (`FieldTypes`) | Configuration-over-code | Add a field type = one entry. Nothing hardcoded in the UI. |
| **AUS namespace** | Module | Single global (`window.AUS`) the surrounding ERP reads everything through. |

### Registering a module (example)
```js
Plugins.register({
  id: 'construction', name: 'Construction', icon: 'hard-hat',
  async install(ctx) {
    await ctx.addTemplate(/* RFI, Variation Order, Punch List, Daily Report… */);
    ctx.on('request:approved', req => {/* create Purchase Order, etc. */});
  }
});
```

---

## What works today

- **Form builder** — 30+ field types, drag/tap to add, inspector with description,
  placeholder, default, prefix/suffix, read-only, **conditional visibility**, width; undo/redo.
- **Visual workflow designer** — node canvas (Start → approval nodes → Completed)
  with connectors, insert-between, per-node approver/mode/SLA and conditional routing.
- **Approval engine** — sequential routing, conditional steps, approve/reject/return/
  delegate/escalate, full timeline + audit + comments.
- **Automation (Rules)** — no-code rules run by the engine on submit/approve/final/reject.
- **Data engine** — every form's requests as Cards / Table / Kanban / Calendar,
  with filter, sort, module filter and **saved views**.
- **Global search** (Ctrl/⌘+K), notifications, permission matrix, directory config.
- **Mobile-first** — bottom nav, FAB, bottom-sheet modals, pull-to-refresh, dark/light/auto theme.

## Roadmap (next increments)

AI describe-to-generate · richer workflow nodes (delay/webhook/API execution) ·
database relationships + rollups · auto-dashboards & charts · offline sync adapter ·
Construction plugin pack (RFI, VO, Punch List, Daily Report, Inspection).

---
*Storage is local for now. To connect Supabase, implement the adapter in
`assets/js/core/storage.js` — the rest of the platform never needs to know.*
