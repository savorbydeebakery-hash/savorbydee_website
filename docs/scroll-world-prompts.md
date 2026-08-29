# Savor by Dee — scroll-world asset prompts

> **UPDATED for Veo 3.1 + Nano Banana Pro.**
> The `--start-image` / `--end-image` flags below are Higgsfield CLI syntax and
> do not apply to Veo. Veo 3.1 has native first-and-last-frame interpolation,
> which is a better fit: it pins BOTH ends of each connector instead of hoping a
> clip ends on the right motion. See `docs/veo-nano-banana-workflow.md` for the
> translated pipeline. The style preamble and scene descriptions below are still
> the source of truth for look and palette.



Generate in this order. Every clip must start from the previous clip's **last
frame**, or the seams will visibly jump.

Brand palette, used verbatim in every prompt:

| Role | Hex |
|---|---|
| Background (lightest) | `#FAF6F1` |
| Blush / pastel pink | `#F6C7CF` |
| Berry | `#A8455A` |
| Shell | `#F2E8DC` |
| Amber | `#E8AF7C` |
| Cocoa (deepest) | `#2E211B` |

---

## 0. STYLE PREAMBLE (paste verbatim at the start of every still prompt)

> Miniature isometric diorama, tilt-shift model photography look. Soft warm
> studio lighting from the upper left, gentle contact shadows, shallow depth of
> field. Matte clay-like surfaces, no glossy plastic, no chrome. Clean solid
> background `#FAF6F1` with nothing behind the model. Colour palette limited
> strictly to `#FAF6F1`, `#F6C7CF`, `#F2E8DC`, `#E8AF7C`, `#A8455A`, `#2E211B`.
> Warm, handmade, calm. No text, no logos, no signage, no lettering anywhere.
> Centred composition with headroom, nothing essential near the edges.

**Parameters:** `3:2 aspect, --resolution 2k --quality high`

---

## 1. Scene stills (4 renders)

### Scene 1 — The prep bench
> [STYLE PREAMBLE]
> Subject: a miniature bakery prep bench seen as a tiny model. Two small figures
> in aprons working: one folding batter in a wide ceramic bowl, one weighing
> flour on a small brass scale. Props: cracked eggshells, a jug of cream, a
> scatter of loose flour, butter blocks, a rolling pin, sprigs of vanilla.
> Warm blush and shell tones with cocoa accents on the woodwork.

### Scene 2 — The oven wall
> [STYLE PREAMBLE]
> Subject: a miniature bakery oven wall as a tiny model. A small figure sliding
> a tray of cake tins into a warm open oven, amber light spilling out across the
> floor. Props: cooling racks with round sponges, stacked baking trays, folded
> cloths, a wall clock with no numbers. Cocoa cabinetry, amber glow, blush walls.

### Scene 3 — The decorating table
> [STYLE PREAMBLE]
> Subject: a miniature cake-decorating table as a tiny model. A small figure
> piping a rosette onto a frosted sponge cake with a piping bag. Props: a turning
> cake stand, rows of pastel macarons on a tray, bowls of berry-red compote,
> palette knives, a small cherry bowl. The most colourful scene: heavy blush,
> berry and amber against shell surfaces.

### Scene 4 — The counter
> [STYLE PREAMBLE]
> Subject: a miniature bakery counter as a tiny model, the handover moment. A
> small figure passing a tied cake box across a shell-coloured counter to a
> waiting customer figure. Props: a glass display case of cupcakes and
> cheesecake slices, ribboned boxes stacked ready, a small potted plant, warm
> pendant lights above. Calm, resolved, the end of the journey.

---

## 2. Dive-in clip (1 render, opens the sequence)

`--start-image` = Scene 1 still. No `--end-image`.

> Single continuous cinematic camera move, no cuts. Begin high and far, looking
> down at the whole miniature bakery prep bench from outside like a tiny model.
> The camera slowly glides forward and descends toward it, sweeping in toward
> the mixing bowl on the bench, as if flying inside. As the camera pushes in, the
> roof and upper structure gently lift and open away to reveal the warm interior.
> In the final second, settle back into a slow, steady forward glide toward the
> doorway on the right. Miniature isometric diorama, tilt-shift model look, soft
> warm lighting, matte clay surfaces, palette `#FAF6F1` `#F6C7CF` `#F2E8DC`
> `#E8AF7C` `#A8455A` `#2E211B`. No text, no logos.

---

## 3. Connector clips (3 renders: 1→2, 2→3, 3→4)

`--start-image` = previous clip's **last frame**.
`--end-image` = next scene's **first frame**.

Template, substituting the scene names below:

> Single continuous cinematic camera move, no cuts. The camera smoothly pulls up
> and back out of [SCENE i], rising into the sky above the connected miniature
> world, then glides forward across it and arrives above [SCENE i+1], beginning
> to descend toward it. The camera keeps exactly the same high isometric angle
> throughout, no rotation, no orbit, no tilt. In the final second, settle into a
> slow, steady forward glide. Miniature isometric diorama, tilt-shift model look,
> soft warm lighting, matte clay surfaces, palette `#FAF6F1` `#F6C7CF` `#F2E8DC`
> `#E8AF7C` `#A8455A` `#2E211B`. No text, no logos.

| Clip | `[SCENE i]` | `[SCENE i+1]` |
|---|---|---|
| connector-1 | the prep bench | the oven wall |
| connector-2 | the oven wall | the decorating table |
| connector-3 | the decorating table | the counter |

---

## 4. Rules that decide whether the seams work

1. **Never reverse direction at a seam.** Every clip must *end* on a slow
   forward glide. Reversals are allowed only mid-clip, inside a single render.
2. **Check the last frame of every clip before generating the next one.** If it
   shows sideways motion blur, re-render it. The next clip inherits that motion
   and the seam will snap.
3. **Lock the isometric angle** in connectors. Any orbit or tilt makes the two
   ends impossible to match.
4. **Keep the subject horizontally centred** with headroom. The scrub engine
   crops on narrow viewports and edge content is the first thing lost.

---

## 5. Deliverables

**Desktop, 16:9:**
`dive.mp4`, `connector-1.mp4`, `connector-2.mp4`, `connector-3.mp4`
plus the 4 stills as `scene-1.jpg` … `scene-4.jpg`

**Mobile, 9:16** — native re-renders, not crops (crops lose the subject):
`dive-m.mp4`, `connector-1-m.mp4`, `connector-2-m.mp4`, `connector-3-m.mp4`

Target ~5-8s per clip, 720p is enough. Drop everything in `public/scroll-world/`
and I will wire the scrub.

---

## 6. Before you commit to this

These clips will be several MB each and they load on the homepage. Phase 1 of
this redesign cut per-image payload from 1.27 MB to 42 KB specifically because
the client's customers are on Indian mobile networks. Video scrub is the single
heaviest thing that can go on the page.

Mitigations when the assets land: desktop-only mounting (mobile keeps the
current procedural WebGL, which ships geometry rather than footage), lazy
prefetch only once the section is near the viewport, and a poster still so
nothing blocks first paint.
