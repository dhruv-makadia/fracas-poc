# FRACAS — POC / Demo (HTML · CSS · JS)

A no-backend proof of concept for the FRACAS Requirements Specification (Phase 1 admin +
Phase 2 reporting & review), styled to the TraXtion brand.

## Run it

Option A — just open it:
- Double-click `index.html`. It works from `file://` (seed data is embedded in `js/data.js`).

Option B — with a tiny server (lets it load `data.json` directly):
```
cd fracas-poc
python -m http.server 8000     # or: npx serve
# open http://localhost:8000
```

## Sign in

The landing page is a **login screen with a single "Sign in with Microsoft" button** — the POC's
stand-in for Entra ID SSO (NFR-2).

The demo account is `T. Therrien / t.therrien@traxtion.com` (`SESSION` in `js/app.js`). **Sign out**
in the top right returns you to the login screen.

## Impersonate (POC only)

The top-right button showing the current role name opens a role picker. **This control is not part
of the specified product** — in production the actor is fixed by the signed-in user's Entra ID group
assignment (NFR-3) and cannot be changed from the UI. It exists here so a demo can walk through each
actor's workspace without four sign-ins.

Roles are defined in one block, `ROLES` at the top of `js/app.js` — each entry lists the nav items
that actor sees and whether it may correct a report:

| Role | Nav items | Can correct a report |
|---|---|---|
| **Engineering Administrator** (default) | Products & variants · Failure reports · Audit logs · Disposition list | no |
| **Engineering Representative** | Failure reports | **yes** |
| **Failure Reporter** | Failure reports · New report | no |
| **Finance Representative** | Disposition summary | no |

Each role lands on its **first** nav item — Engineering Administrator opens on Products & variants.
Switching role closes any open report, discards an in-progress correction (after confirming), and
falls back to that landing view if the current view is not one the new role may open.

## Navigation

The nav shows only the items the impersonated actor may open, as a single flat list — there are no
group headings, since the impersonate control now says whose workspace you are in.

| Role | Item | What it demos |
|---|---|---|
| Failure reporter / Eng. rep / Eng. admin | **Failure reports** | Tabulated review with filter/sort on date, product, variant, origin, customer. Row → full detail, mirroring the submission flow locked read-only. **Correct this report** (Engineering Representative only) unlocks the same form: edit case details, add/remove failed parts via the tree, edit part panels — changes are diffed against the original and saved with a required reason into the correction log (FR-2.10) |
| Failure reporter | **New report** | Product → Variant → Tree of Parts in a master-detail layout. Selecting a node opens its **System/Part Information panel** scoped to that node (UI-req 3): part number/rev, serials, that node's configured symptom & mode checklists (with None/Other), notes, required Disposition. Entry chips jump between multiple failed parts; validation blocks incomplete submits |
| Finance representative | **Disposition summary** | Read-only, by-date disposition aggregation with CSV export |
| Engineering administrator | **Products & variants** | A 2×2 workspace — Products and Variants across the top, Tree of Parts and the node's symptoms/modes panel across the bottom. The two upper panels collapse to their header bar (the header keeps naming the current selection), so once a variant is picked the tree and node panel own the view and the whole screen fits a half-width, side-by-side window. Tree of Parts editor (add/rename/move/remove nodes at any depth), per-node failure symptom & mode assignment |
| Engineering administrator | **Audit logs** | Attributed, timestamped trail of every configuration change and report action |
| Engineering administrator | **Disposition list** | The shared, system-wide list — add/edit/retire/reorder, seeded with the spec's 6 defaults |
| Engineering administrator | **User access** | User-to-actor assignment table (FR-1.8) |
| Engineering administrator | **Data (JSON)** | Export the current dataset, import an edited one, or reset to seed |

## Data

- Seed data lives in **`data.json`** (mirrored in `js/data.js` for file:// use).
- On first load it's copied into the browser's **localStorage** — every change persists across refreshes.
- Reset it any time from **Data (JSON) → Reset to seed data**.

## Visual system

The brand mark is the official TraXtion logo, loaded from `traxtion.com`
(`LOGO_SRC` at the top of `js/app.js`). If the image can't load — offline demo, no network —
it falls back to a TraXtion wordmark automatically. To bundle it instead, save the PNG as
`assets/traxtion-logo.png` next to `index.html` and point `LOGO_SRC` at that path.

Palette is derived from traxtion.com: service-lane navy `#14293a`, TraXtion signal green `#6fb92c`
(with `#4d8a1b` for green text on light surfaces and `#eef7e2` for the active nav pill), on cool
instrument-panel greys. Type is Archivo for display, IBM Plex Sans for body, IBM Plex Mono for part
numbers and serials. The one ornament is a tread-groove rule under the top bar — a nod to what
TraXtion's hardware actually reads.

All colours are CSS custom properties at the top of `css/styles.css`; swapping in exact brand hex
values is a one-block edit.

## Requirement coverage (POC level)

- **FR-1.1 → FR-1.9** — Admin CRUD, uniqueness rules (duplicate variant/node names rejected),
  disposition list with the seeded 6 defaults, user assignments, attributed + timestamped audit trail.
- **FR-2.1 → FR-2.10** — Report flow mirroring the mockup (product/variant button rows, indented
  tree), multi-part reports, checklists scoped to each node's configured values, "None"/"Other"
  options, submit validation, immutable reports + logged corrections.
- **Data model §4** — every Failed Part entry carries the **Tree_of_Parts node reference**
  (`nodeId`) plus a snapshot of the node's name/path/type captured at submission. Old reports keep
  displaying what was true when filed; if an admin later renames or moves the node, the detail view
  shows the snapshot and flags "renamed/moved since submission". Analytics group by the stable reference.
- **FR-3.1 → FR-3.4** — Tabulated view with filter/sort; row → full detail; finance aggregation by date.
- **NFR-2** — represented by the Entra ID sign-in screen (simulated).
- Out of scope here, as in the spec: real SSO, Azure hosting, DB-level constraint enforcement,
  corrective actions, trend dashboards.

## Files

```
fracas-poc/
├─ index.html        app shell
├─ data.json         seed dataset
├─ css/styles.css    TraXtion visual system (navy · signal green · plex type)
└─ js/
   ├─ data.js        same seed embedded for file:// use
   └─ app.js         all logic: sign-in, nav, admin, reporting, review, finance
```
