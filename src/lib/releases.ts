// SPDX-License-Identifier: AGPL-3.0-or-later
// Release facts for the pages, read from GitHub at build time so the
// site never shows a stale version. If the API cannot be reached the
// build uses the committed snapshot in src/data/releases.json and logs
// a warning. Refresh the snapshot with `pnpm sync:releases`.
import snapshot from '../data/releases.json';
import { deriveReleaseData, fetchReleases, type ReleaseData } from './release-data.mjs';

export type { ReleaseData, ReleaseSummary } from './release-data.mjs';

let cached: Promise<ReleaseData> | undefined;

async function load(): Promise<ReleaseData> {
  try {
    const releases = await fetchReleases({ token: process.env.GITHUB_TOKEN || undefined });
    const data = deriveReleaseData(releases);
    console.info(
      `[releases] Read from the GitHub API: v${data.currentVersion}, ${data.releaseCount} releases.`,
    );
    return data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(
      `[releases] WARNING: could not read releases from the GitHub API (${reason}). ` +
        `Using the snapshot in src/data/releases.json from ${snapshot.generatedAt} ` +
        `(v${snapshot.currentVersion}). Run "pnpm sync:releases" to refresh it.`,
    );
    return snapshot as ReleaseData;
  }
}

/** Release facts for this build. Fetched once, shared by every page. */
export function getReleaseData(): Promise<ReleaseData> {
  cached ??= load();
  return cached;
}
