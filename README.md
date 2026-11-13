# gratisgis.org

The website for [GratisGIS](https://github.com/palavido-dev/gratis-gis), a self-hosted, open source GIS portal. The live demo runs at [demo.gratisgis.org](https://demo.gratisgis.org).

This is a static [Astro](https://astro.build) site. It loads no third-party scripts, fonts or analytics.

## Develop

Requires Node 24 and pnpm 9.

```sh
pnpm install
pnpm dev      # local server with reload
pnpm check    # type check
pnpm build    # static output in dist/
pnpm sync:releases  # refresh src/data/releases.json from GitHub
```

## Release facts

The current version, the recent releases, the release count and the 1.0 date on the home page come from the [GitHub releases](https://github.com/palavido-dev/gratis-gis/releases) of the main repository, read at build time (`src/lib/releases.ts`). `GITHUB_TOKEN` is used when set. If the API cannot be reached, the build logs a warning and uses the committed snapshot in `src/data/releases.json`. Run `pnpm sync:releases` and commit the result to refresh it.

## Deploy

`.github/workflows/site.yml` builds every pull request. A push to `main`, a manual run and a scheduled run every 6 hours build and deploy to GitHub Pages once the repository variable `SITE_DEPLOY` is `true`. The first-time setup and the move of the demo to `demo.gratisgis.org` are in [docs/cutover.md](docs/cutover.md).

## Screenshots

`src/assets/shots/` holds screenshots of public views on the demo, taken without signing in. Retake them when the UI changes.

## License

AGPL-3.0-or-later, the same as GratisGIS.
