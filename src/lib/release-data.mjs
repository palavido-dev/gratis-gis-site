// SPDX-License-Identifier: AGPL-3.0-or-later
// Release facts for the site, read from the GitHub releases of the main
// repository. Shared by the build (src/lib/releases.ts) and by
// scripts/sync-releases.mjs, which refreshes the committed snapshot in
// src/data/releases.json. Plain JavaScript so the script runs on Node
// without a build step.

export const RELEASES_API =
  'https://api.github.com/repos/palavido-dev/gratis-gis/releases?per_page=100';

/** Longest summary shown for a release, in characters. */
const SUMMARY_MAX = 160;
/** A first sentence shorter than this gets the next one added. */
const SUMMARY_MIN = 40;
/** Never follow more pages than this. 100 releases per page. */
const MAX_PAGES = 20;

/**
 * @typedef {object} ApiRelease
 * @property {string} tag_name
 * @property {boolean} draft
 * @property {boolean} prerelease
 * @property {string | null} published_at
 * @property {string | null} body
 */

/**
 * @typedef {object} ReleaseSummary
 * @property {string} version e.g. "1.5.0"
 * @property {string} date e.g. "Nov 13, 2026"
 * @property {string} isoDate e.g. "2026-11-13"
 * @property {string} summary one line of plain text
 */

/**
 * @typedef {object} ReleaseData
 * @property {string} currentVersion
 * @property {string} currentDate
 * @property {string} currentIsoDate
 * @property {ReleaseSummary[]} recent the three newest releases
 * @property {number} releaseCount published, non-prerelease vX.Y.Z releases
 * @property {string} firstReleaseMonth e.g. "July 2026"
 * @property {string} v1Date e.g. "October 31, 2026"
 * @property {string} v1IsoDate e.g. "2026-10-31"
 * @property {string} generatedAt ISO time the data was read from GitHub
 */

const STABLE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

/** @param {string} iso */
function isoDay(iso) {
  return iso.slice(0, 10);
}

/**
 * @param {string} iso
 * @param {Intl.DateTimeFormatOptions} options
 */
function formatDate(iso, options) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(new Date(iso));
}

/**
 * The opening of a release body as one line of plain text: headings
 * dropped, markdown stripped, the first sentence (or two, if the first
 * is very short), capped at SUMMARY_MAX characters.
 * @param {string | null} body
 */
export function summarize(body) {
  const lines = (body ?? '').replace(/\r/g, '').split('\n');
  /** @type {string[]} */
  const para = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('#')) {
      if (para.length) break;
      continue;
    }
    if (!line) {
      if (para.length) break;
      continue;
    }
    para.push(line);
  }
  const text = para
    .join(' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|__|`)/g, '')
    .replace(/(^|\s)[*_](\S[^*_]*\S|\S)[*_](?=\s|[.,;:!?]|$)/g, '$1$2')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // A sentence ends at . ! or ? followed by a space, so "1.4.3" stays whole.
  const sentences = text ? text.split(/(?<=[.!?])\s+/) : [];
  let summary = sentences[0] ?? '';
  for (let i = 1; summary.length < SUMMARY_MIN && i < sentences.length; i++) {
    summary = `${summary} ${sentences[i]}`;
  }
  if (summary.length > SUMMARY_MAX) {
    const cut = summary.slice(0, SUMMARY_MAX - 1);
    const space = cut.lastIndexOf(' ');
    summary = `${(space > 80 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '')}…`;
  }
  return summary;
}

/**
 * Derive the site's release facts from the GitHub releases list.
 * @param {ApiRelease[]} releases
 * @param {Date} [now]
 * @returns {ReleaseData}
 */
export function deriveReleaseData(releases, now = new Date()) {
  const stable = releases
    .filter((r) => !r.draft && !r.prerelease && r.published_at && STABLE_TAG.test(r.tag_name))
    .map((r) => {
      const m = /** @type {RegExpMatchArray} */ (r.tag_name.match(STABLE_TAG));
      return {
        version: r.tag_name.slice(1),
        key: [Number(m[1]), Number(m[2]), Number(m[3])],
        published: /** @type {string} */ (r.published_at),
        body: r.body,
      };
    })
    .sort((a, b) => b.key[0] - a.key[0] || b.key[1] - a.key[1] || b.key[2] - a.key[2]);

  if (stable.length === 0) throw new Error('no published vX.Y.Z releases in the API response');
  const v1 = stable.find((r) => r.version === '1.0.0');
  if (!v1) throw new Error('v1.0.0 is not in the API response');

  const oldest = stable.reduce((a, b) => (a.published <= b.published ? a : b));
  const current = stable[0];
  const short = /** @type {const} */ ({ month: 'short', day: 'numeric', year: 'numeric' });
  const long = /** @type {const} */ ({ month: 'long', day: 'numeric', year: 'numeric' });

  return {
    currentVersion: current.version,
    currentDate: formatDate(current.published, short),
    currentIsoDate: isoDay(current.published),
    recent: stable.slice(0, 3).map((r) => ({
      version: r.version,
      date: formatDate(r.published, short),
      isoDate: isoDay(r.published),
      summary: summarize(r.body),
    })),
    releaseCount: stable.length,
    firstReleaseMonth: formatDate(oldest.published, { month: 'long', year: 'numeric' }),
    v1Date: formatDate(v1.published, long),
    v1IsoDate: isoDay(v1.published),
    generatedAt: now.toISOString(),
  };
}

/**
 * Read every release from the GitHub API, following pages. Uses
 * GITHUB_TOKEN as a bearer token when it is set.
 * @param {{ token?: string, timeoutMs?: number }} [options]
 * @returns {Promise<ApiRelease[]>}
 */
export async function fetchReleases({ token, timeoutMs = 15000 } = {}) {
  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'gratis-gis-site-build',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  /** @type {ApiRelease[]} */
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? RELEASES_API : `${RELEASES_API}&page=${page}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`GitHub API returned ${res.status} for ${url}`);
    const batch = /** @type {ApiRelease[]} */ (await res.json());
    if (!Array.isArray(batch)) throw new Error(`unexpected response from ${url}`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}
