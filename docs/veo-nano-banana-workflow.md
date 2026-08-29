# Veo 3.1 + Nano Banana Pro workflow

5 images, then 5 clips. Nano Banana Pro builds the world, Veo moves the camera
through it.

The `--start-image` / `--end-image` flags in `scroll-world-prompts.md` are
Higgsfield CLI syntax. Veo does not use them. Veo 3.1 has **Frames to Video**
(first frame + last frame + a prompt describing the journey), which is a better
fit: it pins both ends of every connector instead of hoping a clip happens to
end on a forward glide.

Veo's own guidance is that the two frames must not differ wildly in perspective,
subject scale, lighting or geometry. That is why step 1 exists.

---

## Step 1 — Nano Banana Pro: the master world (1 image)

Generate this FIRST. Everything else references it, which is what keeps the four
stations looking like one place instead of four unrelated renders.

**Aspect 16:9, 4K.**

```
Miniature isometric diorama of a whole small bakery, seen as one connected tiny
model on a clean solid #FAF6F1 background. Four connected work areas arranged
left to right along a gentle curve: a prep bench with mixing bowls and flour, an
oven wall with trays and warm amber light, a decorating table with a turning cake
stand and pastel macarons, and a customer counter with a glass display case and
tied cake boxes. Small figures in aprons working at each area. Tilt-shift model
photography look, soft warm studio lighting from the upper left, gentle contact
shadows, matte clay-like surfaces, no glossy plastic, no chrome. Colour palette
limited strictly to #FAF6F1, #F6C7CF, #F2E8DC, #E8AF7C, #A8455A, #2E211B.
No text, no logos, no signage, no lettering anywhere.
```

---

## Step 2 — Nano Banana Pro: 4 station close-ups

For each, **attach the master world as a reference image**. Nano Banana Pro
holds consistency across up to 14 references, so the geometry, lighting and
palette carry over.

**Aspect 16:9, 4K. Same prompt each time, swapping the station sentence:**

```
Using the attached diorama as the reference world, render a closer view of
[STATION]. Keep exactly the same high isometric angle, the same soft warm
lighting from the upper left, the same matte clay surfaces and the same palette
(#FAF6F1, #F6C7CF, #F2E8DC, #E8AF7C, #A8455A, #2E211B). Solid #FAF6F1
background. Subject horizontally centred with headroom, nothing essential near
the edges. No text, no logos, no lettering.
```

| File | `[STATION]` |
|---|---|
| `scene-1.jpg` | the prep bench, two figures folding batter and weighing flour |
| `scene-2.jpg` | the oven wall, a figure sliding a tray of cake tins into the warm oven |
| `scene-3.jpg` | the decorating table, a figure piping a rosette onto a frosted sponge cake |
| `scene-4.jpg` | the counter, a figure passing a tied cake box to a waiting customer |

---

## Step 3 — Veo 3.1 Frames to Video: 5 clips

In Flow, choose **Frames to Video**, upload the two frames, paste the prompt.
**16:9, 8 seconds, 1080p.**

Veo's docs are explicit that the prompt should describe the *journey*, not the
endpoints, since the endpoints are already fixed by the two images.

### dive.mp4 — first: master world · last: `scene-1.jpg`
```
A single continuous cinematic camera move with no cuts. The camera begins high
and far above the whole miniature bakery, then glides slowly forward and
descends toward the prep bench, as if flying down into the model. The descent is
smooth and unhurried throughout, easing gently as it arrives. The camera holds
the same isometric orientation the whole way down, no roll, no whip, no sudden
acceleration. It settles into a slow steady forward glide at the end.
```

### connector-1.mp4 — first: `scene-1.jpg` · last: `scene-2.jpg`
```
A single continuous cinematic camera move with no cuts. The camera rises up and
back away from the prep bench, travels smoothly sideways across the connected
miniature world at a steady height, and descends toward the oven wall. The
motion is one unbroken arc, slow and even, with no pause at the top and no
change of direction. The camera keeps exactly the same isometric orientation
throughout, no rotation, no orbit, no tilt. It settles into a slow steady
forward glide at the end.
```

### connector-2.mp4 — first: `scene-2.jpg` · last: `scene-3.jpg`
Same prompt, replacing `the prep bench` with `the oven wall` and `the oven wall`
with `the decorating table`.

### connector-3.mp4 — first: `scene-3.jpg` · last: `scene-4.jpg`
Same prompt, replacing with `the decorating table` and `the counter`.

---

## Step 4 — the 9:16 mobile set

Do **not** crop the 16:9 clips. The subject is centred with headroom precisely so
it survives, but cropping still throws away most of the frame.

1. In Nano Banana Pro, re-render each of the 5 images at **9:16**. It recomposes
   rather than distorting, so ask it to keep the same world and lighting.
2. Re-run the same 5 Veo jobs at 9:16 with the portrait frames.
3. Name them `dive-m.mp4`, `connector-1-m.mp4`, and so on.

---

## Step 5 — hand off

Put all of it in `public/scroll-world/`:

```
dive.mp4           connector-1.mp4  connector-2.mp4  connector-3.mp4
dive-m.mp4         connector-1-m.mp4  connector-2-m.mp4  connector-3-m.mp4
scene-1.jpg .. scene-4.jpg          world.jpg
```

I wire the scrub from there. Desktop only, as agreed; mobile keeps the
procedural WebGL, which ships geometry rather than footage.

---

## If a seam still jumps

Veo occasionally drifts off the last frame. ffmpeg is already installed, so you
can check the real final frame of any clip:

```bash
ffmpeg -sseof -0.1 -i connector-1.mp4 -frames:v 1 -q:v 2 check.jpg
```

Compare `check.jpg` against the `scene-N.jpg` you gave as the last frame. If it
drifted, feed `check.jpg` as the FIRST frame of the next clip instead of the
original still. The seam matters more than matching the plan.
