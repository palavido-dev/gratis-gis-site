// SPDX-License-Identifier: AGPL-3.0-or-later
// Astro config for the project website at https://gratisgis.org.
// Static output only. GitHub Pages serves dist/ as is.
import { defineConfig } from 'astro/config';
import { execSync } from 'node:child_process';
import sitemap from '@astrojs/sitemap';

function lastCommitDate() {
  try {
    const iso = execSync('git log -1 --format=%cI', { encoding: 'utf8' }).trim();
    return iso ? new Date(iso) : undefined;
  } catch {
    return undefined;
  }
}
const lastCommit = lastCommitDate();

export default defineConfig({
  site: 'https://gratisgis.org',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // /install/index.html, so /install and /install/ both resolve on Pages.
    format: 'directory',
    // Small pages: one stylesheet inline beats an extra request.
    inlineStylesheets: 'auto',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      // Date of the last commit to this site, so crawlers see a real
      // "last changed" and not the time of the scheduled rebuild.
      ...(lastCommit ? { lastmod: lastCommit } : {}),
    }),
  ],
  // No telemetry, no dev toolbar.
  devToolbar: { enabled: false },
});
