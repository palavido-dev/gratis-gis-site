# Hosted pilot form handler

A Cloudflare Worker at `forms.gratisgis.org` that takes the form on
[gratisgis.org/pilot/](https://gratisgis.org/pilot/), checks it, and
emails it through Cloudflare Email Routing. Nothing is stored.

- Spam: Cloudflare Turnstile, plus a hidden field bots fill in.
- The email comes from `pilot@gratisgis.org` with the applicant as
  Reply-To, so replying answers them.
- Without JavaScript the form still posts and the page shows the result.

## Setup (done 2026-11-28)

- Email Routing rule `pilot@gratisgis.org` forwards to the verified inbox.
- Turnstile widget "GratisGIS pilot form" for `gratisgis.org`. Its site
  key is in `src/pages/pilot.astro`; its secret is a Worker secret.
- Worker `gratisgis-pilot-form` on the custom domain
  `forms.gratisgis.org`, with secrets `TURNSTILE_SECRET` and `TO_ADDRESS`.

## Redeploying

From this folder, signed in to the Cloudflare account that holds
gratisgis.org: `npx wrangler deploy`. Secrets carry over between deploys.
The Pilot form workflow does the same from GitHub once the repository
has `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `TURNSTILE_SECRET`
and `PILOT_TO_ADDRESS` secrets and the `PILOT_FORM_DEPLOY` variable set
to `true`; until then it is skipped.

## Tests

`node --test test/*.test.js` (no install needed). The Site workflow runs
them on every pull request.
