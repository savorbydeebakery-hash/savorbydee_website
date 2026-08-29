# Drop the scroll-world assets here

Exact filenames matter, the scrub engine looks them up by name.

## Desktop, 16:9
```
world.jpg          master diorama, all four stations
scene-1.jpg        prep bench
scene-2.jpg        oven wall
scene-3.jpg        decorating table
scene-4.jpg        counter

dive.mp4           world.jpg      -> scene-1.jpg
connector-1.mp4    scene-1.jpg    -> scene-2.jpg
connector-2.mp4    scene-2.jpg    -> scene-3.jpg
connector-3.mp4    scene-3.jpg    -> scene-4.jpg
```

## Mobile, 9:16 (native re-renders, not crops)
```
world-m.jpg  scene-1-m.jpg  scene-2-m.jpg  scene-3-m.jpg  scene-4-m.jpg
dive-m.mp4   connector-1-m.mp4  connector-2-m.mp4  connector-3-m.mp4
```

## Then check the joins before handing over
```
npm run check:seams
```
Scores every seam and writes `full-flight-preview.mp4` so you can watch the
whole sequence end to end.

Prompts: `docs/veo-nano-banana-workflow.md`
