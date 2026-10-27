# Backups

The Supabase free plan keeps no backups. `.github/workflows/backup.yml` makes
one every night at 03:00 IST.

## What it does

1. **Copies the database:** every table the website owns (menu, orders,
   customers, settings, custom cakes, reviews…), with its rules and
   functions, plus the login accounts (`auth.users`, `auth.identities`).
2. **Proves the copy restores:** loads it into an empty Postgres and checks
   that the row counts of the key tables match the live site. If they don't,
   the run fails and GitHub emails about it.
3. **Encrypts it** with AES-256 using the `BACKUP_PASSPHRASE` secret, and
   keeps it for **30 days** as a workflow artifact named
   `savor-backup-YYYY-MM-DD`.

**Not included:** photos and videos (Supabase Storage). They're too large to
copy nightly. Copy them by hand now and then (see the end of this page).

**Why encrypted:** the repository is public, and anyone signed in to GitHub
can download its artifacts. Unencrypted, a backup would expose customers'
names and phone numbers. Encrypted, it's useless without the passphrase.

## Setting it up (once)

Add two repository secrets. On GitHub: the repository → **Settings → Secrets
and variables → Actions → New repository secret**. Or from a terminal (each
asks you to paste the value, which never appears on screen):

```
gh secret set SUPABASE_DB_URL --repo savorbydeebakery-hash/savorbydee_website
gh secret set BACKUP_PASSPHRASE --repo savorbydeebakery-hash/savorbydee_website
```

- **SUPABASE_DB_URL**: in Supabase, press **Connect** (top of the project) →
  **Session pooler** → copy the URI, and replace `[YOUR-PASSWORD]` with the
  database password. If you don't know it, reset it under Project Settings →
  Database; the website doesn't use it, so nothing else needs changing.
  Use the *Session pooler* string, not "Direct connection": GitHub's servers
  can't reach the direct address.
- **BACKUP_PASSPHRASE**: a long phrase (five or six random words). **Keep it
  somewhere safe outside GitHub**, such as a password manager. If it's lost,
  the backups can't be opened, by anyone.

Then run it once: GitHub → **Actions → Nightly database backup → Run workflow**.
A green run means a backup was made *and* proven to restore.

## Restoring

1. GitHub → **Actions → Nightly database backup** → open the run from the
   night you want → **Artifacts** → download `savor-backup-YYYY-MM-DD`
   (a zip holding a `.tar.gz.gpg` file).
2. Decrypt and unpack (Git Bash on Windows has `gpg` and `tar`):

   ```
   gpg -d savor-backup-YYYY-MM-DD.tar.gz.gpg | tar -xzf -
   ```

   It asks for the passphrase. You get `public.sql` (website data),
   `auth.sql` (login accounts), `counts.txt` and `taken-at.txt`.
3. Restore into a **new** Supabase project. Never into the live one without a
   plan; restoring over it would replace newer orders. In the new project's
   SQL editor, or with `psql` and its connection string, run `auth.sql` first,
   then `public.sql`. Then point the website at the new project (Worker
   settings `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`) and redeploy.

   To recover just one thing (say, a deleted menu item), restore into a
   new project and copy the rows you need back by hand.

## Photos (by hand, now and then)

In Supabase → **Storage**, each bucket (`gallery`, `menu-items`,
`site-assets`, `promo-banners`) can be downloaded from the dashboard. Keep a
copy on a laptop or drive every month or so, and after big photo changes.
`custom-cake-refs` holds customers' reference photos and is private; it
doesn't need keeping once the cakes are made.
