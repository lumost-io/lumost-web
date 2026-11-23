# lumost-web

Landing page for [lumost.id](https://lumost.id) — Astro, fully static, one page, Bahasa Indonesia only.

Sections: hero (real screenshot) · four signals · product tour (six tabs, CSS-only) · how it works · data handling ·
a short design-partner strip · contact (form, WhatsApp, email). No prices: the pricing conversation happens in the demo.

## Run

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npm run preview
npm run check      # astro check (types)
```

## Where things live

| What | Where |
|---|---|
| All copy | `src/i18n/id.ts` (single dictionary; no second locale) |
| Contact details, form endpoint | `src/site.ts` |
| Page sections | `src/components/Landing.astro` |
| Contact form + its script | `src/components/ContactForm.astro` |
| Form relay (Resend) | `workers/contact/index.js` · `workers/contact/wrangler.toml` · `workers/contact/test.mjs` |
| Brand tokens, layout | `src/styles/global.css` (values copied from the proposal decks) |
| Screenshots | `src/assets/shots/` — from the running app, demo data; optimised to WebP at build |
| Fonts | `public/fonts/` — Barlow Semi Condensed + Roboto Mono, self-hosted |

## Contact form

Two modes, chosen at build time by `PUBLIC_FORM_ENDPOINT` (`src/site.ts`):

- **Unset** — submit opens the visitor's mail app with the message pre-filled (`mailto:`). No setup; conversion is poor and
  the address is exposed to scrapers.
- **Set** — the page POSTs JSON `{name, email, company, hosts, message}` and treats 2xx as success. Send `Accept` +
  `Content-Type: application/json`; the browser sends a CORS preflight, so the endpoint must answer `OPTIONS`.

A static host cannot call Resend directly — the API key would ship to every visitor. `workers/contact/` is the relay:
a Cloudflare Worker that validates the submission and calls `POST https://api.resend.com/emails` with the key held
server-side, `reply_to` set to the enquirer, and only `https://lumost.id` / `https://www.lumost.id` allowed by CORS.

```sh
cd workers/contact
node test.mjs                 # 8 groups, no network, no secrets
npx wrangler secret put RESEND_API_KEY
# deploy from the repo root, with an explicit config: wrangler walks up and finds the
# adapter's wrangler.jsonc otherwise, silently deploying the *site* Worker instead.
cd ../.. && npx wrangler deploy --config workers/contact/wrangler.toml
```

`wrangler.toml` binds the relay to `contact.lumost.id` (`routes` + `custom_domain = true`), which works because
`lumost.id` is an active zone on the same Cloudflare account. Wrangler creates the DNS record and certificate itself.
Binding a custom domain disables `workers.dev` for that Worker, so `https://lumost-contact.<account>.workers.dev` stops
answering once this is deployed — the custom domain is the address.

Then set `PUBLIC_FORM_ENDPOINT` to `https://contact.lumost.id` (locally in `.env`, on Pages as a repository variable) and
rebuild. Never point it at `lumost.id`: the site is static, so `POST` to it is answered `405`, and the form shows its
error line. `ALLOWED_ORIGINS` stays `https://lumost.id,https://www.lumost.id` — it matches the page that sends, not the
endpoint that receives.

Resend has `alimna.id` verified (the root domain) and `hasan@alimna.id` is the only real mailbox on it, so `FROM` is
`Lumost <hasan@alimna.id>` — the display name carries the brand and `reply_to` sends answers back to the enquirer, never
to us. One consequence: notifications arrive from the same address they are delivered to, which some filters treat as
slightly unusual; create a `halo@alimna.id` alias (or verify `lumost.id`) to lose that. Note that `mail.alimna.id` is only
a CNAME to `send.forge.rmta.net`; it is a mail route, not a Resend sending domain, so `FROM` must stay on `alimna.id`
itself. Verify `lumost.id` in Resend (SPF + DKIM at the DNS provider) before switching `FROM` to an `@lumost.id` address;
the Worker answers `from_domain_not_verified` instead of a vague `send_failed` when that is the problem. Change the
destination or sender with `TO`/`FROM` in `workers/contact/wrangler.toml`.

Spam: the page has a hidden `website` field (bots fill it, the script drops those submissions before the POST) and the
Worker repeats the check for non-browser callers, plus rejects anything over the length caps and any foreign `Origin`.
That stops naive bots only — add Cloudflare Turnstile if the page starts attracting real spam.

## Deliberately not on the page

- **No prices, and competitor names only as a cost contrast.** Datadog and Grafana Cloud appear once in the hero as the expensive alternative to a cheaper per-host bill; there are no price figures and no feature comparison.
- **No FAQ and no language toggle.** The page is Indonesian only; `/en/` was removed on purpose.

## One claim that outruns the product

`src/i18n/id.ts:58` ("Akses tercatat — akses ke data pelanggan hanya lewat jalur yang tercatat: siapa, kapan, organisasi
mana") is a commitment, not a description. The audit log today records account, role and API-key mutations
(`pkg/types/types.go:147-172` in `../dinoculars`), not operator reads of traces or logs — see the `staff-data-access-audit`
item in `../dinoculars/aidlc-docs/backlog.md`. Kept on the page by owner decision; do not quote it in a contract until
that item ships.
- The ingest endpoint in the code sample is a placeholder (`<endpoint>`): the real one is shown to a user on the Setup screen.
- The compliance note (`src/i18n/id.ts:61`) promises a DPA, written incident notice ≤ 3×24 jam, data-subject requests ≤ 3×24 jam, and destruction per retention policy. Those are operating commitments, not descriptions — confirm and document them before quoting the note in a contract.

## Hosting: GitHub Pages at https://lumost.id

`.github/workflows/deploy.yml` builds on every push to `main` and publishes `dist/` with
`actions/deploy-pages`. The site is served from the domain root, so every absolute path (`/fonts/…`,
`/logo-mark.svg`) resolves as-is — no `base` is set in `astro.config.mjs`, and none should be.

**First-time setup**

1. Push the repo. On the free plan Pages only works for **public** repositories.
2. Settings → Pages → **Source: GitHub Actions** (do not pick "Deploy from a branch"; the workflow uploads its own artifact).
3. Settings → Pages → Custom domain: `lumost.id`, then tick **Enforce HTTPS** once the certificate is issued.
4. DNS at the `lumost.id` zone:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `185.199.108.153` · `185.199.109.153` · `185.199.110.153` · `185.199.111.153` |
   | AAAA | `@` | `2606:50c0:8000::153` · `2606:50c0:8001::153` · `2606:50c0:8002::153` · `2606:50c0:8003::153` |
   | CNAME | `www` | `<your-user>.github.io` |

   If the DNS provider supports ALIAS/ANAME, point `@` at `<your-user>.github.io` instead of the four A records.
5. Optional: repository variable `PUBLIC_FORM_ENDPOINT` (Settings → Secrets and variables → Actions → **Variables**)
   switches the contact form from `mailto:` to an in-page POST.

`public/CNAME` carries `lumost.id` so the same artifact also works on branch-based deploys and other static hosts.

**What Pages does not give you:** response headers (no long `Cache-Control` for `/_astro/*`), server-side redirects, or a
form endpoint. `robots.txt` and `sitemap.xml` are static files that hard-code `https://lumost.id`; they are correct as long
as the custom domain is the real one.

## Before it goes live

- `site.url` / `astro.config.mjs` `site` assume `https://lumost.id`; `public/sitemap.xml` and `robots.txt` hard-code it.
- No Open Graph image yet (`og:image`), and no analytics.
- Any static host works (`dist/`); GitHub Pages is wired up above. If it is served by nginx instead, long-cache `/_astro/*`.
