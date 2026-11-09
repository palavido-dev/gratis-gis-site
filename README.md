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
```

## Deploy

`.github/workflows/site.yml` builds every pull request. A push to `main` builds and deploys to GitHub Pages once the repository variable `SITE_DEPLOY` is `true`. The first-time setup and the move of the demo to `demo.gratisgis.org` are in [docs/cutover.md](docs/cutover.md).

## Screenshots

`src/assets/shots/` holds screenshots of public views on the demo, taken without signing in. Retake them when the UI changes.

## License

AGPL-3.0-or-later, the same as GratisGIS.
