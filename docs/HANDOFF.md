# Handoff — where things stand (2026-11-17)

Repository: https://github.com/haripalani/Design-Studio (branch `main`). This is the up-to-date copy.
The older remote https://github.com/haripalani/Garment-Studio stops at commit `124b0a8` (Stages 7–8).

## Setting up on a new machine

```bash
git clone https://github.com/haripalani/Design-Studio.git
cd Design-Studio
corepack enable
pnpm install
docker compose -f infra/dev/compose.yaml up -d   # Postgres, Redis, SeaweedFS, Mailpit, ClamAV
cp apps/api/.env.example apps/api/.env           # then fill in values; see docs/STAGE6_REPORT.md
pnpm --filter @gs/api exec prisma migrate deploy
pnpm --filter @gs/api exec tsx scripts/seed.ts
pnpm dev                                          # editor at http://localhost:5173
```

Turborepo cannot find the package manager on the old Windows machine. Typecheck each package with
`npx tsc -p tsconfig.json --noEmit` inside it. The Playwright browsers need `npx playwright install` in `apps/editor`.

## Stage status (BLANKBUILDER V2 spec, approval-gated stages 1–12)

| Stage | Status |
|---|---|
| 1–6 | Approved and done |
| 7 Rendering and export | Approved and done |
| 8 Cloud app on staging | **Done, awaiting approval.** Report: `docs/STAGE8_REPORT.md` |
| 9 PWA | Not started (waits on Stage 8 approval) |
| 10–12 | Not started |

Stage 8 open items:
- GitHub Actions CI has never completed. Run 41201316292 on Garment-Studio stayed queued, so check CI on the
  new repo after the first push there.
- A real staging deploy needs the owner's accounts (Fly.io and the rest). Steps are in `infra/DEPLOY.md`.
  The local staging replica runs at `https://gs.localhost:8443` (`infra/staging`).
- Last full E2E run: 105 passed, 6 skipped, 1 GPU-render timeout in the heavy phase, 20 heavy specs not run.
  The heavy specs are flaky under CPU load.

## Side task in progress: procedural hoodie (three.js + GSAP)

This is our own garment, generated from parameters. It sits outside the stage plan.

Done (committed):
- `packages/core/src/devHoodie.ts`: the hoodie pattern. Front and back bodies, sleeves, a two-piece hood with a
  centre seam, and a kangaroo pocket (`placedOn` the front). It also has a rib waistband (front and back), rib
  cuffs, a label, the seam table and print presets. `flatLay.sleeveDropDeg = 62`.
- `packages/core/src/garments.ts`: the registry. `devGarments()` and `devGarment(id)` cover `dev-tee` and `dev-hoodie`.
- `packages/core/src/garment.ts`: `PieceDef.placedOn?` and `GarmentModel.flatLay?`.
- `packages/core/src/devTee.ts`: exports the pattern helpers (`Outline`, `body`, `sleeve`, `rect`, `normalise`,
  `mark`, `EN`).

To do, in order:
1. **3D geometry** in `packages/engine-3d/src/garmentMesh.ts` (`buildGarmentGeometry`). It only knows the tee so far.
   - Sleeve drop angle: `g.flatLay?.sleeveDropDeg ?? 22`. It is currently the hard-coded constant `SLEEVE_DROP_DEG`.
   - Add `baseZ?: (viewP) => number` to `Region`, so the pocket and hood sit on the body surface.
   - Waistband: for each body seam whose `b` piece has role `band`, map band `tl→tr` onto the hem chord, with a
     small inset for the gather, and extend it downward.
   - Cuffs: for each sleeve seam whose `b` piece has role `cuff`, take the sleeve's map ∘ affine(cuff tl, tr, bl →
     hemL, hemR, hemL + [0, cuffH]). Clip to the visible half, as the sleeve is.
   - Hood, back view only: neckB → (cx, back-neck y), neckF → outward at the neck width, crown lying down over the
     back. Mirror the other half.
   - Pocket, front view: translate by `placedOn.at`, as a small pillow (depth ~6 mm, round ~30 mm).
   - Add `rib: boolean` to `GarmentGeometry`. The studio should draw the neck rib (`studio.ts` ~line 331) only when the
     garment has `rib` pieces.
   - `size` from the bounding box of all positions, not `fb.w + 400`.
2. **GSAP** (`gsap@3.15.0` in `packages/engine-3d`): replace the hand-written camera tween in `studio.ts` (`anim`,
   ~lines 116/740/795) with `gsap.to(..., { ease: 'power3.inOut', duration: 0.6 })`. Add a garment-switch transition
   in `setGarment`: group scale/position settle with `back.out`, then a camera re-frame.
3. **Editor**:
   - Add `devGarment('dev-hoodie')` to the picker list in `apps/editor/src/store/garmentCatalog.ts`.
   - Make `useDoc.setGarment` undoable. It should keep layers on piece ids both garments share and drop the others,
     with a toast.
   - Restoring a design (`store/persist.ts` ~line 114) rejects any `modelId` other than `dev-tee`. Use
     `devGarment(modelId)` instead.
   - `editor/actions.ts` `newDesign` uses `DEV_GARMENT`.
4. **API**: seed `dev-hoodie` with a thumbnail in `apps/api/scripts/seed.ts`. The renderer already reads the garment
   from the database.
5. **Tests**:
   - Unit: dev-hoodie pieces and seams are valid; geometry builds; UVs are in [0,1]; winding is correct.
   - Then check in the browser and run the unit and E2E suites.

## Important: BlankBuilder assets (not in the repo)

Someone on this machine added code that loads BlankBuilder's own garment models. Those files were downloaded from
blankbuilder.app by `packages/engine-3d/scripts/extract_garment.mjs`:
- `apps/editor/public/garments/{tee-t5,tee-t12,tee-t12-body,hoodie-flat}/`
- `packages/engine-3d/assets/garments/` (a duplicate copy)

They are proprietary and were **deliberately not committed**, together with the extraction script. They will not be
on the new laptop. The spec says to use only assets we are authorised to use, so they should not be re-downloaded
without a licence or written permission from BlankBuilder.

The loader code *is* committed: `packages/engine-3d/src/realModel.ts`, the real-model branch in `studio.ts`
(`REAL_MODEL_MAP`, `buildRealGeometry`) and `apps/editor/src/store/garmentCatalog.ts`. Without the files it fetches
`/garments/<id>/model.bin`, gets a 404 and falls back to the procedural garment. The picker entries `tee-t12`,
`tee-t5`, `tee-t12-body` and `hoodie-flat`, though, will show the dev tee mesh under those names, with no
thumbnails. Decide whether to remove that code or keep it for properly licensed models in the same format.
