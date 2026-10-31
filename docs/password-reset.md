# Password reset emails: one-time setup

The site has **Forgot password?** (on the sign-in page), `/forgot-password` and
`/reset-password`. Supabase sends the email, but its built-in mailer only
delivers to people on the Supabase team, so customers never receive it until
the project sends through its own mail service. Resend is free up to 3,000
emails a month and sends from `savorbydee.in`, which is already on Cloudflare.

About 20 minutes, once.

## 1. Resend: add the domain

1. Sign in at resend.com → **Domains** → **Add domain** → `savorbydee.in`.
2. Resend lists 3–4 DNS records (an MX and a TXT for `send`, a TXT for
   `resend._domainkey`, maybe a DMARC TXT).
3. Cloudflare → `savorbydee.in` → **DNS** → **Add record** for each one, copied
   exactly. Leave the proxy **off** (grey cloud) for these.
4. Back in Resend, press **Verify**. It usually turns green within minutes.
5. Resend → **API Keys** → **Create**: name it `Supabase auth`, permission
   **Sending access**, domain `savorbydee.in`. Copy the key (shown once).

## 2. Supabase: send through Resend

Supabase dashboard → the Savor project → **Authentication**:

1. **Emails → SMTP Settings** → turn on **Custom SMTP**:
   - Sender email: `noreply@savorbydee.in`
   - Sender name: `Savor by Dee`
   - Host: `smtp.resend.com`, Port: `465`
   - Username: `resend`, Password: the API key from step 1.5
2. **Emails → Templates → Reset Password**: in the message, replace
   `{{ .ConfirmationURL }}` with
   `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery`.
   This makes the link work on any device. The default link only works in the
   browser that asked for it.
3. **URL Configuration**: Site URL `https://savorbydee.in`; under Redirect
   URLs add `https://savorbydee.in/reset-password`.
4. **Rate Limits**: raise "emails sent per hour" from 2 to about 30.

## 3. Check it

Sign out, press **Forgot password?**, enter your own email, open the link on
your phone, set a new password. If no email arrives, Resend → **Emails** shows
whether it was sent and why not.

The same verified domain is what order emails need too (`EMAIL_FROM`, see
`lib/email/client.ts`).
