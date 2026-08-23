
## 2026-08-20 21:39 OpenNext build SUCCESS on Windows
- FIX: added buildCommand: "next build --webpack" to open-next.config.ts (spread after defineCloudflareConfig since CloudflareOverrides type rejects buildCommand)
- Root cause: Turbopack creates symlinks in .next output (prettier-3c69a91af3bc4731); OpenNext copyTracedFiles.js symlinkSync fails EPERM on Windows without admin/Dev Mode
- Webpack traces real files -> no symlinks -> build passes
- Bundle sizes: server handler.mjs 4.8MB (<10MB OK), middleware handler.mjs 670KB, worker.js 2.2KB
- middleware.ts deprecation warning remains (expected, functional)
- Edge runtime warnings about process.cwd in middleware bundling: non-fatal
- NEXT STEP: deploy needs Cloudflare API token (absent) + real KV id + R2 bucket + secrets

## 2026-08-20 21:41 Local worker smoke test PASSED
- wrangler dev (local workerd, no auth needed) boots the OpenNext worker
- GET / -> 200 (48KB real HTML, full Next.js app renders)
- GET /menu -> 200, GET /login -> 200
- GET /admin -> 307 redirect to /login?next=/admin (middleware auth protection WORKS)
- env vars loaded from .dev.vars (SEED_* hidden)
- Cron warning: scheduled workers not auto-triggered locally (expected)
- CONCLUSION: OpenNext build pipeline fully validated on Windows. Deploy is the only remaining gate.
