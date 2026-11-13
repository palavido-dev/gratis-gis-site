// SPDX-License-Identifier: AGPL-3.0-or-later
// Refresh src/data/releases.json from the GitHub releases API. The
// build reads the API itself and falls back to this snapshot only when
// the API cannot be reached, so commit a fresh snapshot now and then.
//
// Usage: pnpm sync:releases   (GITHUB_TOKEN is used when set)
import { writeFile } from 'node:fs/promises';
import { deriveReleaseData, fetchReleases } from '../src/lib/release-data.mjs';

const target = new URL('../src/data/releases.json', import.meta.url);
const releases = await fetchReleases({ token: process.env.GITHUB_TOKEN || undefined });
const data = deriveReleaseData(releases);
await writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
console.log(
  `Wrote ${target.pathname}: v${data.currentVersion} (${data.currentIsoDate}), ${data.releaseCount} releases.`,
);
