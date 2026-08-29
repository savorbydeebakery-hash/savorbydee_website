/**
 * Re-encode a clip so it can be SCRUBBED, not just played.
 *
 * Source clips from Veo arrive with a single keyframe for the whole 8 seconds.
 * Setting video.currentTime then forces the decoder to walk from frame 0 on
 * every seek, which is why naive scroll-scrubbed video stutters. Fix is a dense
 * GOP: a keyframe every few frames so any seek lands near one.
 *
 * Also: +faststart so the moov atom is at the front and the browser can start
 * decoding before the whole file arrives.
 *
 * Usage:
 *   node scripts/prep-scroll-video.mjs <input.mp4> <out-name> [gop] [start] [dur]
 *   node scripts/prep-scroll-video.mjs in.mp4 scene-1 8
 *   node scripts/prep-scroll-video.mjs in.mp4 specials 8 2.5      (skip first 2.5s)
 */
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";

const [input, outName, gopArg, startArg, durArg] = process.argv.slice(2);
if (!input || !outName) {
  console.error("usage: node scripts/prep-scroll-video.mjs <input.mp4> <out-name> [gop]");
  process.exit(1);
}
const gop = Number(gopArg ?? 8);
const dir = "public/scroll-world";
const out = join(dir, `${outName}.mp4`);
const poster = join(dir, `${outName}.jpg`);

const mb = (p) => (statSync(p).size / 1048576).toFixed(2);

// -ss before -i seeks fast; we re-encode anyway so frame accuracy is preserved.
const trim = [];
if (startArg) trim.push("-ss", String(Number(startArg)));
if (durArg) trim.push("-t", String(Number(durArg)));

execFileSync("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error",
  ...trim,
  "-i", input,
  "-an",                          // no audio: it is a background, and it is never played
  "-vf", "scale=1280:-2",
  "-c:v", "libx264",
  "-profile:v", "high",
  "-pix_fmt", "yuv420p",
  "-crf", "26",
  "-preset", "slow",
  "-g", String(gop),              // keyframe every `gop` frames
  "-keyint_min", String(gop),
  "-sc_threshold", "0",           // disable scene-cut keyframes so the GOP stays even
  "-movflags", "+faststart",
  out,
], { stdio: ["ignore", "pipe", "pipe"] });

execFileSync("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error",
  "-i", out, "-frames:v", "1", "-q:v", "3", poster,
], { stdio: ["ignore", "pipe", "pipe"] });

const keys = execFileSync("ffprobe", [
  "-v", "error", "-select_streams", "v:0",
  "-show_entries", "frame=key_frame", "-of", "csv=p=0", out,
], { encoding: "utf8" }).split("\n").filter((l) => l.trim() === "1").length;

console.log(
  `  ${outName}.mp4  ${mb(out)} MB  ${keys} keyframes  (was ${mb(input)} MB, 1 keyframe)`
);
console.log(`  ${outName}.jpg  poster written`);
