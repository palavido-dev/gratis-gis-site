# Hosted pilot form handler

A Cloudflare Worker at `forms.gratisgis.org` that takes the form on
[gratisgis.org/pilot/](https://gratisgis.org/pilot/), checks it, and
emails it through Cloudflare Email Routing. Nothing is stored.

- Spam: Cloudflare Turnstile, plus a hidden field bots fill in.
- The email comes from `pilot@gratisgis.org` with the applicant as
  Reply-To, so replying answers them.
- Without JavaScript the form still posts and the page shows the result.

## One-time setup

1. **Email Routing** (Cloudflare dashboard, gratisgis.org, Email,
   Email Routing):
   - Add a routing rule `pilot@gratisgis.org` forwarding to your inbox,
     so people can also write to that address directly.
   - The inbox the form sends to must be listed under Destination
     addresses as verified.
2. **Turnstile** (dashboard, Turnstile, Add widget): hostname
   `gratisgis.org`, mode Managed. Note the site key and the secret key.
3. **API token** (My Profile, API Tokens, Create token, "Edit Cloudflare
   Workers" template), limited to this account and the gratisgis.org
   zone. Note your account ID from the dashboard sidebar.
4. **GitHub, gratis-gis-site repository** (Settings, Secrets and
   variables, Actions):
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
     `TURNSTILE_SECRET`, `PILOT_TO_ADDRESS` (the verified inbox).
   - Variables: `TURNSTILE_SITE_KEY` (the site key) and
     `PILOT_FORM_DEPLOY` = `true`.
5. Run the **Pilot form** workflow once (Actions, Pilot form, Run
   workflow), then the **Site** workflow so the page picks up the site
   key. The form appears on the page once both have run.

## Tests

`node --test test/*.test.js` (no install needed). The Site workflow runs
them on every pull request.
